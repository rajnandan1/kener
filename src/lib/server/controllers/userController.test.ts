import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";
import type { Cookies } from "@sveltejs/kit";

vi.mock("$lib/server/db/db", async () => {
  const { default: DbImpl } = await import("$lib/server/db/dbimpl");
  return {
    default: new DbImpl({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true }),
  };
});

vi.mock("$lib/server/cache/cache", () => ({
  getCache: async (_key: string, fetcher?: () => unknown) => (fetcher ? await fetcher() : null),
  setCache: async () => {},
  deleteCache: async () => {},
}));

import db from "$lib/server/db/db";
import { GenerateToken, GenerateTokenWithExpiry } from "./commonController";
import { GetLoggedInSession } from "./userController";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;
const ADMIN = "admin@example.com";

const withCookie = (token: string) =>
  ({ get: (name: string) => (name === "kener-user" ? token : undefined) }) as Cookies;
const signedInAs = async (token: string) => (await GetLoggedInSession(withCookie(token)))?.email ?? null;

beforeAll(async () => {
  await knex.migrate.latest({
    migrationSource: {
      getMigrations: async () => Object.keys(migrations).sort(),
      getMigrationName: (name: string) => name,
      getMigration: async (name: string) => migrations[name],
    },
  });
  await knex("users").insert([
    { email: ADMIN, name: "Admin", password_hash: "x", is_active: 1, is_verified: 1 },
    { email: "off@example.com", name: "Off", password_hash: "x", is_active: 0, is_verified: 1 },
  ]);
});

describe("GetLoggedInSession", () => {
  it("signs in with the session token issued at sign-in", async () => {
    const user = (await db.getUserByEmail(ADMIN))!;

    expect(await signedInAs(await GenerateToken(user))).toBe(ADMIN);
  });

  it("refuses the app's other tokens for the same email", async () => {
    const user = (await db.getUserByEmail(ADMIN))!;
    const others = {
      subscriber: await GenerateTokenWithExpiry(
        { subscriber_user_id: 1, subscriber_method_id: 1, email: ADMIN, type: "subscriber" },
        "1y",
      ),
      invitation: await GenerateToken({ email: ADMIN, validTill: Date.now() + 60_000 }),
      passwordReset: await GenerateToken({ email: ADMIN, generatedAt: Date.now() }),
      sessionOfAnotherUser: await GenerateToken({ ...user, id: user.id + 1000 }),
      idAsText: await GenerateToken({ ...user, id: String(user.id) }),
    };

    for (const [kind, token] of Object.entries(others)) {
      expect({ kind, signedInAs: await signedInAs(token) }).toEqual({ kind, signedInAs: null });
    }
  });

  it("refuses a turned-off user, a bad signature and no cookie", async () => {
    const off = (await db.getUserByEmail("off@example.com"))!;

    expect(await signedInAs(await GenerateToken(off))).toBeNull();
    expect(await signedInAs("not-a-jwt")).toBeNull();
    expect(await GetLoggedInSession({ get: () => undefined } as unknown as Cookies)).toBeNull();
  });
});

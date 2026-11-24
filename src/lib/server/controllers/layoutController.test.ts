import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";
import type { Cookies } from "@sveltejs/kit";

// TEST_DATABASE_URL=postgresql://… or mysql://… runs this file on that engine instead of in-memory SQLite.
// Run it on its own there (npm run test:server -- <this file>): write-parity.test.ts empties the same
// tables, so two files running in parallel on one database would overwrite each other.
vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
vi.mock("$lib/server/db/db", async () => {
  const { default: DbImpl } = await import("$lib/server/db/dbimpl");
  if (process.env.TEST_DATABASE_URL) {
    const { default: knexOb } = await import("../../../../knexfile");
    return { default: new DbImpl(knexOb) };
  }
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
import { GetLayoutServerData } from "./layoutController";
import { InsertKeyValue } from "./siteDataController";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;
const anonymous = { get: () => undefined } as unknown as Cookies;

beforeAll(async () => {
  await knex.migrate.latest({
    migrationSource: {
      getMigrations: async () => Object.keys(migrations).sort(),
      // Same names as the knex CLI records, so an already migrated test database is reused
      getMigrationName: (name: string) => name.slice("/migrations/".length),
      getMigration: async (name: string) => migrations[name],
    },
  });
});

afterAll(async () => {
  await knex.destroy();
});

async function eventListPlacementFor(settings: object) {
  await knex("site_data").where({ key: "eventDisplaySettings" }).del();
  await knex("site_data").insert({
    key: "eventDisplaySettings",
    value: JSON.stringify(settings),
    data_type: "object",
  });
  const layout = await GetLayoutServerData(anonymous, new Request("http://localhost/"));
  return layout.eventDisplaySettings.eventListPlacement;
}

describe("GetLayoutServerData eventListPlacement", () => {
  it("returns the saved placement", async () => {
    expect(await eventListPlacementFor({ showInlineEvents: true, eventListPlacement: "button" })).toBe("button");
    expect(await eventListPlacementFor({ showInlineEvents: false, eventListPlacement: "aside" })).toBe("aside");
  });

  it("derives the placement for settings saved before it existed", async () => {
    expect(await eventListPlacementFor({ showInlineEvents: true })).toBe("aside");
    expect(await eventListPlacementFor({ showInlineEvents: false })).toBe("button");
  });
});

const readBarLayout = async () => (await GetLayoutServerData(anonymous, new Request("http://localhost/"))).barLayout;

describe("GetLayoutServerData barLayout", () => {
  it("returns the layout saved through the site settings", async () => {
    await InsertKeyValue("barLayout", "SEPARATED");
    expect(await readBarLayout()).toBe("SEPARATED");
    await InsertKeyValue("barLayout", "JOINED");
    expect(await readBarLayout()).toBe("JOINED");
  });

  it("refuses to save a layout that does not exist", async () => {
    await expect(InsertKeyValue("barLayout", "ROUND")).rejects.toThrow("Invalid value");
  });

  it("uses the joined layout when nothing or an unknown value is stored", async () => {
    await knex("site_data").where({ key: "barLayout" }).del();
    expect(await readBarLayout()).toBe("JOINED");

    // A value the settings would refuse, e.g. from an older or hand-edited database
    await knex("site_data").insert({ key: "barLayout", value: "ROUND", data_type: "string" });
    expect(await readBarLayout()).toBe("JOINED");
    await knex("site_data").where({ key: "barLayout" }).del();
  });
});

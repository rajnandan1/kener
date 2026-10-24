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
import { GetLayoutServerData } from "./layoutController";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;
const anonymous = { get: () => undefined } as unknown as Cookies;

beforeAll(async () => {
  await knex.migrate.latest({
    migrationSource: {
      getMigrations: async () => Object.keys(migrations).sort(),
      getMigrationName: (name: string) => name,
      getMigration: async (name: string) => migrations[name],
    },
  });
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

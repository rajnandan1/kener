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
import { GetLayoutServerData, RemoveHiddenMonitorTexts } from "./layoutController";

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

describe("RemoveHiddenMonitorTexts", () => {
  const contentTranslations = {
    nl: { Facturation: "Facturatie", "Projet secret": "Geheim project", "Base interne": "Interne database" },
    en: { Facturation: "Invoicing", "Projet secret": "Secret project" },
  };

  it("drops the name and description of a hidden monitor", () => {
    const result = RemoveHiddenMonitorTexts(contentTranslations, [
      { name: "Facturation", description: null, is_hidden: "NO" },
      { name: "Projet secret", description: "Base interne", is_hidden: "YES" },
    ]);
    expect(result).toEqual({ nl: { Facturation: "Facturatie" }, en: { Facturation: "Invoicing" } });
  });

  it("keeps a text that a visible monitor also uses", () => {
    const result = RemoveHiddenMonitorTexts(contentTranslations, [
      { name: "Projet secret", description: null, is_hidden: "YES" },
      { name: "Facturation", description: "Projet secret", is_hidden: "NO" },
    ]);
    expect(result.nl["Projet secret"]).toBe("Geheim project");
  });
});

describe("GetLayoutServerData contentTranslations", () => {
  it("does not send a hidden monitor's text to an anonymous visitor", async () => {
    await knex("monitors").insert([
      { tag: "visible-billing", name: "Facturation", status: "ACTIVE", monitor_type: "NONE", is_hidden: "NO" },
      { tag: "hidden-project", name: "Projet secret", status: "ACTIVE", monitor_type: "NONE", is_hidden: "YES" },
    ]);
    await knex("site_data").where({ key: "i18n" }).del();
    await knex("site_data").insert({
      key: "i18n",
      value: JSON.stringify({
        defaultLocale: "fr",
        locales: [{ code: "nl", name: "Nederlands", selected: true, disabled: false }],
        contentTranslations: { nl: { Facturation: "Facturatie", "Projet secret": "Geheim project" } },
      }),
      data_type: "object",
    });

    const layout = await GetLayoutServerData(anonymous, new Request("http://localhost/"));

    expect(layout.languageSetting.contentTranslations).toEqual({ nl: { Facturation: "Facturatie" } });
    expect(JSON.stringify(layout)).not.toContain("Projet secret");
  });
});

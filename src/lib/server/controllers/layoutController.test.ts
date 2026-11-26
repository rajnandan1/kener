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
import { GetLayoutServerData, GetPublicContentTexts, KeepPublicContentTranslations } from "./layoutController";

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

describe("GetPublicContentTexts", () => {
  const sources = {
    siteData: {
      siteName: "Acme",
      nav: [{ name: "Connexion" }],
      footerHTML: "<p>Pied</p>",
      announcement: { title: "Annonce", message: "Message" },
      metaSiteTitle: "Titre du site",
    },
    pages: [
      {
        page_title: "Statut",
        page_header: " Facturation ",
        page_subheader: null,
        page_settings_json: '{"metaPageTitle":"Titre meta"}',
      },
      { page_title: "Autre", page_header: "En-tête", page_subheader: "Sous-titre", page_settings_json: "{" },
    ],
    monitors: [
      { name: "Paiements", description: "Description publique", is_hidden: "NO", status: "ACTIVE" },
      { name: "Projet secret", description: "Base interne", is_hidden: "YES", status: "ACTIVE" },
      { name: "Ancienne API", description: "Description inactive", is_hidden: "NO", status: "INACTIVE" },
    ],
  };

  it("lists the site, page and visible monitor texts", () => {
    const texts = GetPublicContentTexts({ ...sources, canSeeHiddenMonitors: false });
    for (const text of ["Acme", "Connexion", "<p>Pied</p>", "Annonce", "Message", "Titre du site", "Statut"]) {
      expect(texts.has(text)).toBe(true);
    }
    expect(texts.has("Facturation")).toBe(true);
    expect(texts.has("Titre meta")).toBe(true);
    expect(texts.has("Paiements")).toBe(true);
    expect(texts.has("Projet secret")).toBe(false);
    expect(texts.has("Base interne")).toBe(false);
    // Event pages show an inactive monitor's name, never its description
    expect(texts.has("Ancienne API")).toBe(true);
    expect(texts.has("Description inactive")).toBe(false);
  });

  it("includes hidden monitors for a visitor who can see them", () => {
    const texts = GetPublicContentTexts({ ...sources, canSeeHiddenMonitors: true });
    expect(texts.has("Projet secret")).toBe(true);
    expect(texts.has("Base interne")).toBe(true);
  });
});

describe("KeepPublicContentTranslations", () => {
  it("keeps only entries whose source text is public", () => {
    const result = KeepPublicContentTranslations(
      {
        nl: { Facturation: "Facturatie", "Ancien nom": "Oude naam", "Projet secret": "Geheim project" },
        en: { Facturation: "Invoicing" },
      },
      new Set(["Facturation"]),
    );
    expect(result).toEqual({ nl: { Facturation: "Facturatie" }, en: { Facturation: "Invoicing" } });
  });
});

describe("GetLayoutServerData contentTranslations", () => {
  it("sends an anonymous visitor only the translations of texts it can see", async () => {
    const monitor = (
      tag: string,
      name: string,
      status: string,
      is_hidden = "NO",
      description: string | null = null,
    ) => ({
      tag,
      name,
      description,
      status,
      monitor_type: "NONE",
      is_hidden,
    });
    await knex("monitors").insert([
      monitor("visible-billing", "Facturation", "ACTIVE", "NO", "Factures et relances"),
      monitor("hidden-project", "Projet secret", "ACTIVE", "YES"),
      // A hidden monitor renamed after its old name was translated
      monitor("hidden-renamed", "Nouveau nom privé", "ACTIVE", "YES"),
      monitor("inactive-draft", "Brouillon", "INACTIVE"),
      monitor("inactive-incident", "Ancienne API", "INACTIVE", "NO", "Description jamais affichée"),
      monitor("inactive-orphan-link", "Lien orphelin", "INACTIVE"),
      monitor("inactive-maintenance", "Base en maintenance", "INACTIVE"),
      monitor("inactive-no-event", "Maintenance sans événement", "INACTIVE"),
    ]);
    const [incident] = await knex("incidents")
      .insert({ title: "Panne", start_date_time: 1, status: "OPEN", state: "INVESTIGATING" })
      .returning("id");
    const [withEvent, withoutEvent] = await knex("maintenances")
      .insert([
        { title: "Mise à jour", start_date_time: 1, rrule: "FREQ=MINUTELY;COUNT=1", duration_seconds: 60 },
        { title: "Événements supprimés", start_date_time: 1, rrule: "FREQ=MINUTELY;COUNT=1", duration_seconds: 60 },
      ])
      .returning("id");
    const id = (row: number | { id: number }) => (typeof row === "object" ? row.id : row);
    await knex("incident_monitors").insert([
      { incident_id: id(incident), monitor_tag: "inactive-incident", monitor_impact: "DOWN" },
      // Incident links have no foreign key: this one points to a deleted incident
      { incident_id: 999999, monitor_tag: "inactive-orphan-link", monitor_impact: "DOWN" },
    ]);
    await knex("maintenance_monitors").insert([
      { maintenance_id: id(withEvent), monitor_tag: "inactive-maintenance" },
      { maintenance_id: id(withoutEvent), monitor_tag: "inactive-no-event" },
    ]);
    await knex("maintenances_events").insert({ maintenance_id: id(withEvent), start_date_time: 1, end_date_time: 61 });
    await knex("site_data").where({ key: "i18n" }).del();
    await knex("site_data").insert({
      key: "i18n",
      value: JSON.stringify({
        defaultLocale: "fr",
        locales: [{ code: "nl", name: "Nederlands", selected: true, disabled: false }],
        contentTranslations: {
          nl: {
            Facturation: "Facturatie",
            "Factures et relances": "Facturen en herinneringen",
            "Ancienne API": "Oude API",
            "Base en maintenance": "Database in onderhoud",
            "Projet secret": "Geheim project",
            "Ancien nom privé": "Oude privénaam",
            Brouillon: "Concept",
            "Description jamais affichée": "Nooit getoond",
            "Lien orphelin": "Verweesde koppeling",
            "Maintenance sans événement": "Onderhoud zonder gebeurtenis",
            // A monitor deleted after its name was translated
            "Monitor supprimé": "Verwijderd",
          },
        },
      }),
      data_type: "object",
    });

    const layout = await GetLayoutServerData(anonymous, new Request("http://localhost/"));

    expect(layout.languageSetting.contentTranslations).toEqual({
      nl: {
        Facturation: "Facturatie",
        "Factures et relances": "Facturen en herinneringen",
        // Inactive monitors listed on an incident page or on a maintenance that has an event
        "Ancienne API": "Oude API",
        "Base en maintenance": "Database in onderhoud",
      },
    });
    for (const privateText of [
      "Projet secret",
      "Ancien nom privé",
      "Brouillon",
      "Description jamais affichée",
      "Lien orphelin",
      "Maintenance sans événement",
      "Monitor supprimé",
    ]) {
      expect(JSON.stringify(layout)).not.toContain(privateText);
    }
  });
});

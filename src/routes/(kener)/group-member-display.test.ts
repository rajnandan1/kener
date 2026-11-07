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
import { GetLayoutServerData, type LayoutServerData } from "$lib/server/controllers/layoutController";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController";
import { load as loadMonitorPage } from "./monitors/[monitor_tag]/+page.server";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;
const members = [
  { tag: "api", weight: 0.5 },
  { tag: "db", weight: 0.5 },
];

let layout: LayoutServerData;

beforeAll(async () => {
  await knex.migrate.latest({
    migrationSource: {
      getMigrations: async () => Object.keys(migrations).sort(),
      getMigrationName: (name: string) => name,
      getMigration: async (name: string) => migrations[name],
    },
  });

  const group = (tag: string, typeData: object) => ({
    tag,
    name: tag,
    status: "ACTIVE",
    monitor_type: "GROUP",
    type_data: JSON.stringify({ monitors: members, executionDelay: 1000, latencyCalculation: "AVG", ...typeData }),
  });
  await knex("monitors").insert([
    { tag: "api", name: "api", status: "ACTIVE", monitor_type: "NONE", type_data: "{}" },
    { tag: "db", name: "db", status: "ACTIVE", monitor_type: "NONE", type_data: "{}" },
    group("inline-group", { memberDisplay: "INLINE" }),
    group("drawer-group", { memberDisplay: "DRAWER" }),
    group("legacy-group", {}),
    group("bad-value-group", { memberDisplay: "SIDEBAR" }),
  ]);
  await knex("pages").insert({ page_path: "", page_title: "Home", page_header: "Home" });
  const [{ id: pageId }] = await knex("pages").select("id");
  await knex("pages_monitors").insert(
    ["api", "inline-group", "drawer-group", "legacy-group", "bad-value-group"].map((monitor_tag, position) => ({
      page_id: pageId,
      monitor_tag,
      position,
    })),
  );

  const noSession = { get: () => undefined } as unknown as Cookies;
  layout = await GetLayoutServerData(noSession, new Request("http://localhost/"));
});

const loadMonitor = (tag: string) =>
  loadMonitorPage({ params: { monitor_tag: tag }, parent: async () => layout } as unknown as Parameters<
    typeof loadMonitorPage
  >[0]) as Promise<{ groupMemberDisplay?: string }>;

describe("group member display", () => {
  it("gives the status page each group's display and treats a missing or unknown value as DRAWER", async () => {
    const data = await GetPageDashboardData("", layout);

    expect(data!.monitorGroupMemberDisplayByTag).toEqual({
      "inline-group": "INLINE",
      "drawer-group": "DRAWER",
      "legacy-group": "DRAWER",
      "bad-value-group": "DRAWER",
    });
  });

  it("gives the monitor page the group's display", async () => {
    expect((await loadMonitor("inline-group")).groupMemberDisplay).toBe("INLINE");
    expect((await loadMonitor("legacy-group")).groupMemberDisplay).toBe("DRAWER");
  });

  it("gives the monitor page no display for a monitor that is not a group", async () => {
    expect((await loadMonitor("api")).groupMemberDisplay).toBeUndefined();
  });
});

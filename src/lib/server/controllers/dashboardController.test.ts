import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";

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
vi.mock("$lib/server/queues/subscriberQueue", () => ({ default: { push: vi.fn() } }));

import db from "$lib/server/db/db";
import { GetPageDashboardData } from "./dashboardController";
import type { LayoutServerData } from "./layoutController";
import { load as loadMonitorPage } from "../../../routes/(kener)/monitors/[monitor_tag]/+page.server";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;
const layout = {
  canSeeHiddenMonitors: false,
  isMobile: false,
  eventDisplaySettings: { showInlineEvents: false },
} as unknown as LayoutServerData;

const group = (tag: string, memberLayoutStyle?: unknown) => ({
  tag,
  name: tag,
  status: "ACTIVE",
  is_hidden: "NO",
  monitor_type: "GROUP",
  type_data: JSON.stringify({
    monitors: [
      { tag: "api", weight: 0.5 },
      { tag: "web", weight: 0.5 },
    ],
    executionDelay: 1000,
    latencyCalculation: "AVG",
    ...(memberLayoutStyle === undefined ? {} : { memberLayoutStyle }),
  }),
});

beforeAll(async () => {
  await knex.migrate.latest({
    migrationSource: {
      getMigrations: async () => Object.keys(migrations).sort(),
      getMigrationName: (name: string) => name,
      getMigration: async (name: string) => migrations[name],
    },
  });
  await knex("monitors").insert([
    { tag: "api", name: "API", status: "ACTIVE", is_hidden: "NO", monitor_type: "NONE", type_data: "{}" },
    { tag: "web", name: "Website", status: "ACTIVE", is_hidden: "NO", monitor_type: "NONE", type_data: "{}" },
    group("grid-group", "compact-grid"),
    group("old-group"),
    group("odd-group", "carousel"),
  ]);
  const [pageId] = (await knex("pages").insert({ page_path: "", page_title: "Home", page_header: "Home" }, ["id"])).map(
    (r: { id: number }) => r.id,
  );
  const tags = ["api", "web", "grid-group", "old-group", "odd-group"];
  await knex("pages_monitors").insert(
    tags.map((monitor_tag, position) => ({ page_id: pageId, monitor_tag, position })),
  );
});

describe("group member layout on the status page", () => {
  it("gives each group its own layout, and default-list to groups without a valid one", async () => {
    const data = await GetPageDashboardData("", layout);

    expect(data?.monitorGroupLayoutByTag).toEqual({
      "grid-group": "compact-grid",
      "old-group": "default-list",
      "odd-group": "default-list",
    });
    expect(data?.monitorGroupMembersByTag["grid-group"]).toEqual(["api", "web"]);
  });
});

describe("group member layout on the monitor page", () => {
  const load = (monitor_tag: string) =>
    loadMonitorPage({ params: { monitor_tag }, parent: async () => layout } as unknown as Parameters<
      typeof loadMonitorPage
    >[0]);

  it("passes the group's layout", async () => {
    await expect(load("grid-group")).resolves.toMatchObject({
      groupLayoutStyle: "compact-grid",
      extendedTags: ["api", "web"],
    });
    await expect(load("old-group")).resolves.toMatchObject({ groupLayoutStyle: "default-list" });
  });
});

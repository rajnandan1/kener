import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

const { subscriberQueue } = vi.hoisted(() => ({ subscriberQueue: { push: vi.fn() } }));
vi.mock("$lib/server/queues/subscriberQueue", () => ({ default: subscriberQueue }));

import db from "$lib/server/db/db";
import { GenerateToken } from "$lib/server/controllers/commonController";
import { GetLayoutServerData, type LayoutServerData } from "$lib/server/controllers/layoutController";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController";
import {
  CreateMaintenanceEventWithNotification,
  UpdateMaintenanceEventStatus,
  UpdateMaintenanceEventStatuses,
} from "$lib/server/controllers/maintenanceController";
import { AddIncidentComment } from "$lib/server/controllers/incidentController";
import type { SubscriptionVariableMap } from "$lib/server/notification/types";
import type { APIServerRequest } from "$lib/server/types/api-server";
import monitorBars from "$lib/server/api-server/monitor-bars/get";
import monitorBar from "$lib/server/api-server/monitor-bar/get";
import monitorLatencyChart from "$lib/server/api-server/monitor-latency-chart/get";
import monitorDayStatus from "$lib/server/api-server/monitor-day-status/post";
import monitorDayLatency from "$lib/server/api-server/monitor-day-latency/post";
import monitorDayIncidents from "$lib/server/api-server/monitor-day-incidents/post";
import monitorDayMaintenances from "$lib/server/api-server/monitor-day-maintenances/post";
import notifications from "$lib/server/api-server/notifications/get";
import { GetNowTimestampUTC } from "$lib/server/tool";
import { load as loadMonitorPage } from "./monitors/[monitor_tag]/+page.server";
import { load as loadIncidentPage } from "./incidents/[incident_id]/+page.server";
import { load as loadMaintenancePage } from "./maintenances/[maintenance_id]/+page.server";
import { seed as seedPermissions } from "../../../seeds/permissions";
import { seed as seedRoles } from "../../../seeds/roles";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;

type Viewer = "anonymous" | "signed-in without monitors.read" | "signed-in with monitors.read";
const viewers: Viewer[] = ["anonymous", "signed-in without monitors.read", "signed-in with monitors.read"];
const cookies = {} as Record<Viewer, Cookies>;
const layouts = {} as Record<Viewer, LayoutServerData>;

const sessionCookie = (token?: string) => ({ get: (name: string) => (name === "kener-user" ? token : undefined) });

let incidentId: number;
let maintenanceId: number;
let maintenanceEventId: number;

beforeAll(async () => {
  await knex.migrate.latest({
    migrationSource: {
      getMigrations: async () => Object.keys(migrations).sort(),
      getMigrationName: (name: string) => name,
      getMigration: async (name: string) => migrations[name],
    },
  });
  await seedPermissions(knex);
  await seedRoles(knex);
  await knex("roles").insert({ id: "support", role_name: "Support", status: "ACTIVE" });
  await knex("roles_permissions").insert({ roles_id: "support", permissions_id: "incidents.read", status: "ACTIVE" });

  await knex("monitors").insert([
    { tag: "api", name: "Public API", status: "ACTIVE", is_hidden: "NO", monitor_type: "NONE", type_data: "{}" },
    {
      tag: "billing-db",
      name: "Billing DB",
      status: "ACTIVE",
      is_hidden: "YES",
      monitor_type: "NONE",
      type_data: "{}",
    },
  ]);
  await knex("pages").insert({ page_path: "", page_title: "Home", page_header: "Home" });
  await knex("pages").insert({ page_path: "internal", page_title: "Internal", page_header: "Internal" });
  for (const page of await knex("pages").select("id")) {
    await knex("pages_monitors").insert([
      { page_id: page.id, monitor_tag: "api", position: 0 },
      { page_id: page.id, monitor_tag: "billing-db", position: 1 },
    ]);
  }

  [incidentId] = (await knex("incidents").insert({ title: "Billing outage", start_date_time: 1000 }, ["id"])).map(
    (r: { id: number }) => r.id,
  );
  await knex("incident_monitors").insert([
    { incident_id: incidentId, monitor_tag: "api", monitor_impact: "DOWN" },
    { incident_id: incidentId, monitor_tag: "billing-db", monitor_impact: "DOWN" },
  ]);
  [maintenanceId] = (
    await knex("maintenances").insert(
      { title: "DB upgrade", start_date_time: 1000, rrule: "FREQ=DAILY;COUNT=1", duration_seconds: 60 },
      ["id"],
    )
  ).map((r: { id: number }) => r.id);
  [maintenanceEventId] = (
    await knex("maintenances_events").insert(
      { maintenance_id: maintenanceId, start_date_time: 1000, end_date_time: 1060 },
      ["id"],
    )
  ).map((r: { id: number }) => r.id);
  await knex("maintenance_monitors").insert([
    { maintenance_id: maintenanceId, monitor_tag: "api" },
    { maintenance_id: maintenanceId, monitor_tag: "billing-db" },
  ]);

  const now = GetNowTimestampUTC();
  const [hiddenOnlyIncidentId] = (
    await knex("incidents").insert({ title: "Billing DB failover", start_date_time: now - 600, is_global: "NO" }, [
      "id",
    ])
  ).map((r: { id: number }) => r.id);
  await knex("incident_monitors").insert({
    incident_id: hiddenOnlyIncidentId,
    monitor_tag: "billing-db",
    monitor_impact: "DOWN",
  });
  const [hiddenOnlyMaintenanceId] = (
    await knex("maintenances").insert(
      {
        title: "Billing DB vacuum",
        start_date_time: now - 600,
        rrule: "FREQ=DAILY;COUNT=1",
        duration_seconds: 1200,
        is_global: "NO",
      },
      ["id"],
    )
  ).map((r: { id: number }) => r.id);
  await knex("maintenance_monitors").insert({ maintenance_id: hiddenOnlyMaintenanceId, monitor_tag: "billing-db" });
  for (const id of [maintenanceId, hiddenOnlyMaintenanceId]) {
    await knex("maintenances_events").insert([
      { maintenance_id: id, start_date_time: now - 600, end_date_time: now + 600, status: "ONGOING" },
      { maintenance_id: id, start_date_time: now + 3600, end_date_time: now + 4200, status: "SCHEDULED" },
    ]);
  }

  const roleOf: Record<Viewer, string | null> = {
    anonymous: null,
    "signed-in without monitors.read": "support",
    "signed-in with monitors.read": "member",
  };
  for (const viewer of viewers) {
    let token: string | undefined;
    const role = roleOf[viewer];
    if (role) {
      const email = `${role}@example.com`;
      const [userId] = (
        await knex("users").insert({ email, name: role, password_hash: "x", is_active: 1, is_verified: 1 }, ["id"])
      ).map((r: { id: number }) => r.id);
      await knex("users_roles").insert({ users_id: userId, roles_id: role });
      token = await GenerateToken((await db.getUserByEmail(email))!);
    }
    cookies[viewer] = sessionCookie(token) as unknown as Cookies;
    layouts[viewer] = await GetLayoutServerData(cookies[viewer], new Request("http://localhost/"));
  }
});

const apiRequest = (viewer: Viewer, query: Record<string, string>, body?: unknown): APIServerRequest => ({
  action: "",
  query: new URLSearchParams(query),
  cookies: cookies[viewer],
  headers: new Headers(),
  body,
});

const statusOf = async (call: () => Response | Promise<Response>) => {
  try {
    return (await call()).status;
  } catch (e) {
    return (e as { status: number }).status;
  }
};

const expectedShows = (viewer: Viewer) => viewer === "signed-in with monitors.read";

const mentionsHidden = (data: unknown) => /billing-db|Billing DB/.test(JSON.stringify(data));

describe("hidden monitor billing-db, by viewer", () => {
  it.each(viewers)("status page / for %s", async (viewer) => {
    const data = await GetPageDashboardData("", layouts[viewer]);
    expect(mentionsHidden(data)).toBe(expectedShows(viewer));
    expect(data!.monitorTags).toContain("api");
  });

  it.each(viewers)("status page /{page_path} for %s", async (viewer) => {
    const data = await GetPageDashboardData("internal", layouts[viewer]);
    expect(mentionsHidden(data)).toBe(expectedShows(viewer));
  });

  it.each(viewers)("monitor page /monitors/billing-db for %s", async (viewer) => {
    const event = { params: { monitor_tag: "billing-db" }, parent: async () => layouts[viewer] };
    const result = loadMonitorPage(event as unknown as Parameters<typeof loadMonitorPage>[0]);
    if (expectedShows(viewer)) {
      await expect(result).resolves.toMatchObject({ monitorTag: "billing-db", monitorName: "Billing DB" });
    } else {
      await expect(result).rejects.toMatchObject({ status: 404 });
    }
  });

  it.each(viewers)("status bars /dashboard-apis/monitor-bars for %s", async (viewer) => {
    const response = await monitorBars(apiRequest(viewer, { tags: "api,billing-db" }));
    const body = await response.json();
    expect(Object.keys(body.data).includes("billing-db")).toBe(expectedShows(viewer));
    expect(body.missingTags.includes("billing-db")).toBe(!expectedShows(viewer));
  });

  it.each(viewers)("monitor page charts and day details /dashboard-apis/monitor-* for %s", async (viewer) => {
    const statuses = [
      await statusOf(() => monitorLatencyChart(apiRequest(viewer, { tag: "billing-db", range: "1h" }))),
      await statusOf(() => monitorDayStatus(apiRequest(viewer, {}, { tag: "billing-db" }))),
      await statusOf(() => monitorDayLatency(apiRequest(viewer, {}, { tag: "billing-db" }))),
      await statusOf(() => monitorDayIncidents(apiRequest(viewer, {}, { tag: "billing-db" }))),
      await statusOf(() => monitorDayMaintenances(apiRequest(viewer, {}, { tag: "billing-db" }))),
    ];
    expect(statuses).toEqual(Array(5).fill(expectedShows(viewer) ? 200 : 404));
  });

  it.each(viewers)("incident page /incidents/{id} for %s", async (viewer) => {
    const event = { params: { incident_id: String(incidentId) }, parent: async () => layouts[viewer] };
    const data = await loadIncidentPage(event as unknown as Parameters<typeof loadIncidentPage>[0]);
    const tags = (data as { affectedMonitors: Array<{ monitor_tag: string }> }).affectedMonitors.map(
      (m) => m.monitor_tag,
    );
    expect(mentionsHidden(data)).toBe(expectedShows(viewer));
    expect(tags).toContain("api");
  });

  it.each(viewers)("maintenance page /maintenances/{id} for %s", async (viewer) => {
    const event = {
      params: { maintenance_id: String(maintenanceEventId) },
      url: new URL("http://localhost/"),
      parent: async () => layouts[viewer],
    };
    const data = await loadMaintenancePage(event as unknown as Parameters<typeof loadMaintenancePage>[0]);
    const tags = (data as { affectedMonitors: Array<{ monitor_tag: string }> }).affectedMonitors.map(
      (m) => m.monitor_tag,
    );
    expect(mentionsHidden(data)).toBe(expectedShows(viewer));
    expect(tags).toContain("api");
  });

  it.each(viewers)("inline incidents on / hide it for %s", async (viewer) => {
    const eventDisplaySettings = { ...layouts[viewer].eventDisplaySettings, showInlineEvents: true };
    const data = await GetPageDashboardData("", { ...layouts[viewer], eventDisplaySettings });
    const tags = data!.ongoingIncidents.flatMap((incident) => incident.monitors.map((m) => m.monitor_tag));
    expect(tags).toContain("api");
    expect(tags).not.toContain("billing-db");
  });

  it.each(viewers)("inline events on / leave out events that affect only it for %s", async (viewer) => {
    const eventDisplaySettings = { ...layouts[viewer].eventDisplaySettings, showInlineEvents: true };
    const data = await GetPageDashboardData("", { ...layouts[viewer], eventDisplaySettings });
    expect(data!.ongoingIncidents.map((e) => e.title)).toEqual(["Billing outage"]);
    expect(data!.ongoingMaintenances.map((e) => e.title)).toEqual(["DB upgrade"]);
    expect(data!.upcomingMaintenances.map((e) => e.title)).toEqual(["DB upgrade"]);
  });

  it.each(viewers)("notifications /dashboard-apis/notifications?tags=billing-db for %s", async (viewer) => {
    const body = await (await notifications(apiRequest(viewer, { tags: "billing-db" }))).json();
    const titles = body.notifications.map((n: { eventTitle: string }) => n.eventTitle);
    expect(titles).toContain("Billing outage");
    expect(titles).toContain("DB upgrade");
    expect(titles).not.toContain("Billing DB failover");
    expect(titles).not.toContain("Billing DB vacuum");
  });

  it.each(viewers)("embed data /dashboard-apis/monitor-bar hides it for %s", async (viewer) => {
    expect(await statusOf(() => monitorBar(apiRequest(viewer, { tag: "billing-db" })))).toBe(404);
  });
});

describe("subscriber emails", () => {
  const emails = () => subscriberQueue.push.mock.calls.map(([variables]) => variables as SubscriptionVariableMap);

  beforeAll(async () => {
    await knex("site_data").insert([
      { key: "colors", value: JSON.stringify({ UP: "#0f0", DOWN: "#f00", DEGRADED: "#ff0" }), data_type: "object" },
      {
        key: "globalMaintenanceNotificationSettings",
        value: JSON.stringify({
          event_types: { created: true, ended: true, reminder: true, started: true },
          reminder_buffer_hours: 1,
        }),
        data_type: "object",
      },
    ]);
  });

  beforeEach(() => subscriberQueue.push.mockClear());

  it("maintenance emails leave out hidden monitor billing-db", async () => {
    await CreateMaintenanceEventWithNotification(maintenanceId, 2000, 2060, "DB upgrade", null);
    expect(subscriberQueue.push).toHaveBeenCalledOnce();
    const email = JSON.stringify(emails()[0]);
    expect(email).toContain("Public API");
    expect(mentionsHidden(email)).toBe(false);
  });

  const events = [
    { title: "Global, visible and hidden", is_global: "YES", sends: true, impact: "DEGRADED" },
    { title: "Global, hidden only", is_global: "YES", sends: true, impact: "" },
    { title: "Scoped, visible and hidden", is_global: "NO", sends: true, impact: "DEGRADED" },
    { title: "Scoped, hidden only", is_global: "NO", sends: false, impact: "" },
  ].map((e) => ({
    ...e,
    monitors: e.title.endsWith("hidden only")
      ? [{ monitor_tag: "billing-db", monitor_impact: "DOWN" }]
      : [
          { monitor_tag: "api", monitor_impact: "DEGRADED" },
          { monitor_tag: "billing-db", monitor_impact: "DOWN" },
        ],
  }));

  it.each(events)("incident comment email for $title", async ({ title, is_global, monitors, sends, impact }) => {
    const [id] = (await knex("incidents").insert({ title, start_date_time: 1000, is_global }, ["id"])).map(
      (r: { id: number }) => r.id,
    );
    await knex("incident_monitors").insert(monitors.map((m) => ({ ...m, incident_id: id })));
    await AddIncidentComment(id, "Looking into it", "INVESTIGATING", 1100);
    expect(emails().map((e) => [e.title, e.incident_impact])).toEqual(sends ? [[title, impact]] : []);
    expect(mentionsHidden(emails())).toBe(false);
  });

  it.each(events)("maintenance emails on all 6 paths for $title", async ({ title, is_global, monitors, sends }) => {
    const now = GetNowTimestampUTC();
    const [id] = (
      await knex("maintenances").insert(
        { title, start_date_time: now - 1200, rrule: "FREQ=DAILY;COUNT=1", duration_seconds: 600, is_global },
        ["id"],
      )
    ).map((r: { id: number }) => r.id);
    await knex("maintenance_monitors").insert(monitors.map(({ monitor_tag }) => ({ maintenance_id: id, monitor_tag })));
    const [cancelledId] = (
      await knex("maintenances_events").insert(
        [
          { maintenance_id: id, start_date_time: now + 7200, end_date_time: now + 7800, status: "SCHEDULED" },
          { maintenance_id: id, start_date_time: now + 1800, end_date_time: now + 2400, status: "SCHEDULED" },
          { maintenance_id: id, start_date_time: now - 600, end_date_time: now + 600, status: "SCHEDULED" },
          { maintenance_id: id, start_date_time: now - 600, end_date_time: now + 600, status: "READY" },
          { maintenance_id: id, start_date_time: now - 1200, end_date_time: now - 600, status: "ONGOING" },
        ],
        ["id"],
      )
    ).map((r: { id: number }) => r.id);

    await CreateMaintenanceEventWithNotification(id, now + 9000, now + 9600, title, null);
    await UpdateMaintenanceEventStatus(cancelledId, "CANCELLED");
    await UpdateMaintenanceEventStatuses();

    const sent = emails().filter((e) => e.title.endsWith(`: ${title}`));
    expect(sent.map((e) => e.update_id.replace(/^maintenance_\d+_/, "")).sort()).toEqual(
      sends ? ["cancelled", "completed", "created", "ongoing", "ongoing", "starting_soon"] : [],
    );
    expect(mentionsHidden(sent)).toBe(false);
  });
});

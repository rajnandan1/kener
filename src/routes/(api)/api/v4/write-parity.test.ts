import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { Knex } from "knex";
import type { Cookies, RequestEvent } from "@sveltejs/kit";

// TEST_DATABASE_URL=postgresql://… or mysql://… runs this file on that engine instead of in-memory SQLite.
vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
vi.mock("$lib/server/db/db", async () => {
  const { default: DbImpl } = await import("$lib/server/db/dbimpl");
  if (process.env.TEST_DATABASE_URL) {
    const { default: knexOb } = await import("../../../../../knexfile");
    return { default: new DbImpl(knexOb) };
  }
  return {
    default: new DbImpl({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true }),
  };
});

const { subscriberQueue, alertingQueue, setCache, ClearOidcConfigCache } = vi.hoisted(() => ({
  subscriberQueue: { push: vi.fn() },
  alertingQueue: { push: vi.fn() },
  setCache: vi.fn(async (_key: string) => {}),
  ClearOidcConfigCache: vi.fn(),
}));
vi.mock("$lib/server/cache/cache", () => ({
  getCache: async (_key: string, fetcher?: () => unknown) => (fetcher ? await fetcher() : null),
  setCache,
  deleteCache: async () => {},
}));
vi.mock("$lib/server/queues/subscriberQueue", () => ({ default: subscriberQueue }));
vi.mock("$lib/server/queues/alertingQueue", () => ({ default: alertingQueue }));
vi.mock("$lib/server/controllers/oidcController", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ClearOidcConfigCache,
}));

import db from "$lib/server/db/db";
import GC from "$lib/global-constants";
import { GenerateToken } from "$lib/server/controllers/commonController";
import { GetMonitorsParsed } from "$lib/server/controllers/monitorsController";
import { GetNowTimestampUTC, GetMinuteStartNowTimestampUTC } from "$lib/server/tool";
import { seed as seedPermissions } from "../../../../../seeds/permissions";
import { seed as seedRoles } from "../../../../../seeds/roles";
import { seed as seedSiteData } from "../../../../../seeds/site_data";
import sharp from "sharp";
import * as manageApi from "../../../(manage)/manage/api/+server";
import * as images from "./images/+server";
import * as incidents from "./incidents/+server";
import * as incident from "./incidents/[incident_id]/+server";
import * as comments from "./incidents/[incident_id]/comments/+server";
import * as comment from "./incidents/[incident_id]/comments/[comment_id]/+server";
import * as maintenances from "./maintenances/+server";
import * as maintenance from "./maintenances/[maintenance_id]/+server";
import * as maintenanceEvent from "./maintenances/[maintenance_id]/events/[event_id]/+server";
import * as monitors from "./monitors/+server";
import * as monitor from "./monitors/[monitor_tag]/+server";
import * as monitorData from "./monitors/[monitor_tag]/data/+server";
import * as monitorDataPoint from "./monitors/[monitor_tag]/data/[timestamp]/+server";
import * as pages from "./pages/+server";
import * as page from "./pages/[page_path]/+server";
import * as siteKey from "./site/[config_key]/+server";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;
const SEEDED_ONCE = new Set(["knex_migrations", "knex_migrations_lock", "permissions", "roles", "roles_permissions"]);
const ADMIN_EMAIL = "admin@example.com";
let adminCookies: Cookies;

// Each exit the write can leave through, as row counts per table and per status column.
const COUNTED: Record<string, string | null> = {
  incidents: "state",
  incident_comments: "status",
  incident_monitors: "monitor_impact",
  maintenances: "status",
  maintenances_events: "status",
  maintenance_monitors: "monitor_impact",
  pages: null,
  pages_monitors: null,
  monitors: "status",
  monitoring_data: "status",
  site_data: null,
  images: null,
};

// Columns that differ between two runs of one write: the timestamps, and the surface that made the write.
const UNCOMPARED = new Set(["created_at", "updated_at", "incident_source"]);
const comparable = (value: unknown): unknown =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter(([key]) => !UNCOMPARED.has(key)))
    : value;
const byContent = (a: unknown, b: unknown): number => JSON.stringify(a).localeCompare(JSON.stringify(b));

async function signals(): Promise<Record<string, unknown>> {
  const lastStatusWrites = setCache.mock.calls.filter(([key]) => key.endsWith(":last_status"));
  const out: Record<string, unknown> = {
    "subscriber emails queued": subscriberQueue.push.mock.calls.length,
    "alert evaluations queued": alertingQueue.push.mock.calls.length,
    "last-status cache writes": lastStatusWrites.length,
    "OIDC config cache clears": ClearOidcConfigCache.mock.calls.length,
    "subscriber email arguments": subscriberQueue.push.mock.calls.map((args) => args.map(comparable)),
    "alert evaluation arguments": alertingQueue.push.mock.calls,
    "last-status cache values": lastStatusWrites.map((args) => args.map(comparable)),
  };
  const now = GetNowTimestampUTC();
  out["incidents shown as ongoing"] = (
    await knex("incidents").whereNull("end_date_time").orWhere("end_date_time", ">=", now)
  ).length;
  for (const [table, column] of Object.entries(COUNTED)) {
    const rows: Record<string, unknown>[] = await knex(table).select("*");
    out[`${table} rows`] = rows.length;
    out[`${table} content`] = rows.map(comparable).sort(byContent);
    if (!column) continue;
    for (const row of rows) {
      const key = `${table} ${column}=${row[column]}`;
      out[key] = ((out[key] as number | undefined) ?? 0) + 1;
    }
  }
  return out;
}

const client = knex.client.config.client as string;

const insert = async (table: string, row: Record<string, unknown>): Promise<number> => {
  const [result]: (number | { id: number })[] =
    client === "mysql2" ? await knex(table).insert(row) : await knex(table).insert(row, ["id"]);
  return typeof result === "object" ? result.id : result;
};

async function clearTables(): Promise<void> {
  if (client === "pg") {
    const { rows }: { rows: { tablename: string }[] } = await knex.raw(
      "select tablename from pg_tables where schemaname = current_schema()",
    );
    const names = rows.map((r) => r.tablename).filter((name) => !SEEDED_ONCE.has(name));
    await knex.raw(`truncate table ${names.map(() => "??").join(", ")} restart identity cascade`, names);
  } else if (client === "mysql2") {
    const [rows] = (await knex.raw("show tables")) as [Record<string, string>[]];
    const names = rows.map((r) => Object.values(r)[0]).filter((name) => !SEEDED_ONCE.has(name));
    await knex.transaction(async (trx) => {
      await trx.raw("set foreign_key_checks = 0");
      for (const name of names) await trx.raw("truncate table ??", [name]);
      await trx.raw("set foreign_key_checks = 1");
    });
  } else {
    const tables: { name: string }[] = await knex.raw(
      "select name from sqlite_master where type = 'table' and name not like 'sqlite_%'",
    );
    for (const { name } of tables) if (!SEEDED_ONCE.has(name)) await knex(name).del();
    await knex("sqlite_sequence")
      .whereNotIn("name", [...SEEDED_ONCE])
      .del();
  }
}

const T0 = GetMinuteStartNowTimestampUTC() - 3600;
const FUTURE = GetMinuteStartNowTimestampUTC() + 2 * 86400;

async function seed() {
  await clearTables();
  vi.clearAllMocks();
  await seedSiteData(knex);

  const adminId = await insert("users", {
    email: ADMIN_EMAIL,
    name: "Admin",
    password_hash: "x",
    is_active: 1,
    is_verified: 1,
  });
  await knex("users_roles").insert({ users_id: adminId, roles_id: "admin" });

  const monitorRow = {
    status: "ACTIVE",
    is_hidden: "NO",
    monitor_type: "NONE",
    type_data: "{}",
    cron: "* * * * *",
    monitor_settings_json: JSON.stringify({
      uptime_formula_numerator: GC.defaultNumeratorStr,
      uptime_formula_denominator: GC.defaultDenominatorStr,
    }),
  };
  await knex("monitors").insert([
    { tag: "api", name: "Public API", ...monitorRow },
    { tag: "web", name: "Website", ...monitorRow },
  ]);

  const incidentRow = { status: "OPEN", incident_type: "INCIDENT", is_global: "YES", start_date_time: T0 };
  const openIncident = await insert("incidents", { title: "Checkout down", state: "INVESTIGATING", ...incidentRow });
  const resolvedIncident = await insert("incidents", {
    title: "Login errors",
    state: "RESOLVED",
    end_date_time: T0 + 600,
    ...incidentRow,
  });
  const legacyIncident = await insert("incidents", {
    title: "Old maintenance",
    state: "INVESTIGATING",
    ...incidentRow,
    incident_type: "MAINTENANCE",
  });
  await knex("incident_monitors").insert([
    { incident_id: openIncident, monitor_tag: "api", monitor_impact: "DOWN" },
    { incident_id: openIncident, monitor_tag: "web", monitor_impact: "DEGRADED" },
    { incident_id: resolvedIncident, monitor_tag: "api", monitor_impact: "DOWN" },
  ]);
  const commentRow = { status: "ACTIVE", created_at: knex.fn.now(), updated_at: knex.fn.now() };
  const openComment = await insert("incident_comments", {
    incident_id: openIncident,
    comment: "Looking into it",
    state: "INVESTIGATING",
    commented_at: T0,
    ...commentRow,
  });
  await insert("incident_comments", {
    incident_id: resolvedIncident,
    comment: "Fixed",
    state: "RESOLVED",
    commented_at: T0 + 600,
    ...commentRow,
  });

  const maintenanceRow = {
    start_date_time: FUTURE,
    rrule: "FREQ=MINUTELY;COUNT=1",
    duration_seconds: 3600,
    status: "ACTIVE",
    is_global: "YES",
  };
  const scheduledMaintenance = await insert("maintenances", { title: "DB upgrade", ...maintenanceRow });
  const cancelledMaintenance = await insert("maintenances", { title: "Cache flush", ...maintenanceRow });
  const scheduledEvent = await insert("maintenances_events", {
    maintenance_id: scheduledMaintenance,
    start_date_time: FUTURE,
    end_date_time: FUTURE + 3600,
    status: "SCHEDULED",
  });
  await insert("maintenances_events", {
    maintenance_id: cancelledMaintenance,
    start_date_time: FUTURE,
    end_date_time: FUTURE + 3600,
    status: "CANCELLED",
  });
  await knex("maintenance_monitors").insert([
    { maintenance_id: scheduledMaintenance, monitor_tag: "api", monitor_impact: "MAINTENANCE" },
    { maintenance_id: cancelledMaintenance, monitor_tag: "api", monitor_impact: "MAINTENANCE" },
  ]);

  await insert("pages", { page_path: "", page_title: "Home", page_header: "Home" });
  const statusPage = await insert("pages", { page_path: "status", page_title: "Status", page_header: "Status" });
  await knex("pages_monitors").insert([
    { page_id: statusPage, monitor_tag: "api", position: 0 },
    { page_id: statusPage, monitor_tag: "web", position: 1 },
  ]);

  return {
    openIncident,
    resolvedIncident,
    legacyIncident,
    openComment,
    scheduledMaintenance,
    cancelledMaintenance,
    scheduledEvent,
    statusPage,
  };
}
type Fixture = Awaited<ReturnType<typeof seed>>;

type Handler = (event: RequestEvent) => Response | Promise<Response>;
const send = async (
  handler: Handler,
  body: unknown,
  locals: Partial<App.Locals> = {},
  params: Record<string, string> = {},
): Promise<Response> =>
  handler({
    request: new Request("http://localhost/api/v4", { method: "POST", body: JSON.stringify(body ?? null) }),
    locals,
    params,
  } as unknown as RequestEvent);

async function v4(...args: Parameters<typeof send>): Promise<void> {
  const response = await send(...args);
  expect(response.status, JSON.stringify(await response.clone().json())).toBeLessThan(300);
}

async function dashboard(action: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await manageApi.POST({
    request: new Request("http://localhost/manage/api", { method: "POST", body: JSON.stringify({ action, data }) }),
    cookies: adminCookies,
  } as never);
  const body = await response.json();
  expect(response.status, `${action}: ${JSON.stringify(body)}`).toBe(200);
  return body;
}

const incidentLocals = async (id: number) => ({ incident: await db.getIncidentById(id) });
const maintenanceLocals = async (id: number) => ({ maintenance: await db.getMaintenanceById(id) });
const monitorLocals = async (tag: string) => ({ monitor: (await GetMonitorsParsed({ tag }))[0] });
const pageLocals = async (path: string) => ({ page: await db.getPageByPath(path) });
const monitorRow = async (tag: string) => (await knex("monitors").where({ tag }).first()) as Record<string, unknown>;
const oidcSettings = { enabled: false, issuer_url: "https://id.example.com", client_id: "kener", client_secret: "s" };
const logo = (
  await sharp({ create: { width: 300, height: 200, channels: 3, background: { r: 30, g: 120, b: 200 } } })
    .png()
    .toBuffer()
).toString("base64");

interface Pair {
  name: string;
  api: (f: Fixture) => Promise<void>;
  dashboard: (f: Fixture) => Promise<unknown>;
}

const pairs: Pair[] = [
  {
    name: "POST /incidents = createIncident + addMonitor",
    api: () =>
      v4(incidents.POST, {
        title: "Search down",
        start_date_time: T0,
        monitors: [{ monitor_tag: "api", impact: "DEGRADED" }],
      }),
    dashboard: async () => {
      const { incident_id } = await dashboard("createIncident", {
        title: "Search down",
        start_date_time: T0,
        end_date_time: null,
        status: "OPEN",
        state: "INVESTIGATING",
        incident_type: "INCIDENT",
        is_global: "YES",
      });
      await dashboard("addMonitor", { incident_id, monitor_tag: "api", monitor_impact: "DEGRADED" });
    },
  },
  {
    name: "PATCH /incidents/{id} = updateIncident + addMonitor + removeMonitor",
    api: async (f) =>
      v4(
        incident.PATCH,
        { title: "Checkout slow", monitors: [{ monitor_tag: "api", impact: "DEGRADED" }] },
        await incidentLocals(f.openIncident),
      ),
    dashboard: async (f) => {
      await dashboard("updateIncident", {
        id: f.openIncident,
        title: "Checkout slow",
        start_date_time: T0,
        end_date_time: null,
        status: "OPEN",
        is_global: "YES",
      });
      await dashboard("addMonitor", { incident_id: f.openIncident, monitor_tag: "api", monitor_impact: "DEGRADED" });
      await dashboard("removeMonitor", { incident_id: f.openIncident, monitor_tag: "web" });
    },
  },
  {
    name: "DELETE /incidents/{id} = deleteIncident",
    api: async (f) => v4(incident.DELETE, undefined, await incidentLocals(f.openIncident)),
    dashboard: (f) => dashboard("deleteIncident", { incident_id: f.openIncident }),
  },
  {
    name: "POST /incidents/{id}/comments reopening a RESOLVED incident = addComment",
    api: async (f) =>
      v4(
        comments.POST,
        { comment: "It is back", state: "INVESTIGATING", timestamp: T0 + 1200 },
        await incidentLocals(f.resolvedIncident),
      ),
    dashboard: (f) =>
      dashboard("addComment", {
        incident_id: f.resolvedIncident,
        comment: "It is back",
        state: "INVESTIGATING",
        commented_at: T0 + 1200,
      }),
  },
  {
    name: "POST /incidents/{id}/comments resolving an open incident = addComment",
    api: async (f) =>
      v4(
        comments.POST,
        { comment: "Fixed", state: "RESOLVED", timestamp: T0 + 900 },
        await incidentLocals(f.openIncident),
      ),
    dashboard: (f) =>
      dashboard("addComment", {
        incident_id: f.openIncident,
        comment: "Fixed",
        state: "RESOLVED",
        commented_at: T0 + 900,
      }),
  },
  {
    name: "POST /incidents/{id}/comments on a legacy MAINTENANCE row = addComment",
    api: async (f) =>
      v4(
        comments.POST,
        { comment: "Found it", state: "IDENTIFIED", timestamp: T0 + 900 },
        await incidentLocals(f.legacyIncident),
      ),
    dashboard: (f) =>
      dashboard("addComment", {
        incident_id: f.legacyIncident,
        comment: "Found it",
        state: "IDENTIFIED",
        commented_at: T0 + 900,
      }),
  },
  {
    name: "PATCH /incidents/{id}/comments/{comment_id} = updateComment",
    api: async (f) =>
      v4(comment.PATCH, { state: "RESOLVED", timestamp: T0 + 900 }, await incidentLocals(f.openIncident), {
        comment_id: String(f.openComment),
      }),
    dashboard: (f) =>
      dashboard("updateComment", {
        incident_id: f.openIncident,
        comment_id: f.openComment,
        comment: "Looking into it",
        state: "RESOLVED",
        commented_at: T0 + 900,
      }),
  },
  {
    name: "DELETE /incidents/{id}/comments/{comment_id} = deleteComment",
    api: async (f) =>
      v4(comment.DELETE, undefined, await incidentLocals(f.openIncident), { comment_id: String(f.openComment) }),
    dashboard: (f) => dashboard("deleteComment", { incident_id: f.openIncident, comment_id: f.openComment }),
  },
  {
    name: "POST /maintenances = createMaintenance",
    api: () =>
      v4(maintenances.POST, {
        title: "Network work",
        start_date_time: FUTURE,
        rrule: "FREQ=MINUTELY;COUNT=1",
        duration_seconds: 3600,
        monitors: [{ monitor_tag: "web", impact: "DOWN" }],
      }),
    dashboard: () =>
      dashboard("createMaintenance", {
        title: "Network work",
        description: null,
        start_date_time: FUTURE,
        rrule: "FREQ=MINUTELY;COUNT=1",
        duration_seconds: 3600,
        monitors: [{ monitor_tag: "web", monitor_impact: "DOWN" }],
        is_global: "YES",
      }),
  },
  {
    name: "POST /maintenances with a timezone = createMaintenance",
    api: () =>
      v4(maintenances.POST, {
        title: "Patch night",
        start_date_time: FUTURE,
        rrule: "FREQ=WEEKLY;BYDAY=MO",
        timezone: "America/New_York",
        duration_seconds: 3600,
      }),
    dashboard: () =>
      dashboard("createMaintenance", {
        title: "Patch night",
        description: null,
        start_date_time: FUTURE,
        rrule: "FREQ=WEEKLY;BYDAY=MO",
        timezone: "America/New_York",
        duration_seconds: 3600,
        monitors: [],
        is_global: "YES",
      }),
  },
  {
    name: "PATCH /maintenances/{id} setting a timezone = updateMaintenance",
    api: async (f) =>
      v4(
        maintenance.PATCH,
        { rrule: "FREQ=WEEKLY;BYDAY=MO", timezone: "Asia/Kolkata" },
        await maintenanceLocals(f.scheduledMaintenance),
      ),
    dashboard: (f) =>
      dashboard("updateMaintenance", {
        id: f.scheduledMaintenance,
        rrule: "FREQ=WEEKLY;BYDAY=MO",
        timezone: "Asia/Kolkata",
      }),
  },
  ...(["scheduledMaintenance", "cancelledMaintenance"] as const).map(
    (which): Pair => ({
      name: `PATCH /maintenances/{id} moving a one-time ${which.replace("Maintenance", "")} event = updateMaintenance`,
      api: async (f) =>
        v4(
          maintenance.PATCH,
          { start_date_time: FUTURE + 86400, monitors: [{ monitor_tag: "api", impact: "MAINTENANCE" }] },
          await maintenanceLocals(f[which]),
        ),
      dashboard: (f) =>
        dashboard("updateMaintenance", {
          id: f[which],
          title: which === "scheduledMaintenance" ? "DB upgrade" : "Cache flush",
          description: null,
          start_date_time: FUTURE + 86400,
          rrule: "FREQ=MINUTELY;COUNT=1",
          duration_seconds: 3600,
          status: "ACTIVE",
          monitors: [{ monitor_tag: "api", monitor_impact: "MAINTENANCE" }],
          is_global: "YES",
        }),
    }),
  ),
  {
    name: "DELETE /maintenances/{id} = deleteMaintenance",
    api: async (f) => v4(maintenance.DELETE, undefined, await maintenanceLocals(f.scheduledMaintenance)),
    dashboard: (f) => dashboard("deleteMaintenance", { id: f.scheduledMaintenance }),
  },
  {
    name: "PATCH /maintenances/{id}/events/{event_id} window = updateMaintenanceEvent",
    api: async (f) =>
      v4(
        maintenanceEvent.PATCH,
        { start_date_time: FUTURE + 600, end_date_time: FUTURE + 4200 },
        await maintenanceLocals(f.scheduledMaintenance),
        { event_id: String(f.scheduledEvent) },
      ),
    dashboard: (f) =>
      dashboard("updateMaintenanceEvent", {
        id: f.scheduledEvent,
        start_date_time: FUTURE + 600,
        end_date_time: FUTURE + 4200,
      }),
  },
  {
    name: "PATCH /maintenances/{id}/events/{event_id} status = updateMaintenanceEventStatus",
    api: async (f) =>
      v4(maintenanceEvent.PATCH, { status: "CANCELLED" }, await maintenanceLocals(f.scheduledMaintenance), {
        event_id: String(f.scheduledEvent),
      }),
    dashboard: (f) => dashboard("updateMaintenanceEventStatus", { id: f.scheduledEvent, status: "CANCELLED" }),
  },
  {
    name: "DELETE /maintenances/{id}/events/{event_id} = deleteMaintenanceEvent",
    api: async (f) =>
      v4(maintenanceEvent.DELETE, undefined, await maintenanceLocals(f.scheduledMaintenance), {
        event_id: String(f.scheduledEvent),
      }),
    dashboard: (f) => dashboard("deleteMaintenanceEvent", { id: f.scheduledEvent }),
  },
  {
    name: "POST /monitors = storeMonitorData",
    api: () => v4(monitors.POST, { tag: "db", name: "Database", monitor_type: "NONE", cron: "* * * * *" }),
    dashboard: () =>
      dashboard("storeMonitorData", {
        tag: "db",
        name: "Database",
        description: null,
        image: null,
        cron: "* * * * *",
        default_status: "UP",
        status: "ACTIVE",
        category_name: null,
        monitor_type: "NONE",
        type_data: null,
        include_degraded_in_downtime: "NO",
        is_hidden: "NO",
        confirmation_threshold: 1,
        monitor_settings_json: null,
        external_url: null,
      }),
  },
  {
    name: "PATCH /monitors/{tag} = storeMonitorData",
    api: async () => v4(monitor.PATCH, { name: "API", status: "INACTIVE" }, await monitorLocals("api")),
    dashboard: async () =>
      dashboard("storeMonitorData", { ...(await monitorRow("api")), name: "API", status: "INACTIVE" }),
  },
  {
    name: "DELETE /monitors/{tag} = deleteMonitor",
    api: async () => v4(monitor.DELETE, undefined, await monitorLocals("web")),
    dashboard: () => dashboard("deleteMonitor", { tag: "web" }),
  },
  {
    name: "PATCH /monitors/{tag}/data = updateMonitoringData",
    api: async () =>
      v4(
        monitorData.PATCH,
        { start_ts: T0, end_ts: T0 + 180, status: "DOWN", latency: 100 },
        await monitorLocals("api"),
      ),
    dashboard: () =>
      dashboard("updateMonitoringData", {
        monitor_tag: "api",
        start: T0,
        end: T0 + 180,
        newStatus: "DOWN",
        latency: 100,
        deviation: 0,
      }),
  },
  {
    name: "PATCH /monitors/{tag}/data/{timestamp} = updateMonitoringData",
    api: async () =>
      v4(monitorDataPoint.PATCH, { status: "DOWN", latency: 100 }, await monitorLocals("api"), {
        timestamp: String(T0),
      }),
    dashboard: () =>
      dashboard("updateMonitoringData", {
        monitor_tag: "api",
        start: T0,
        end: T0,
        newStatus: "DOWN",
        latency: 100,
        deviation: 0,
      }),
  },
  {
    name: "POST /pages = createPage + addMonitorToPage",
    api: () => v4(pages.POST, { page_path: "eu", page_title: "EU", page_header: "EU", monitors: ["api", "web"] }),
    dashboard: async () => {
      const { id } = await dashboard("createPage", {
        page_path: "eu",
        page_title: "EU",
        page_header: "EU",
        page_subheader: null,
        page_logo: null,
      });
      await dashboard("addMonitorToPage", { page_id: id, monitor_tag: "api" });
      await dashboard("addMonitorToPage", { page_id: id, monitor_tag: "web" });
    },
  },
  {
    name: "PATCH /pages/{page_path} = updatePage + removeMonitorFromPage",
    api: async () => v4(page.PATCH, { page_title: "Status 2", monitors: ["web"] }, await pageLocals("status")),
    dashboard: async (f) => {
      await dashboard("updatePage", {
        id: f.statusPage,
        page_path: "status",
        page_title: "Status 2",
        page_header: "Status",
        page_subheader: null,
        page_logo: null,
      });
      await dashboard("removeMonitorFromPage", { page_id: f.statusPage, monitor_tag: "api" });
      await dashboard("reorderPageMonitors", { page_id: f.statusPage, monitor_tags: ["web"] });
    },
  },
  {
    name: "DELETE /pages/{page_path} = deletePage",
    api: async () => v4(page.DELETE, undefined, await pageLocals("status")),
    dashboard: (f) => dashboard("deletePage", { id: f.statusPage }),
  },
  {
    name: "PATCH /site/siteName = storeSiteData",
    api: () => v4(siteKey.PATCH, { value: "Acme Status" }, {}, { config_key: "siteName" }),
    dashboard: () => dashboard("storeSiteData", { siteName: "Acme Status" }),
  },
  {
    name: "PATCH /site/oidcSettings = storeSiteData",
    api: () => v4(siteKey.PATCH, { value: oidcSettings }, {}, { config_key: "oidcSettings" }),
    dashboard: () => dashboard("storeSiteData", { oidcSettings: JSON.stringify(oidcSettings) }),
  },
  {
    name: "POST /images = uploadImage",
    api: () =>
      v4(images.POST, {
        base64: logo,
        mime_type: "image/png",
        file_name: "logo.png",
        max_width: 256,
        max_height: 256,
      }),
    dashboard: () =>
      dashboard("uploadImage", {
        base64: logo,
        mimeType: "image/png",
        fileName: "logo.png",
        maxWidth: 256,
        maxHeight: 256,
      }),
  },
];

beforeAll(async () => {
  await knex.migrate.latest({
    migrationSource: {
      getMigrations: async () => Object.keys(migrations).sort(),
      getMigrationName: (name: string) => name.slice("/migrations/".length),
      getMigration: async (name: string) => migrations[name],
    },
  });
  await seedPermissions(knex);
  await seedRoles(knex);
  await seed();
  const token = await GenerateToken((await db.getUserByEmail(ADMIN_EMAIL))!);
  adminCookies = { get: (name: string) => (name === "kener-user" ? token : undefined) } as unknown as Cookies;
});

afterAll(async () => {
  await knex.destroy();
});

describe("a v4 write leaves through the same exits as the same dashboard write", () => {
  it.each(pairs)("$name", async (pair) => {
    await pair.api(await seed());
    const api = await signals();
    await pair.dashboard(await seed());
    const dashboard = await signals();
    expect(api).toEqual(dashboard);
  });
});

describe("v4 writes the dashboard cannot make keep working through the dashboard controllers", () => {
  it("POST /incidents keeps an end time sent on create", async () => {
    await seed();
    const response = await send(incidents.POST, { title: "Past outage", start_date_time: T0, end_date_time: T0 + 600 });

    expect(response.status).toBe(201);
    expect((await response.json()).incident.end_date_time).toBe(T0 + 600);
  });

  it("POST /incidents returns 400 for a monitor impact the dashboard cannot set, and saves nothing", async () => {
    await seed();
    const before = await signals();
    const response = await send(incidents.POST, {
      title: "Search down",
      start_date_time: T0,
      monitors: [{ monitor_tag: "api", impact: "UP" }],
    });

    expect(response.status).toBe(400);
    expect(await signals()).toEqual(before);
  });

  it("PATCH /incidents/{id} with end_date_time null reopens a resolved incident", async () => {
    const f = await seed();
    const response = await send(incident.PATCH, { end_date_time: null }, await incidentLocals(f.resolvedIncident));

    expect(response.status).toBe(200);
    expect((await response.json()).incident.end_date_time).toBeNull();
  });

  it("PATCH /incidents/{id} accepts an end time that is after a new, earlier start", async () => {
    const f = await seed();
    const response = await send(
      incident.PATCH,
      { start_date_time: T0 - 1200, end_date_time: T0 - 600 },
      await incidentLocals(f.openIncident),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).incident).toMatchObject({ start_date_time: T0 - 1200, end_date_time: T0 - 600 });
  });

  it("PATCH /incidents/{id} returns 400 for an end time before the start, and saves nothing", async () => {
    const f = await seed();
    const before = await signals();
    const response = await send(incident.PATCH, { end_date_time: T0 - 600 }, await incidentLocals(f.openIncident));

    expect(response.status).toBe(400);
    expect(await signals()).toEqual(before);
  });

  it("PATCH …/comments/{comment_id} returns 400 for a RESOLVED comment dated before the incident start, and saves nothing", async () => {
    const f = await seed();
    const before = await signals();
    const response = await send(
      comment.PATCH,
      { state: "RESOLVED", timestamp: T0 - 600 },
      await incidentLocals(f.openIncident),
      { comment_id: String(f.openComment) },
    );

    expect(response.status).toBe(400);
    expect(await signals()).toEqual(before);
    expect(await knex("incident_comments").where({ id: f.openComment }).first()).toMatchObject({
      state: "INVESTIGATING",
      commented_at: T0,
    });
  });

  it("GET …/comments/{comment_id} returns 404 for a comment deleted through the API or the dashboard", async () => {
    for (const remove of [
      async (f: Fixture) =>
        v4(comment.DELETE, undefined, await incidentLocals(f.openIncident), { comment_id: String(f.openComment) }),
      (f: Fixture) => dashboard("deleteComment", { incident_id: f.openIncident, comment_id: f.openComment }),
    ]) {
      const f = await seed();
      await remove(f);
      const response = await send(comment.GET, undefined, await incidentLocals(f.openIncident), {
        comment_id: String(f.openComment),
      });

      expect(response.status).toBe(404);
    }
  });

  it.each(["Mars/Olympus_Mons", "+05:30"])("POST and PATCH /maintenances return 400 for timezone %s", async (zone) => {
    const f = await seed();
    const before = await signals();
    const created = await send(maintenances.POST, {
      title: "Bad zone",
      start_date_time: FUTURE,
      rrule: "FREQ=DAILY",
      duration_seconds: 60,
      timezone: zone,
    });
    const updated = await send(maintenance.PATCH, { timezone: zone }, await maintenanceLocals(f.scheduledMaintenance));

    for (const response of [created, updated]) {
      expect(response.status).toBe(400);
      expect((await response.json()).error).toEqual({
        code: "BAD_REQUEST",
        message: "timezone must be a known IANA time zone, such as America/New_York",
      });
    }
    expect(await signals()).toEqual(before);
  });

  it("returns the timezone from POST, GET and PATCH /maintenances, and null when it is cleared", async () => {
    const f = await seed();
    const body = { title: "Patch", start_date_time: FUTURE, rrule: "FREQ=DAILY", duration_seconds: 60 };
    const created = await send(maintenances.POST, { ...body, timezone: "Asia/Kolkata" });
    const plain = await send(maintenances.POST, body);
    const { maintenance: row } = await created.json();
    const locals = await maintenanceLocals(row.id);

    expect(row.timezone).toBe("Asia/Kolkata");
    expect((await plain.json()).maintenance.timezone).toBeNull();
    const fetched = await maintenance.GET({ locals } as unknown as RequestEvent as never);
    expect((await fetched.json()).maintenance.timezone).toBe("Asia/Kolkata");
    const listed = await maintenances.GET({ url: new URL("http://x/") } as unknown as RequestEvent as never);
    const rows: { id: number; timezone: string | null }[] = (await listed.json()).maintenances;
    expect(rows.find((item) => item.id === row.id)?.timezone).toBe("Asia/Kolkata");
    expect(rows.find((item) => item.id === f.scheduledMaintenance)?.timezone).toBeNull();
    for (const empty of [null, "", "  "]) {
      await send(maintenance.PATCH, { timezone: "Asia/Kolkata" }, locals);
      const cleared = await send(maintenance.PATCH, { timezone: empty }, locals);
      expect((await cleared.json()).maintenance.timezone).toBeNull();
    }
  });

  it("PATCH …/events/{event_id} returns 400 for a window shorter than one minute, and saves nothing", async () => {
    const f = await seed();
    const before = await signals();
    const response = await send(
      maintenanceEvent.PATCH,
      { start_date_time: FUTURE + 600, end_date_time: FUTURE + 630 },
      await maintenanceLocals(f.scheduledMaintenance),
      { event_id: String(f.scheduledEvent) },
    );

    expect(response.status).toBe(400);
    expect(await signals()).toEqual(before);
    expect(await knex("maintenances_events").where({ id: f.scheduledEvent }).first()).toMatchObject({
      start_date_time: FUTURE,
      end_date_time: FUTURE + 3600,
    });
  });

  it("PATCH /incidents/{id} returns 400 for a new start after the stored end, and saves nothing", async () => {
    const f = await seed();
    const before = await signals();
    const response = await send(
      incident.PATCH,
      { start_date_time: T0 + 1200 },
      await incidentLocals(f.resolvedIncident),
    );

    expect(response.status).toBe(400);
    expect(await signals()).toEqual(before);
  });

  it("PATCH /incidents/{id} with end_date_time null takes a new start after the old end", async () => {
    const f = await seed();
    const response = await send(
      incident.PATCH,
      { start_date_time: T0 + 1200, end_date_time: null },
      await incidentLocals(f.resolvedIncident),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).incident).toMatchObject({ start_date_time: T0 + 1200, end_date_time: null });
  });

  it("POST /pages and PATCH /pages/{page_path} return 400 for a repeated monitor tag, and save nothing", async () => {
    for (const write of [
      () => send(pages.POST, { page_path: "eu", page_title: "EU", page_header: "EU", monitors: ["api", "api"] }),
      async () => send(page.PATCH, { monitors: ["web", "api", "web"] }, await pageLocals("status")),
    ]) {
      await seed();
      const before = await signals();
      const response = await write();

      expect(response.status).toBe(400);
      expect(await signals()).toEqual(before);
    }
  });
});

interface Schema {
  type?: string | string[];
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, Schema>;
  additionalProperties?: boolean | Schema;
  items?: Schema;
  oneOf?: Schema[];
  $ref?: string;
}
const spec: {
  paths: Record<string, Record<string, { requestBody?: { content: Record<string, { schema: Schema }> } }>>;
  components: { schemas: Record<string, Schema> };
} = JSON.parse(readFileSync(new URL("../../../../../static/api-references/v4.json", import.meta.url), "utf8"));
const resolveRef = (schema: Schema): Schema =>
  schema.$ref ? resolveRef(spec.components.schemas[schema.$ref.split("/").pop()!]) : schema;

const WRONG_VALUES: Record<string, unknown> = {
  string: "x",
  number: 123,
  boolean: true,
  object: { x: 1 },
  array: ["x"],
  null: null,
};

function acceptedTypes(schema: Schema): Set<string> | undefined {
  const s = resolveRef(schema);
  if (s.oneOf) {
    const sets = s.oneOf.map(acceptedTypes);
    return sets.every(Boolean) ? new Set(sets.flatMap((set) => [...set!])) : undefined;
  }
  if (!s.type) return undefined;
  const types = new Set([s.type].flat());
  if (types.has("integer")) types.add("number");
  return types;
}

interface Probe {
  label: string;
  body: unknown;
  field?: string;
}

function forbiddenBodies(schema: Schema, valid: Record<string, unknown>): Probe[] {
  const root = resolveRef(schema);
  const probes: Probe[] = Object.entries(WRONG_VALUES)
    .filter(([type]) => type !== "object")
    .map(([, value]) => ({ label: `body=${JSON.stringify(value)}`, body: value }));
  for (const branch of root.oneOf?.map(resolveRef) ?? [root]) {
    const properties = branch.properties ?? {};
    const base = Object.fromEntries(Object.entries(valid).filter(([key]) => key in properties));
    for (const field of branch.required ?? []) {
      if (!(field in base)) continue;
      const { [field]: _omitted, ...rest } = base;
      probes.push({ field, label: `${field} omitted`, body: rest });
    }
    for (const [field, fieldSchema] of Object.entries(properties)) {
      const itemSchema = resolveRef(fieldSchema).items;
      const shapes: [Schema, (value: unknown) => unknown][] = [[fieldSchema, (value) => value]];
      if (itemSchema) shapes.push([itemSchema, (value) => [value]]);
      for (const [shapeSchema, wrap] of shapes) {
        const s = resolveRef(shapeSchema);
        const types = acceptedTypes(s);
        const values = Object.entries(WRONG_VALUES)
          .filter(([type]) => types && !types.has(type))
          .map(([, value]) => value);
        if (s.enum) values.push("zz_not_allowed");
        for (const value of values) {
          probes.push({
            field,
            label: `${field}=${JSON.stringify(wrap(value))}`,
            body: { ...base, [field]: wrap(value) },
          });
        }
      }
    }
    if (branch.additionalProperties === false) {
      probes.push({ field: "zz_unknown", label: "zz_unknown=1", body: { ...base, zz_unknown: 1 } });
    }
  }
  return probes;
}

function allowedBodies(schema: Schema, valid: Record<string, unknown>): Probe[] {
  const properties = resolveRef(schema).properties ?? {};
  return [
    { label: "zz_unknown=1", body: { ...valid, zz_unknown: 1 } },
    ...Object.entries(properties)
      .filter(([, fieldSchema]) => acceptedTypes(fieldSchema)?.has("null"))
      .map(([field]) => ({ label: `${field}=null`, body: { ...valid, [field]: null } })),
  ];
}

interface WriteTarget {
  handler: Handler;
  valid: Record<string, unknown>;
  locals?: Partial<App.Locals>;
  params?: Record<string, string>;
}

const writeTargets: Record<string, (f: Fixture) => Promise<WriteTarget>> = {
  "POST /api/v4/monitors": async () => ({ handler: monitors.POST, valid: { tag: "probe", name: "Probe" } }),
  "PATCH /api/v4/monitors/{monitor_tag}": async () => ({
    handler: monitor.PATCH,
    valid: {},
    locals: await monitorLocals("api"),
  }),
  "PATCH /api/v4/monitors/{monitor_tag}/data": async () => ({
    handler: monitorData.PATCH,
    valid: { start_ts: T0, end_ts: T0 + 120, status: "UP", latency: 10 },
    locals: await monitorLocals("api"),
  }),
  "PATCH /api/v4/monitors/{monitor_tag}/data/{timestamp}": async () => ({
    handler: monitorDataPoint.PATCH,
    valid: {},
    locals: await monitorLocals("api"),
    params: { timestamp: String(T0) },
  }),
  "POST /api/v4/incidents": async () => ({ handler: incidents.POST, valid: { title: "Probe", start_date_time: T0 } }),
  "PATCH /api/v4/incidents/{incident_id}": async (f) => ({
    handler: incident.PATCH,
    valid: {},
    locals: await incidentLocals(f.openIncident),
  }),
  "POST /api/v4/incidents/{incident_id}/comments": async (f) => ({
    handler: comments.POST,
    valid: { comment: "Probe", state: "INVESTIGATING" },
    locals: await incidentLocals(f.openIncident),
  }),
  "PATCH /api/v4/incidents/{incident_id}/comments/{comment_id}": async (f) => ({
    handler: comment.PATCH,
    valid: {},
    locals: await incidentLocals(f.openIncident),
    params: { comment_id: String(f.openComment) },
  }),
  "POST /api/v4/pages": async () => ({
    handler: pages.POST,
    valid: { page_path: "probe", page_title: "Probe", page_header: "Probe" },
  }),
  "PATCH /api/v4/pages/{page_path}": async () => ({
    handler: page.PATCH,
    valid: {},
    locals: await pageLocals("status"),
  }),
  "PATCH /api/v4/site/{config_key}": async () => ({
    handler: siteKey.PATCH,
    valid: { value: "Probe" },
    params: { config_key: "siteName" },
  }),
  "POST /api/v4/maintenances": async () => ({
    handler: maintenances.POST,
    valid: { title: "Probe", start_date_time: FUTURE, rrule: "FREQ=MINUTELY;COUNT=1", duration_seconds: 3600 },
  }),
  "PATCH /api/v4/maintenances/{maintenance_id}": async (f) => ({
    handler: maintenance.PATCH,
    valid: {},
    locals: await maintenanceLocals(f.scheduledMaintenance),
  }),
  "PATCH /api/v4/maintenances/{maintenance_id}/events/{event_id}": async (f) => ({
    handler: maintenanceEvent.PATCH,
    valid: { start_date_time: FUTURE + 600, end_date_time: FUTURE + 4200 },
    locals: await maintenanceLocals(f.scheduledMaintenance),
    params: { event_id: String(f.scheduledEvent) },
  }),
  "POST /api/v4/images": async () => ({ handler: images.POST, valid: { base64: logo, mime_type: "image/png" } }),
};

const specWrites = Object.entries(spec.paths).flatMap(([path, methods]) =>
  Object.entries(methods).flatMap(([method, op]) =>
    op.requestBody
      ? [[`${method.toUpperCase()} ${path}`, op.requestBody.content["application/json"].schema] as const]
      : [],
  ),
);

describe("a v4 write body follows static/api-references/v4.json", () => {
  it("has a write target for every write in the spec", () => {
    expect(Object.keys(writeTargets).sort()).toEqual(specWrites.map(([op]) => op).sort());
  });

  it.each(specWrites)("%s returns 400 BAD_REQUEST that names the field, and saves nothing", async (op, schema) => {
    let f = await seed();
    const failures: string[] = [];
    for (const probe of forbiddenBodies(schema, (await writeTargets[op](f)).valid)) {
      const target = await writeTargets[op](f);
      const before = JSON.stringify(await signals());
      let status: number | string;
      let error: { code?: string; message?: string } = {};
      try {
        const response = await send(target.handler, probe.body, target.locals, target.params);
        status = response.status;
        error = (await response.json().catch(() => ({}))).error ?? {};
      } catch (e) {
        status = `threw ${String((e as Error).message)
          .split("\n")[0]
          .slice(-90)}`;
      }
      const saved = JSON.stringify(await signals()) !== before;
      const namesField = !probe.field || !!error.message?.toLowerCase().includes(probe.field.toLowerCase());
      if (status !== 400 || error.code !== "BAD_REQUEST" || saved || !namesField) {
        failures.push(`${probe.label} -> ${status} ${error.message ?? ""}${saved ? " (saved)" : ""}`);
      }
      if (saved) f = await seed();
    }
    expect(failures.join("\n")).toBe("");
  });

  it.each(specWrites)("%s accepts an unknown field, and null where the spec allows null", async (op, schema) => {
    let f = await seed();
    const failures: string[] = [];
    for (const probe of allowedBodies(schema, (await writeTargets[op](f)).valid)) {
      const target = await writeTargets[op](f);
      const response = await send(target.handler, probe.body, target.locals, target.params);
      if (response.status >= 300) {
        failures.push(`${probe.label} -> ${response.status} ${(await response.json()).error?.message}`);
      }
      f = await seed();
    }
    expect(failures.join("\n")).toBe("");
  });
});

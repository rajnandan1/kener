import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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

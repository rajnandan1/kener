import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";
import type { Cookies } from "@sveltejs/kit";

// TEST_DATABASE_URL=postgresql://… or mysql://… runs this file on that engine instead of in-memory SQLite.
vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
vi.mock("$lib/server/db/db", async () => {
  const { default: DbImpl } = await import("$lib/server/db/dbimpl");
  if (process.env.TEST_DATABASE_URL) {
    const { default: knexOb } = await import("../../../knexfile");
    return { default: new DbImpl(knexOb) };
  }
  return {
    default: new DbImpl({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true }),
  };
});
vi.mock("$lib/server/queues/alertingQueue", () => ({ default: { push: vi.fn() } }));
const { listContainers } = vi.hoisted(() => ({ listContainers: vi.fn(async () => ({ data: [] })) }));
vi.mock("$lib/server/docker", async (importOriginal) => ({ ...(await importOriginal<object>()), listContainers }));

import db from "$lib/server/db/db";
import { GenerateToken } from "$lib/server/controllers/commonController";
import { GetMonitorsParsed } from "$lib/server/controllers/monitorsController";
import { siteDataKeys } from "$lib/server/controllers/siteDataKeys";
import { ACTION_PERMISSION_MAP } from "$lib/allPerms";
import { MONITOR_TYPES } from "$lib/types/monitor";
import { seed as seedPermissions } from "../../../seeds/permissions";
import { seed as seedRoles } from "../../../seeds/roles";
import { MONITOR_LABELS, SITE_DATA_LABELS, TRIGGER_LABELS, type FieldLabel, type Labels } from "./storedSecrets";
import { POST as dashboardPost } from "../../routes/(manage)/manage/api/+server";
import * as v4Monitors from "../../routes/(api)/api/v4/monitors/+server";
import * as v4Monitor from "../../routes/(api)/api/v4/monitors/[monitor_tag]/+server";
import * as v4Site from "../../routes/(api)/api/v4/site/+server";
import * as v4SiteKey from "../../routes/(api)/api/v4/site/[config_key]/+server";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;
const SEEDED_ONCE = new Set(["knex_migrations", "knex_migrations_lock", "permissions", "roles", "roles_permissions"]);
const client = knex.client.config.client as string;
const MASK = "********";

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
  }
}

type Data = Record<string, unknown>;
const RAW_TOKENS = new Set<string>();
const raw = (id: string) => {
  RAW_TOKENS.add(`raw-${id}`);
  return `raw-${id}`;
};
const is = (label: FieldLabel | Labels, want: string) =>
  typeof label === "string" ? label === want : Array.isArray(label) && label.includes(want);
const isNested = (label: FieldLabel | Labels): label is Labels => typeof label === "object" && !Array.isArray(label);
const slug = (id: string) => id.replace(/[^A-Za-z0-9]+/g, "-");

/** One value per labeled field: a raw token in every secret, so a read that returns any part of it is caught. */
function sample(labels: Labels, id: string): Data {
  return Object.fromEntries(
    Object.entries(labels).map(([field, label]) => {
      const fid = slug(`${id}-${field}`);
      if (isNested(label)) return [field, sample(label, fid)];
      const host = `${fid.toLowerCase()}.example.com`;
      if (is(label, "secret") && is(label, "destination")) {
        return [field, `https://user:${raw(`${fid}-pass`)}@${host}/${raw(`${fid}-path`)}?token=${raw(`${fid}-query`)}`];
      }
      if (is(label, "secret")) {
        return [field, field === "headers" ? [{ key: "Authorization", value: `Bearer ${raw(fid)}` }] : raw(fid)];
      }
      if (is(label, "destination")) return [field, field === "to" ? "ops@example.com" : host];
      return [field, `plain-${fid}`];
    }),
  );
}

const fieldsWith = (labels: Labels, want: string) =>
  Object.entries(labels)
    .filter(([, label]) => !isNested(label) && is(label, want))
    .map(([field]) => field);
const nestedSecrets = (labels: Labels): boolean =>
  Object.values(labels).some((label) => (isNested(label) ? nestedSecrets(label) : is(label, "secret")));
const moved = (field: string) => (field === "to" ? "moved@example.com" : `https://moved.example.com/${field}`);

const monitorTag = (type: string) => `secret-${type.toLowerCase()}`;
const MONITORS = Object.fromEntries(
  Object.entries(MONITOR_LABELS).map(([type, labels]) => {
    const typeData = sample(labels, type);
    return [type, type === "DOCKER" ? { ...typeData, connectionType: "tls" } : typeData];
  }),
);
const TRIGGERS = Object.fromEntries(
  Object.entries(TRIGGER_LABELS).map(([type, labels]) => [type, sample(labels, type)]),
);
const SECRET_SITE_KEYS = Object.entries(SITE_DATA_LABELS).filter(([, labels]) => labels !== "plain") as [
  string,
  Labels,
][];
const SITE_DATA = Object.fromEntries(SECRET_SITE_KEYS.map(([key, labels]) => [key, sample(labels, key)]));

const cookies = {} as Record<"editor" | "member", Cookies>;
const triggerIds: Record<string, number> = {};
let alertConfigId: number;

async function dashboard(role: "editor" | "member", action: string, data: Data) {
  const response = await dashboardPost({
    request: new Request("http://localhost/manage/api", { method: "POST", body: JSON.stringify({ action, data }) }),
    cookies: cookies[role],
  } as never);
  return { status: response.status, body: await response.json() };
}
async function dashboardOk(role: "editor" | "member", action: string, data: Data) {
  const { status, body } = await dashboard(role, action, data);
  expect(status, `${action}: ${JSON.stringify(body)}`).toBe(200);
  return body;
}

const jsonBody = (body: unknown) => ({ method: "PATCH", body: JSON.stringify(body) });
const monitorLocals = async (tag: string) => ({ monitor: (await GetMonitorsParsed({ tag }))[0] });
const v4 = {
  listMonitors: () => v4Monitors.GET({ url: new URL("http://localhost/api/v4/monitors") } as never),
  getMonitor: async (tag: string) => v4Monitor.GET({ locals: await monitorLocals(tag) } as never),
  patchMonitor: async (tag: string, body: Data) =>
    v4Monitor.PATCH({
      locals: await monitorLocals(tag),
      request: new Request("http://localhost", jsonBody(body)),
    } as never),
  listSite: () => v4Site.GET({} as never),
  getSite: (key: string) => v4SiteKey.GET({ params: { config_key: key } } as never),
  patchSite: (key: string, value: unknown) =>
    v4SiteKey.PATCH({
      params: { config_key: key },
      request: new Request("http://localhost", jsonBody({ value })),
    } as never),
};

const storedTypeData = async (type: string) =>
  JSON.parse(
    (
      await knex("monitors")
        .where({ tag: monitorTag(type) })
        .first()
    ).type_data,
  ) as Data;
const storedMeta = async (type: string) =>
  JSON.parse((await knex("triggers").where({ id: triggerIds[type] }).first()).trigger_meta) as Data;
const storedSite = async (key: string) => JSON.parse((await knex("site_data").where({ key }).first()).value) as Data;
const leaked = (body: unknown) => [...RAW_TOKENS].filter((token) => JSON.stringify(body).includes(token));

async function resetRecords() {
  for (const [type, typeData] of Object.entries(MONITORS)) {
    await knex("monitors")
      .where({ tag: monitorTag(type) })
      .update({ monitor_type: type, type_data: JSON.stringify(typeData) });
  }
  for (const [type, meta] of Object.entries(TRIGGERS)) {
    await knex("triggers")
      .where({ id: triggerIds[type] })
      .update({ trigger_type: type, trigger_meta: JSON.stringify(meta) });
  }
  for (const [key, value] of Object.entries(SITE_DATA)) {
    await knex("site_data")
      .where({ key })
      .update({ value: JSON.stringify(value) });
  }
}

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
  await clearTables();
  for (const role of ["editor", "member"] as const) {
    const email = `${role}@example.com`;
    await knex("users").insert({ email, name: role, password_hash: "x", is_active: 1, is_verified: 1 });
    const user = (await db.getUserByEmail(email))!;
    await knex("users_roles").insert({ users_id: user.id, roles_id: role });
    const token = await GenerateToken(user);
    cookies[role] = { get: (name: string) => (name === "kener-user" ? token : undefined) } as unknown as Cookies;
  }
  const monitor = { status: "ACTIVE", is_hidden: "NO", default_status: "UP", cron: "* * * * *" };
  for (const [type, typeData] of Object.entries(MONITORS)) {
    await knex("monitors").insert({
      ...monitor,
      tag: monitorTag(type),
      name: type,
      monitor_type: type,
      type_data: JSON.stringify(typeData),
    });
  }
  for (const [type, meta] of Object.entries(TRIGGERS)) {
    await knex("triggers").insert({
      name: `secret-${type}`,
      trigger_type: type,
      trigger_status: "ACTIVE",
      trigger_meta: JSON.stringify(meta),
    });
    triggerIds[type] = (
      await knex("triggers")
        .where({ name: `secret-${type}` })
        .first()
    ).id;
  }
  for (const [key, value] of Object.entries(SITE_DATA)) {
    await knex("site_data").insert({ key, value: JSON.stringify(value), data_type: "object" });
  }
  const config = await dashboardOk("editor", "createMonitorAlertConfig", {
    monitor_tags: [monitorTag("API")],
    trigger_ids: Object.values(triggerIds),
    alert_for: "STATUS",
    alert_value: "DOWN",
    failure_threshold: 1,
    success_threshold: 1,
  });
  alertConfigId = config.id;
});

beforeEach(resetRecords);

afterAll(async () => {
  await knex.destroy();
});

const scan = (dir: string, name: RegExp) =>
  (fs.readdirSync(dir, { recursive: true }) as string[])
    .map((file) => path.join(dir, file).split(path.sep).join("/"))
    .filter((file) => name.test(path.basename(file)) && !file.includes("(docs)"));

describe("the stored-secret inventory", () => {
  it("labels every field of every monitor type, trigger, and site-data value it names", () => {
    const file = path.resolve("src/lib/server/storedSecrets.ts");
    const program = ts.createProgram([file], {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      baseUrl: ".",
      paths: { "$lib/*": ["src/lib/*"] },
      types: [],
    });
    const errors = ts
      .getPreEmitDiagnostics(program, program.getSourceFile(file))
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));

    expect(errors).toEqual([]);
  });

  it("has labels for every monitor type", () => {
    expect(Object.keys(MONITOR_LABELS).sort()).toEqual([...MONITOR_TYPES].sort());
  });

  it("has labels for every trigger type the alert sender handles", () => {
    const source = fs.readFileSync("src/lib/server/queues/alertingQueue.ts", "utf8");
    const sent = [...source.matchAll(/trigger_type === "(\w+)"/g)].map((m) => m[1]);

    expect(Object.keys(TRIGGER_LABELS).sort()).toEqual([...new Set(sent)].sort());
  });

  it("has labels for every site-data key", () => {
    expect(Object.keys(SITE_DATA_LABELS).sort()).toEqual(siteDataKeys.map((k) => k.key).sort());
  });
});

/** Dashboard actions that return or send a stored record. Each one has a test below. */
const DASHBOARD_READS = [
  "getMonitors",
  "getTriggers",
  "getMonitorAlertConfig",
  "getMonitorAlertConfigById",
  "getMonitorAlertConfigsByMonitorTag",
  "getAlertConfigsPaginated",
  "createMonitorAlertConfig",
  "updateMonitorAlertConfig",
  "getAllSiteData",
  "getSiteDataByKey",
  "getOidcSettingsMasked",
];
const DASHBOARD_RESTORES = ["storeMonitorData", "createUpdateTrigger", "storeSiteData", "listDockerContainers"];
/** Dashboard actions that return no monitor type_data, trigger_meta, or secret site data. */
const DASHBOARD_OTHERS = [
  ...["updateUser", "updatePassword", "sendVerificationEmail", "getSubscriptionsConfig", "updateSubscriptionsConfig"],
  ...["getUsers", "manualUpdate", "createNewUser", "resendInvitation", "getMonitoringDataPaginated"],
  ...["updateMonitoringData", "deleteMonitor", "deleteMonitorData", "cloneMonitor", "testMonitor"],
  ...["getIncidents", "getIncident", "getComments", "createIncident", "updateIncident", "deleteIncident"],
  ...["addMonitor", "removeMonitor", "addComment", "deleteComment", "updateComment", "getMaintenances"],
  ...["getMaintenance", "getMaintenanceEvents", "getMaintenanceEvent", "getMaintenanceMonitors", "createMaintenance"],
  ...["updateMaintenance", "deleteMaintenance", "createMaintenanceEvent", "updateMaintenanceEvent"],
  ...["updateMaintenanceEventStatus", "deleteMaintenanceEvent", "addMonitorToMaintenance"],
  ...["removeMonitorFromMaintenance", "updateMaintenanceMonitorImpact", "getPages", "createPage", "updatePage"],
  ...["deletePage", "addMonitorToPage", "removeMonitorFromPage", "reorderPageMonitors", "updateMonitorTriggers"],
  ...["deleteTrigger", "testTrigger", "getAllAlertsPaginated", "deleteMonitorAlertConfig"],
  ...["toggleMonitorAlertConfigStatus", "deleteMonitorAlertV2", "updateMonitorAlertV2Status", "getAPIKeys"],
  ...["createNewApiKey", "updateApiKeyStatus", "deleteApiKey", "getSubscribersByMethod"],
  ...["getSubscriberWithSubscriptions", "getSubscriberCountsByMethod", "getAdminSubscribers"],
  ...["deleteUserSubscription", "updateUserSubscriptionStatus", "adminUpdateSubscriptionStatus"],
  ...["adminDeleteSubscriber", "adminAddSubscriber", "getGeneralEmailTemplates", "getGeneralEmailTemplateById"],
  ...["updateGeneralEmailTemplate", "uploadImage", "deleteImage", "getRoles", "getAllPermissions"],
  ...["getRolePermissions", "getRoleUsers", "createRole", "updateRole", "deleteRole", "updateRolePermissions"],
  ...["addUserToRole", "removeUserFromRole", "getOidcGroupRoleMappings", "upsertOidcGroupRoleMapping"],
  ...["deleteOidcGroupRoleMapping", "testOidcConnection"],
];
const V4_READS = [
  "GET /monitors",
  "GET /monitors/[monitor_tag]",
  "PATCH /monitors/[monitor_tag]",
  "GET /site",
  "GET /site/[config_key]",
  "PATCH /site/[config_key]",
];
/** POST /monitors returns the monitor the caller just sent, unmasked, by decision in GHSA-q2qv-p86w-m24c. */
const V4_ECHOES = ["POST /monitors"];
const V4_OTHERS = [
  ...["POST /images", "GET /incidents", "POST /incidents", "GET /incidents/[incident_id]"],
  ...["PATCH /incidents/[incident_id]", "DELETE /incidents/[incident_id]", "GET /incidents/[incident_id]/comments"],
  ...["POST /incidents/[incident_id]/comments", "GET /incidents/[incident_id]/comments/[comment_id]"],
  ...["PATCH /incidents/[incident_id]/comments/[comment_id]", "DELETE /incidents/[incident_id]/comments/[comment_id]"],
  ...["GET /maintenances", "POST /maintenances", "GET /maintenances/events", "GET /maintenances/[maintenance_id]"],
  ...["PATCH /maintenances/[maintenance_id]", "DELETE /maintenances/[maintenance_id]"],
  ...["GET /maintenances/[maintenance_id]/events", "GET /maintenances/[maintenance_id]/events/[event_id]"],
  ...[
    "PATCH /maintenances/[maintenance_id]/events/[event_id]",
    "DELETE /maintenances/[maintenance_id]/events/[event_id]",
  ],
  ...["DELETE /monitors/[monitor_tag]", "GET /monitors/[monitor_tag]/data", "PATCH /monitors/[monitor_tag]/data"],
  ...["GET /monitors/[monitor_tag]/data/[timestamp]", "PATCH /monitors/[monitor_tag]/data/[timestamp]"],
  ...["GET /pages", "POST /pages", "GET /pages/[page_path]", "PATCH /pages/[page_path]", "DELETE /pages/[page_path]"],
];
/**
 * Every other server file that reads monitors, triggers, or site data, reviewed: each returns derived fields only
 * (names, statuses, bars, XML, SVG, emails) or loads a record into `locals` without returning it.
 */
const OTHER_RECORD_READERS = [
  "src/hooks.server.ts",
  "src/lib/server/api-server/events-by-month/post.ts",
  "src/lib/server/api-server/monitor-bar/get.ts",
  "src/lib/server/api-server/monitor-bars/get.ts",
  "src/lib/server/api-server/monitor-day-incidents/post.ts",
  "src/lib/server/api-server/monitor-day-latency/post.ts",
  "src/lib/server/api-server/monitor-day-maintenances/post.ts",
  "src/lib/server/api-server/monitor-day-status/post.ts",
  "src/lib/server/api-server/monitor-latency-chart/get.ts",
  "src/lib/server/api-server/notifications/get.ts",
  "src/lib/server/api-server/pages/get.ts",
  "src/lib/server/api-server/subscription/post.ts",
  "src/routes/(account)/account/forgot/api/fogot-password/+server.ts",
  "src/routes/(account)/account/forgot/api/password-reset/+server.ts",
  "src/routes/(api)/api/v4/incidents/+server.ts",
  "src/routes/(api)/api/v4/incidents/[incident_id]/+server.ts",
  "src/routes/(api)/api/v4/maintenances/+server.ts",
  "src/routes/(api)/api/v4/maintenances/[maintenance_id]/+server.ts",
  "src/routes/(api)/api/v4/pages/+server.ts",
  "src/routes/(api)/api/v4/pages/[page_path]/+server.ts",
  "src/routes/(kener)/badge/[tag]/dot/+server.ts",
  "src/routes/(kener)/maintenances/[maintenance_id]/+page.server.ts",
  "src/routes/(kener)/monitors/[monitor_tag]/+page.server.ts",
  "src/routes/(kener)/sitemap.xml/+server.ts",
  "src/routes/(manage)/+layout.server.ts",
];
const RECORD_READER =
  /\b(GetMonitors\w*|getMonitors\w*|getMonitorByTag|GetAllTriggers|GetTriggerByID|getTriggers|getTriggerByID|GetAllSiteData|GetSiteDataByKey|getAllSiteData\w*|getSiteDataByKey|GetMonitorAlertConfig\w*|getMonitorAlertConfig\w*|GetTriggersByMonitorAlertConfigId)\b/;

describe("the read-path list", () => {
  it("names every dashboard action", () => {
    expect([...DASHBOARD_READS, ...DASHBOARD_RESTORES, ...DASHBOARD_OTHERS].sort()).toEqual(
      Object.keys(ACTION_PERMISSION_MAP).sort(),
    );
  });

  it("names every /api/v4 route method", () => {
    const root = "src/routes/(api)/api/v4";
    const routes = scan(root, /^\+server\.ts$/).flatMap((file) => {
      const route = path.dirname(file).slice(root.length) || "/";
      const methods = fs.readFileSync(file, "utf8").matchAll(/export const (GET|POST|PATCH|PUT|DELETE)\b/g);
      return [...methods].map((m) => `${m[1]} ${route}`);
    });

    expect([...V4_READS, ...V4_ECHOES, ...V4_OTHERS].sort()).toEqual(routes.sort());
  });

  it("names every other server file that reads a monitor, trigger, or site-data record", () => {
    const covered = new Set([
      "src/routes/(manage)/manage/api/+server.ts",
      "src/routes/(api)/api/v4/monitors/+server.ts",
      "src/routes/(api)/api/v4/monitors/[monitor_tag]/+server.ts",
      "src/routes/(api)/api/v4/site/+server.ts",
      "src/routes/(api)/api/v4/site/[config_key]/+server.ts",
    ]);
    const files = [
      "src/hooks.server.ts",
      ...scan("src/routes", /^\+(server|page\.server|layout\.server)\.ts$/),
      ...scan("src/lib/server/api-server", /^(?!.*\.test\.ts$).*\.ts$/),
    ];
    const readers = files.filter((file) => !covered.has(file) && RECORD_READER.test(fs.readFileSync(file, "utf8")));

    expect(readers.sort()).toEqual([...OTHER_RECORD_READERS].sort());
  });
});

describe("no read response returns a stored secret", () => {
  const tags = Object.keys(MONITORS).map(monitorTag);
  const secretSiteKeys = SECRET_SITE_KEYS.map(([key]) => key);
  const reads: Record<string, () => Promise<unknown>> = {
    "dashboard getMonitors as member": () => dashboardOk("member", "getMonitors", {}),
    "dashboard getTriggers": () => dashboardOk("member", "getTriggers", {}),
    "dashboard getMonitorAlertConfig": () => dashboardOk("member", "getMonitorAlertConfig", { id: alertConfigId }),
    "dashboard getMonitorAlertConfigById": () =>
      dashboardOk("member", "getMonitorAlertConfigById", { id: alertConfigId }),
    "dashboard getMonitorAlertConfigsByMonitorTag": () =>
      dashboardOk("member", "getMonitorAlertConfigsByMonitorTag", { monitor_tag: monitorTag("API") }),
    "dashboard getAlertConfigsPaginated": () => dashboardOk("member", "getAlertConfigsPaginated", {}),
    "dashboard createMonitorAlertConfig": () =>
      dashboardOk("editor", "createMonitorAlertConfig", {
        monitor_tags: [monitorTag("API")],
        trigger_ids: Object.values(triggerIds),
        alert_for: "LATENCY",
        alert_value: "100",
        failure_threshold: 1,
        success_threshold: 1,
      }),
    "dashboard updateMonitorAlertConfig": () =>
      dashboardOk("editor", "updateMonitorAlertConfig", { id: alertConfigId, alert_description: "edited" }),
    "dashboard getAllSiteData": () => dashboardOk("member", "getAllSiteData", {}),
    "dashboard getSiteDataByKey": () =>
      Promise.all(secretSiteKeys.map((key) => dashboardOk("member", "getSiteDataByKey", { key }))),
    "dashboard getOidcSettingsMasked": () => dashboardOk("member", "getOidcSettingsMasked", {}),
    "GET /api/v4/monitors": async () => (await v4.listMonitors()).json(),
    "GET /api/v4/monitors/{tag}": () => Promise.all(tags.map(async (tag) => (await v4.getMonitor(tag)).json())),
    "PATCH /api/v4/monitors/{tag}": () =>
      Promise.all(tags.map(async (tag) => (await v4.patchMonitor(tag, { description: "edited" })).json())),
    "GET /api/v4/site": async () => (await v4.listSite()).json(),
    "GET /api/v4/site/{key}": () => Promise.all(secretSiteKeys.map(async (key) => (await v4.getSite(key)).json())),
    "PATCH /api/v4/site/{key}": () =>
      Promise.all(
        secretSiteKeys.map(async (key) => {
          const { value } = await (await v4.getSite(key)).json();
          return (await v4.patchSite(key, value)).json();
        }),
      ),
  };

  it.each(Object.keys(reads))("%s", async (name) => {
    expect(leaked(await reads[name]())).toEqual([]);
  });

  it("dashboard getMonitors shows a monitor writer the heartbeat secret only", async () => {
    expect(leaked(await dashboardOk("editor", "getMonitors", {}))).toEqual([raw("HEARTBEAT-secretString")]);
  });
});

describe("a save that sends the masked read back keeps every stored secret", () => {
  it.each(Object.keys(MONITORS))("dashboard storeMonitorData, %s monitor", async (type) => {
    const [row] = await dashboardOk("editor", "getMonitors", { tag: monitorTag(type) });

    await dashboardOk("editor", "storeMonitorData", { ...row, description: "edited" });

    expect(await storedTypeData(type)).toEqual(MONITORS[type]);
  });

  it.each(Object.keys(MONITORS))("PATCH /api/v4/monitors/{tag}, %s monitor", async (type) => {
    const { monitor } = await (await v4.getMonitor(monitorTag(type))).json();

    const response = await v4.patchMonitor(monitorTag(type), { type_data: monitor.type_data });

    expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
    expect(await storedTypeData(type)).toEqual(MONITORS[type]);
  });

  it.each(Object.keys(TRIGGERS))("dashboard createUpdateTrigger, %s trigger", async (type) => {
    const triggers = await dashboardOk("editor", "getTriggers", {});

    await dashboardOk(
      "editor",
      "createUpdateTrigger",
      triggers.find((t: Data) => t.id === triggerIds[type]),
    );

    expect(await storedMeta(type)).toEqual(TRIGGERS[type]);
  });

  it.each(Object.keys(SITE_DATA))("dashboard storeSiteData and PATCH /api/v4/site/{key}, %s", async (key) => {
    const masked = await dashboardOk("editor", "getSiteDataByKey", { key });

    await dashboardOk("editor", "storeSiteData", { [key]: JSON.stringify(masked) });
    expect((await v4.patchSite(key, masked)).status).toBe(200);

    expect(await storedSite(key)).toEqual(SITE_DATA[key]);
  });
});

describe("a changed destination never gets a stored secret", () => {
  const monitorCases = Object.entries(MONITOR_LABELS).flatMap(([type, labels]) =>
    fieldsWith(labels, "secret").length ? fieldsWith(labels, "destination").map((field) => [type, field]) : [],
  );
  const triggerCases = Object.entries(TRIGGER_LABELS).flatMap(([type, labels]) =>
    fieldsWith(labels, "destination").map((field) => [type, field]),
  );
  const siteCases = SECRET_SITE_KEYS.flatMap(([key, labels]) =>
    nestedSecrets(labels) ? fieldsWith(labels, "destination").map((field) => [key, field, labels] as const) : [],
  );

  it("covers a monitor type, a trigger type, and a site-data key", () => {
    expect(monitorCases.map(([type]) => type)).toEqual(expect.arrayContaining(["API", "PROMETHEUS", "DOCKER"]));
    expect(triggerCases.length).toBeGreaterThan(0);
    expect(siteCases.map(([key, field]) => [key, field])).toContainEqual(["oidcSettings", "issuer_url"]);
  });

  it.each(monitorCases)("dashboard storeMonitorData, %s monitor, new %s", async (type, field) => {
    const [row] = await dashboardOk("editor", "getMonitors", { tag: monitorTag(type) });
    const typeData = { ...JSON.parse(row.type_data), [field]: moved(field) };

    const { status } = await dashboard("editor", "storeMonitorData", { ...row, type_data: JSON.stringify(typeData) });

    expect(status).toBe(400);
    expect(await storedTypeData(type)).toEqual(MONITORS[type]);
  });

  it.each(monitorCases)("PATCH /api/v4/monitors/{tag}, %s monitor, new %s", async (type, field) => {
    const { monitor } = await (await v4.getMonitor(monitorTag(type))).json();

    for (const type_data of [{ ...monitor.type_data, [field]: moved(field) }, { [field]: moved(field) }]) {
      expect((await v4.patchMonitor(monitorTag(type), { type_data })).status).toBe(400);
    }
    expect(await storedTypeData(type)).toEqual(MONITORS[type]);
  });

  it.each(monitorCases)("saves %s monitor with new %s when every secret is sent again", async (type, field) => {
    const typeData = { ...MONITORS[type], [field]: moved(field) };

    expect((await v4.patchMonitor(monitorTag(type), { type_data: typeData })).status).toBe(200);
    expect(await storedTypeData(type)).toEqual(typeData);
  });

  it("dashboard listDockerContainers sends the stored TLS key only to the stored daemon", async () => {
    const [row] = await dashboardOk("editor", "getMonitors", { tag: monitorTag("DOCKER") });
    const typeData = JSON.parse(row.type_data);
    listContainers.mockClear();

    await dashboardOk("editor", "listDockerContainers", { monitor_id: row.id, type_data: typeData });
    const { status } = await dashboard("editor", "listDockerContainers", {
      monitor_id: row.id,
      type_data: { ...typeData, daemon: moved("daemon") },
    });

    expect(status).toBe(400);
    expect(listContainers).toHaveBeenCalledTimes(1);
    expect(listContainers).toHaveBeenCalledWith(
      expect.objectContaining({ daemon: MONITORS.DOCKER.daemon, tlsKey: MONITORS.DOCKER.tlsKey }),
      undefined,
    );
  });

  it("dashboard storeMonitorData rejects a monitor type change that keeps a masked secret", async () => {
    const [row] = await dashboardOk("editor", "getMonitors", { tag: monitorTag("API") });

    const { status } = await dashboard("editor", "storeMonitorData", { ...row, monitor_type: "PROMETHEUS" });

    expect(status).toBe(400);
    expect(await storedTypeData("API")).toEqual(MONITORS.API);
  });

  it.each(triggerCases)("dashboard createUpdateTrigger, %s trigger, new %s", async (type, field) => {
    const trigger = (await dashboardOk("editor", "getTriggers", {})).find((t: Data) => t.id === triggerIds[type]);
    const meta = { ...JSON.parse(trigger.trigger_meta), [field]: moved(field) };

    const { status } = await dashboard("editor", "createUpdateTrigger", {
      ...trigger,
      trigger_meta: JSON.stringify(meta),
    });

    expect(status).toBe(400);
    expect(await storedMeta(type)).toEqual(TRIGGERS[type]);
  });

  it.each(siteCases)("dashboard storeSiteData and PATCH /api/v4/site/{key}, %s, new %s", async (key, field, labels) => {
    const masked = await dashboardOk("editor", "getSiteDataByKey", { key });
    const secrets = fieldsWith(labels, "secret");
    const secretLeftOut = Object.fromEntries(Object.entries(masked).filter(([f]) => !secrets.includes(f)));

    for (const value of [masked, secretLeftOut].map((v) => ({ ...v, [field]: moved(field) }))) {
      expect((await dashboard("editor", "storeSiteData", { [key]: JSON.stringify(value) })).status).toBe(400);
      expect((await v4.patchSite(key, value)).status).toBe(400);
    }
    expect(await storedSite(key)).toEqual(SITE_DATA[key]);
  });

  it("stores no masked URL whose origin changed, even with no other secret", async () => {
    const { monitor } = await (await v4.getMonitor(monitorTag("API"))).json();
    const url = `https://moved.example.com/${MASK}`;

    const response = await v4.patchMonitor(monitorTag("API"), {
      type_data: { ...MONITORS.API, url },
    });

    expect(monitor.type_data.url).toBe(`https://api-url.example.com/${MASK}`);
    expect(response.status).toBe(400);
    expect(await storedTypeData("API")).toEqual(MONITORS.API);
  });
});

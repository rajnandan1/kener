import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";
import type { Cookies } from "@sveltejs/kit";

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
vi.mock("$lib/server/queues/alertingQueue", () => ({ default: { push: vi.fn() } }));
const { listContainers } = vi.hoisted(() => ({ listContainers: vi.fn(async () => ({ data: [] })) }));
vi.mock("$lib/server/docker", async (importOriginal) => ({ ...(await importOriginal<object>()), listContainers }));

import db from "$lib/server/db/db";
import { GenerateToken } from "$lib/server/controllers/commonController";
import { seed as seedPermissions } from "../../../../../seeds/permissions";
import { seed as seedRoles } from "../../../../../seeds/roles";
import { POST } from "./+server";

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

const API_TYPE_DATA = {
  url: "https://internal.example.com/health",
  method: "GET",
  headers: [
    { key: "Authorization", value: "Bearer raw-header-token" },
    { key: "Accept", value: "" },
  ],
  body: '{"password":"raw-body-password"}',
  proxy: "http://user:raw-proxy-pass@proxy.example.com:3128",
  timeout: 10000,
};
const SQL_TYPE_DATA = {
  dbType: "pg",
  connectionString: "postgresql://u:raw-sql-pass@db.example.com:5432/x",
  query: "select 1",
  timeout: 5000,
};
const HEARTBEAT_TYPE_DATA = {
  degradedRemainingMinutes: 1,
  downRemainingMinutes: 2,
  secretString: "raw-heartbeat-secret",
};
const DOCKER_TYPE_DATA = {
  connectionType: "tls",
  daemon: "docker.example.com:2376",
  checkType: "daemon",
  tlsCa: "ca-pem",
  tlsCert: "cert-pem",
  tlsKey: "raw-docker-key",
  timeout: 5000,
};
const WEBHOOK_META = {
  url: "https://hooks.example.com/services/raw-webhook-path?token=raw-webhook-query",
  headers: [{ key: "Authorization", value: "Bearer raw-trigger-token" }],
  webhook_body: "{}",
};
const RAW_SECRETS = [
  "raw-header-token",
  "raw-body-password",
  "raw-proxy-pass",
  "raw-sql-pass",
  "raw-heartbeat-secret",
  "raw-docker-key",
  "raw-webhook-path",
  "raw-webhook-query",
  "raw-trigger-token",
];

const cookies: Record<"editor" | "member", Cookies> = {} as Record<"editor" | "member", Cookies>;
let triggerId: number;

async function dashboard(role: "editor" | "member", action: string, data: Record<string, unknown>) {
  const response = await POST({
    request: new Request("http://localhost/manage/api", { method: "POST", body: JSON.stringify({ action, data }) }),
    cookies: cookies[role],
  } as never);
  const body = await response.json();
  expect(response.status, `${action}: ${JSON.stringify(body)}`).toBe(200);
  return body;
}

const leaked = (body: unknown) => RAW_SECRETS.filter((secret) => JSON.stringify(body).includes(secret));
const storedTypeData = async (tag: string) =>
  JSON.parse((await knex("monitors").where({ tag }).first()).type_data) as Record<string, unknown>;
const storedMeta = async () =>
  JSON.parse((await knex("triggers").where({ id: triggerId }).first()).trigger_meta) as Record<string, unknown>;

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
  await knex("monitors").insert([
    { ...monitor, tag: "secret-api", name: "API", monitor_type: "API", type_data: JSON.stringify(API_TYPE_DATA) },
    { ...monitor, tag: "secret-sql", name: "SQL", monitor_type: "SQL", type_data: JSON.stringify(SQL_TYPE_DATA) },
    {
      ...monitor,
      tag: "secret-hb",
      name: "Heartbeat",
      monitor_type: "HEARTBEAT",
      type_data: JSON.stringify(HEARTBEAT_TYPE_DATA),
    },
    {
      ...monitor,
      tag: "secret-docker",
      name: "Docker",
      monitor_type: "DOCKER",
      type_data: JSON.stringify(DOCKER_TYPE_DATA),
    },
  ]);
  await knex("triggers").insert({
    name: "hook",
    trigger_type: "webhook",
    trigger_status: "ACTIVE",
    trigger_meta: JSON.stringify(WEBHOOK_META),
  });
  triggerId = (await knex("triggers").where({ name: "hook" }).first()).id;
});

afterAll(async () => {
  await knex.destroy();
});

describe("dashboard reads mask stored monitor secrets", () => {
  it("masks every secret for a member, the heartbeat secret included", async () => {
    const monitors = await dashboard("member", "getMonitors", {});

    expect(leaked(monitors)).toEqual([]);
    const byTag = Object.fromEntries(monitors.map((m: { tag: string; type_data: string }) => [m.tag, m.type_data]));
    expect(JSON.parse(byTag["secret-api"])).toEqual({
      ...API_TYPE_DATA,
      headers: [
        { key: "Authorization", value: MASK },
        { key: "Accept", value: "" },
      ],
      body: MASK,
      proxy: MASK,
    });
    expect(JSON.parse(byTag["secret-sql"])).toEqual({ ...SQL_TYPE_DATA, connectionString: MASK });
    expect(JSON.parse(byTag["secret-hb"])).toEqual({ ...HEARTBEAT_TYPE_DATA, secretString: MASK });
  });

  it("shows the heartbeat secret to an editor, who needs the heartbeat URL, and masks the rest", async () => {
    const monitors = await dashboard("editor", "getMonitors", {});

    expect(leaked(monitors)).toEqual(["raw-heartbeat-secret"]);
  });

  it("keeps every stored secret when an editor saves the masked row back", async () => {
    for (const tag of ["secret-api", "secret-sql", "secret-hb"]) {
      const before = await storedTypeData(tag);
      const [row] = await dashboard("editor", "getMonitors", { tag });

      await dashboard("editor", "storeMonitorData", { ...row, status: "INACTIVE" });

      expect(await storedTypeData(tag)).toEqual(before);
    }
  });
});

describe("Docker container picker", () => {
  it("browses a saved monitor with its stored TLS key, which getMonitors masks", async () => {
    const [row] = await dashboard("editor", "getMonitors", { tag: "secret-docker" });

    await dashboard("editor", "listDockerContainers", { monitor_id: row.id, type_data: JSON.parse(row.type_data) });

    expect(listContainers).toHaveBeenLastCalledWith(
      expect.objectContaining({ tlsKey: "raw-docker-key", daemon: "docker.example.com:2376" }),
      5000,
    );
  });

  it("browses an unsaved connection as typed", async () => {
    await dashboard("editor", "listDockerContainers", { type_data: { ...DOCKER_TYPE_DATA, tlsKey: "new-key" } });

    expect(listContainers).toHaveBeenLastCalledWith(expect.objectContaining({ tlsKey: "new-key" }), 5000);
  });
});

describe("dashboard reads mask stored trigger secrets", () => {
  it("shows a member only the URL origin and masks header values", async () => {
    const triggers = await dashboard("member", "getTriggers", {});

    expect(leaked(triggers)).toEqual([]);
    expect(JSON.parse(triggers[0].trigger_meta)).toEqual({
      ...WEBHOOK_META,
      url: `https://hooks.example.com/${MASK}`,
      headers: [{ key: "Authorization", value: MASK }],
    });
  });

  it("keeps the stored URL and headers when an editor saves the masked trigger back", async () => {
    const [trigger] = await dashboard("editor", "getTriggers", {});

    await dashboard("editor", "createUpdateTrigger", { ...trigger, trigger_desc: "edited" });

    expect(await storedMeta()).toEqual(WEBHOOK_META);
  });

  it("keeps a stored header value when only the header name's case changes", async () => {
    const [trigger] = await dashboard("editor", "getTriggers", {});
    const meta = JSON.parse(trigger.trigger_meta);
    meta.headers = [{ key: "authorization", value: MASK }];

    await dashboard("editor", "createUpdateTrigger", { ...trigger, trigger_meta: JSON.stringify(meta) });

    expect((await storedMeta()).headers).toEqual([{ key: "authorization", value: "Bearer raw-trigger-token" }]);
    await knex("triggers")
      .where({ id: triggerId })
      .update({ trigger_meta: JSON.stringify(WEBHOOK_META) });
  });

  it("saves a new URL as given", async () => {
    const [trigger] = await dashboard("editor", "getTriggers", {});
    const meta = { ...JSON.parse(trigger.trigger_meta), url: `https://other.example.com/${MASK}` };

    await dashboard("editor", "createUpdateTrigger", { ...trigger, trigger_meta: JSON.stringify(meta) });

    expect((await storedMeta()).url).toBe(`https://other.example.com/${MASK}`);
    await knex("triggers")
      .where({ id: triggerId })
      .update({ trigger_meta: JSON.stringify(WEBHOOK_META) });
  });

  it("masks the triggers inside every alert config read", async () => {
    const created = await dashboard("editor", "createMonitorAlertConfig", {
      monitor_tags: ["secret-api"],
      trigger_ids: [triggerId],
      alert_for: "STATUS",
      alert_value: "DOWN",
      failure_threshold: 1,
      success_threshold: 1,
    });
    const reads = [
      created,
      await dashboard("member", "getMonitorAlertConfigById", { id: created.id }),
      await dashboard("member", "getMonitorAlertConfigsByMonitorTag", { monitor_tag: "secret-api" }),
      await dashboard("member", "getAlertConfigsPaginated", {}),
      await dashboard("editor", "updateMonitorAlertConfig", { id: created.id, alert_description: "edited" }),
    ];

    for (const read of reads) expect(leaked(read)).toEqual([]);
    expect(created.triggers).toHaveLength(1);
  });
});

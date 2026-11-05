import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";

// TEST_DATABASE_URL=postgresql://… or mysql://… runs this file on that engine instead of in-memory SQLite.
// It empties the subscriber, legacy subscription and monitor tables, so point it only at a throwaway database.
vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
vi.mock("$lib/server/db/db", async () => {
  const { default: DbImpl } = await import("$lib/server/db/dbimpl");
  if (process.env.TEST_DATABASE_URL) {
    const { default: knexOb } = await import("../../../../knexfile");
    return { default: new DbImpl(knexOb) };
  }
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
vi.mock("$lib/server/queues/alertingQueue", () => ({ default: { push: vi.fn() } }));

import db from "$lib/server/db/db";
import {
  GetActiveEmailsForMonitors,
  GetSubscriptionMigrationReport,
  VerifySubscriberOTP,
} from "$lib/server/controllers/userSubscriptionsController";
import { up } from "../../../../migrations/20261023120000_add_monitor_subscriptions";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;
const client = knex.client.config.client as string;

const insert = async (table: string, row: Record<string, unknown>): Promise<number> => {
  const [result]: (number | { id: number })[] =
    client === "mysql2" ? await knex(table).insert(row) : await knex(table).insert(row, ["id"]);
  return typeof result === "object" ? result.id : result;
};

// A Kener 3 subscriber and their subscriptions, as Kener 3 wrote them: one row per monitor tag, or ALL.
async function v3Subscriber(email: string, status: string, subscriptions: Array<[string, string?]>): Promise<number> {
  const id = await insert("subscribers", {
    subscriber_send: email,
    subscriber_type: "email",
    subscriber_status: status,
    subscriber_meta: "{}",
  });
  for (const [monitor, subscriptionStatus = "ACTIVE"] of subscriptions) {
    await insert("subscriptions", {
      subscriber_id: id,
      subscriptions_status: subscriptionStatus,
      subscriptions_monitors: monitor,
      subscriptions_meta: "",
    });
  }
  return id;
}

// A Kener 4.0–4.1 subscriber, who followed incidents and/or maintenances.
async function v4Subscriber(email: string, events: Array<[string, string?]>): Promise<number> {
  const userId = await insert("subscriber_users", { email, status: "ACTIVE" });
  const methodId = await insert("subscriber_methods", {
    subscriber_user_id: userId,
    method_type: "email",
    method_value: email,
    status: "ACTIVE",
  });
  for (const [event_type, status = "ACTIVE"] of events) {
    await insert("user_subscriptions_v2", {
      subscriber_user_id: userId,
      subscriber_method_id: methodId,
      event_type,
      status,
    });
  }
  return methodId;
}

// The monitors an email follows (ACTIVE rows), and those it has turned off (INACTIVE rows)
async function monitorsOf(email: string, status = "ACTIVE"): Promise<string[]> {
  const tags: string[] = await knex("subscriber_monitor_subscriptions as msub")
    .join("subscriber_methods as sm", "msub.subscriber_method_id", "sm.id")
    .where("sm.method_value", email)
    .andWhere("msub.status", status)
    .pluck("msub.monitor_tag");
  return tags.sort();
}

async function report(): Promise<Array<{ source: string; subscriber_email: string | null; reason: string }>> {
  return await knex("subscription_migration_report").orderBy("id").select("source", "subscriber_email", "reason");
}

const run = () => up(knex);

beforeAll(async () => {
  await knex.migrate.latest({
    migrationSource: {
      getMigrations: async () => Object.keys(migrations).sort(),
      getMigrationName: (name: string) => name.slice("/migrations/".length),
      getMigration: async (name: string) => migrations[name],
    },
  });
});

beforeEach(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  for (const table of [
    "subscriber_monitor_subscriptions",
    "subscription_migration_report",
    "user_subscriptions_v2",
    "subscriber_methods",
    "subscriber_users",
    "subscriptions",
    "subscribers",
    "monitors",
  ]) {
    await knex(table).del();
  }
  await knex("monitors").insert(
    [
      { tag: "web", name: "Website", status: "ACTIVE", is_hidden: "NO" },
      { tag: "api", name: "Public API", status: "ACTIVE", is_hidden: "NO" },
      { tag: "db", name: "Database", status: "ACTIVE", is_hidden: "NO" },
      { tag: "billing", name: "Billing", status: "ACTIVE", is_hidden: "YES" },
      { tag: "legacy", name: "Legacy", status: "INACTIVE", is_hidden: "NO" },
    ].map((m) => ({ ...m, monitor_type: "NONE", type_data: "{}" })),
  );
});

afterAll(async () => {
  vi.restoreAllMocks();
  await knex.destroy();
});

describe("Kener 3 subscribers", () => {
  it("keeps the email and the monitors each confirmed subscriber chose", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["web"], ["api"]]);

    await run();

    expect(await monitorsOf("ana@example.com")).toEqual(["api", "web"]);
    expect(await GetActiveEmailsForMonitors(["web"])).toEqual(["ana@example.com"]);
    expect(await report()).toEqual([]);
  });

  it.each(["ALL", "_"])("turns %s into every visible active monitor", async (all) => {
    await v3Subscriber("ana@example.com", "ACTIVE", [[all]]);

    await run();

    expect(await monitorsOf("ana@example.com")).toEqual(["api", "db", "web"]);
    expect(await report()).toEqual([]);
  });

  it("copies a subscriber who never confirmed their email, without sending them mail", async () => {
    await v3Subscriber("bo@example.com", "PENDING", [["web"]]);

    await run();

    expect(await monitorsOf("bo@example.com")).toEqual(["web"]);
    expect(await knex("subscriber_users").where("email", "bo@example.com").first()).toMatchObject({
      status: "PENDING",
    });
    expect(await GetActiveEmailsForMonitors(["web"])).toEqual([]);
  });

  it("keeps a turned-off subscription turned off, and reports a monitor that no longer exists", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["web"], ["api", "INACTIVE"], ["gone"]]);

    await run();

    expect(await monitorsOf("ana@example.com")).toEqual(["web"]);
    expect(await monitorsOf("ana@example.com", "INACTIVE")).toEqual(["api"]);
    expect(await report()).toEqual([
      expect.objectContaining({
        source: "v3_subscription",
        subscriber_email: "ana@example.com",
        reason: expect.stringContaining('"gone"'),
      }),
    ]);
  });

  it("finds a monitor written by its name, or several in one value", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["Public API"], ["web,db"]]);

    await run();

    expect(await monitorsOf("ana@example.com")).toEqual(["api", "db", "web"]);
  });

  it("reports a subscriber it cannot copy instead of dropping them", async () => {
    await v3Subscriber("not-an-email", "ACTIVE", [["web"]]);
    const orphan = await v3Subscriber("cy@example.com", "ACTIVE", [["db"]]);
    await knex("subscribers").where("id", orphan).del();

    await run();

    expect(Number((await knex("subscriber_users").count("id as count").first())?.count)).toBe(0);
    expect((await report()).map((r) => r.source).sort()).toEqual(["v3_subscriber", "v3_subscription"]);
  });

  it("makes one subscriber of the same email, and reuses one already in Kener 4", async () => {
    await v3Subscriber("Ana@Example.com", "ACTIVE", [["web"]]);
    // The leading space keeps the two rows apart on MySQL too, whose unique index ignores case.
    await v3Subscriber(" ana@example.com", "PENDING", [["api"]]);
    const v4User = await insert("subscriber_users", { email: "bo@example.com", status: "PENDING" });
    await v3Subscriber("bo@example.com", "ACTIVE", [["db"]]);

    await run();

    const users = await knex("subscriber_users").orderBy("email").select("id", "email", "status");
    expect(users.map((u) => [u.email, u.status])).toEqual([
      ["ana@example.com", "ACTIVE"],
      ["bo@example.com", "ACTIVE"],
    ]);
    expect(users[1].id).toBe(v4User);
    expect(Number((await knex("subscriber_methods").count("id as count").first())?.count)).toBe(2);
    expect(await monitorsOf("ana@example.com")).toEqual(["api", "web"]);
    expect(await monitorsOf("bo@example.com")).toEqual(["db"]);
  });

  it("gives copied subscribers no code anyone could sign in with", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["web"]]);
    await v3Subscriber("bo@example.com", "PENDING", [["web"]]);

    await run();

    for (const email of ["ana@example.com", "bo@example.com"]) {
      expect(await VerifySubscriberOTP(email, null)).toMatchObject({ success: false });
    }
  });

  it("leaves the legacy tables as they were", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["web"], ["gone"]]);
    const before = { subscribers: await knex("subscribers"), subscriptions: await knex("subscriptions") };

    await run();

    expect({ subscribers: await knex("subscribers"), subscriptions: await knex("subscriptions") }).toEqual(before);
  });
});

describe("Kener 4.0–4.1 incident and maintenance subscribers", () => {
  it("subscribes them to every visible active monitor", async () => {
    await v4Subscriber("ana@example.com", [["incidents"], ["maintenances"]]);
    await v4Subscriber("off@example.com", [["incidents", "INACTIVE"]]);

    await run();

    expect(await monitorsOf("ana@example.com")).toEqual(["api", "db", "web"]);
    expect(await monitorsOf("off@example.com")).toEqual([]);
  });
});

describe("running the migration again", () => {
  it("adds no second row, and keeps a monitor the subscriber turned off since", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["web"], ["api"]]);
    await run();
    const method = await knex("subscriber_methods").where("method_value", "ana@example.com").first();
    await db.removeSubscriberMonitors(method.id, ["api"]);

    await run();

    expect(await monitorsOf("ana@example.com")).toEqual(["web"]);
    expect(Number((await knex("subscriber_monitor_subscriptions").count("id as count").first())?.count)).toBe(2);
  });
});

describe("the report in Manage → Subscriptions", () => {
  it("lists what could not be copied, newest first, with the total", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["gone"]]);
    await v3Subscriber("bo@example.com", "ACTIVE", [["also-gone"]]);
    await run();

    const result = await GetSubscriptionMigrationReport(1, 1);

    expect(result).toMatchObject({ total: 2, totalPages: 2, page: 1, limit: 1 });
    expect(result.rows.map((r) => r.subscriber_email)).toEqual(["bo@example.com"]);
  });
});

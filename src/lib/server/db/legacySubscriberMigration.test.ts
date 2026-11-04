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
  GetSubscriberMigrationReview,
  MarkSubscriberMigrationReviewed,
} from "$lib/server/controllers/userSubscriptionsController";
import * as legacyMigration from "../../../../migrations/20261104130000_migrate_legacy_subscribers";

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

async function monitorsOf(email: string): Promise<string[]> {
  const tags: string[] = await knex("subscriber_monitors as smo")
    .join("subscriber_methods as sm", "smo.subscriber_method_id", "sm.id")
    .where("sm.method_value", email)
    .pluck("smo.monitor_tag");
  return tags.sort();
}

async function report(): Promise<Array<{ source: string; email: string | null; outcome: string; details: string }>> {
  return await knex("subscriber_migration_report")
    .whereNot("source", "run")
    .orderBy("id")
    .select("source", "email", "outcome", "details", "monitors_added");
}

const run = () => legacyMigration.up(knex);

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
  await knex.schema.dropTableIfExists("subscriber_migration_report");
  for (const table of [
    "subscriber_monitors",
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
      { tag: "api", name: "API", status: "ACTIVE", is_hidden: "NO" },
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
    expect(await report()).toEqual([expect.objectContaining({ source: "v3", outcome: "MIGRATED", monitors_added: 2 })]);
  });

  it("turns ALL into every public monitor, leaving out hidden and inactive ones", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["ALL"]]);

    await run();

    expect(await monitorsOf("ana@example.com")).toEqual(["api", "db", "web"]);
    const [row] = await report();
    expect(row).toMatchObject({ outcome: "MIGRATED" });
    expect(row.details).toContain("monitors added later are not included");
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

  it("copies what it can and reports the rest for review", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["web"], ["gone"], ["api", "INACTIVE"], ["billing"]]);

    await run();

    expect(await monitorsOf("ana@example.com")).toEqual(["billing", "web"]);
    const [row] = await report();
    expect(row.outcome).toBe("REVIEW");
    expect(row.details).toContain('Monitor "gone" no longer exists');
    expect(row.details).toContain('Subscription to "api" was turned off in Kener 3');
    expect(row.details).toContain('Monitor "billing" is hidden');
  });

  it("reports a subscriber it cannot copy instead of dropping them", async () => {
    await v3Subscriber("not-an-email", "ACTIVE", [["web"]]);
    const orphan = await v3Subscriber("cy@example.com", "ACTIVE", [["db"]]);
    await knex("subscribers").where("id", orphan).del();

    await run();

    expect(Number((await knex("subscriber_users").count("id as count").first())?.count)).toBe(0);
    expect(await report()).toEqual([
      expect.objectContaining({ email: "not-an-email", outcome: "REVIEW", details: expect.stringContaining('"web"') }),
      expect.objectContaining({ email: null, outcome: "REVIEW", details: expect.stringContaining('"db"') }),
    ]);
  });

  it("makes one subscriber of the same email, in any case, and of an email already in Kener 4", async () => {
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

  it("leaves the legacy tables as they were", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["web"], ["gone"]]);
    const before = { subscribers: await knex("subscribers"), subscriptions: await knex("subscriptions") };

    await run();

    expect({ subscribers: await knex("subscribers"), subscriptions: await knex("subscriptions") }).toEqual(before);
  });
});

describe("Kener 4.0–4.1 incident and maintenance subscribers", () => {
  it("subscribes them to every public monitor and marks it as assumed", async () => {
    await v4Subscriber("ana@example.com", [["incidents"], ["maintenances"]]);

    await run();

    expect(await monitorsOf("ana@example.com")).toEqual(["api", "db", "web"]);
    const [row] = await report();
    expect(row).toMatchObject({ source: "v4", email: "ana@example.com", outcome: "ASSUMED", monitors_added: 3 });
    expect(row.details).toContain("Followed all incidents and maintenances");
  });

  it("leaves alone those who turned the mail off or already picked monitors", async () => {
    await v4Subscriber("off@example.com", [["incidents", "INACTIVE"]]);
    const picked = await v4Subscriber("picked@example.com", [["incidents"]]);
    const pickedUser = (await knex("subscriber_methods").where("id", picked).first()).subscriber_user_id;
    await db.addSubscriberMonitors(pickedUser, picked, ["db"]);

    await run();

    expect(await monitorsOf("off@example.com")).toEqual([]);
    expect(await monitorsOf("picked@example.com")).toEqual(["db"]);
    expect((await report()).map((r) => [r.email, r.outcome])).toEqual([
      ["off@example.com", "MIGRATED"],
      ["picked@example.com", "MIGRATED"],
    ]);
  });

  it("widens a Kener 3 subscriber who later followed all incidents to every public monitor", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["web"]]);
    await knex("subscriber_users").insert({ email: "ana@example.com", status: "ACTIVE" });
    const user = await knex("subscriber_users").where("email", "ana@example.com").first();
    const methodId = await insert("subscriber_methods", {
      subscriber_user_id: user.id,
      method_type: "email",
      method_value: "ana@example.com",
      status: "ACTIVE",
    });
    await insert("user_subscriptions_v2", {
      subscriber_user_id: user.id,
      subscriber_method_id: methodId,
      event_type: "incidents",
      status: "ACTIVE",
    });

    await run();

    expect(await monitorsOf("ana@example.com")).toEqual(["api", "db", "web"]);
    expect((await report()).map((r) => [r.source, r.outcome])).toEqual([
      ["v3", "MIGRATED"],
      ["v4", "ASSUMED"],
    ]);
  });
});

describe("running the migration", () => {
  it("copies nothing twice, and keeps a monitor a subscriber dropped since", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["web"], ["api"]]);
    await run();
    const method = await knex("subscriber_methods").where("method_value", "ana@example.com").first();
    await db.removeSubscriberMonitors(method.id, ["api"]);

    await run();

    expect(await monitorsOf("ana@example.com")).toEqual(["web"]);
    expect(await report()).toHaveLength(1);
  });

  it("starts over after a run that stopped before it finished", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["web"]]);
    await run();
    await knex("subscriber_migration_report").where("source", "run").del();
    await knex("subscriber_monitors").del();

    await run();

    expect(await monitorsOf("ana@example.com")).toEqual(["web"]);
    expect(await report()).toHaveLength(1);
    expect(Number((await knex("subscriber_users").count("id as count").first())?.count)).toBe(1);
  });

  it("runs on a database with no legacy subscribers", async () => {
    await run();

    expect(await report()).toEqual([]);
    expect(await knex("subscriber_migration_report").where("source", "run").first()).toMatchObject({
      outcome: "COMPLETE",
    });
  });

  it("logs a summary, and each subscriber to review", async () => {
    await v3Subscriber("ana@example.com", "ACTIVE", [["gone"]]);
    await v4Subscriber("bo@example.com", [["incidents"]]);

    await run();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("1 now follow all public monitors, 1 need review"),
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('ana@example.com: Monitor "gone" no longer exists'),
    );
  });
});

describe("the review list in Manage → Subscriptions", () => {
  it("lists what to review first, then the assumed, and hides them once marked reviewed", async () => {
    await v4Subscriber("bo@example.com", [["incidents"]]);
    await v3Subscriber("ana@example.com", "ACTIVE", [["gone"]]);
    await v3Subscriber("cy@example.com", "ACTIVE", [["web"]]);
    await run();

    const review = await GetSubscriberMigrationReview();
    expect(review).toMatchObject({ review: 1, assumed: 1 });
    expect(review.items.map((i) => [i.email, i.outcome])).toEqual([
      ["ana@example.com", "REVIEW"],
      ["bo@example.com", "ASSUMED"],
    ]);

    expect(await MarkSubscriberMigrationReviewed()).toEqual({ success: true, reviewed: 2 });
    expect(await GetSubscriberMigrationReview()).toEqual({ items: [], review: 0, assumed: 0 });
  });
});

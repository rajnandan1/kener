import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";

// TEST_DATABASE_URL=postgresql://… or mysql://… runs this file on that engine instead of in-memory SQLite.
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
import { GenerateTokenWithExpiry } from "./commonController.js";
import { DeleteMonitorCompletelyUsingTag } from "./monitorsController.js";
import {
  AdminAddSubscriber,
  AdminSetSubscriberMonitors,
  GetActiveEmailsForMonitors,
  GetSubscribableMonitors,
  IsEmailSubscriptionEnabled,
  UpdateSubscriberMonitors,
  VerifySubscriberOTP,
  VerifySubscriberToken,
} from "./userSubscriptionsController.js";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;

// Prefixed so a run on a seeded throwaway database only ever touches its own monitors.
const TAGS = { web: "sub-web", api: "sub-api", db: "sub-db", hidden: "sub-hidden", paused: "sub-paused" };
const MONITORS = [
  { tag: TAGS.web, name: "Website", status: "ACTIVE", is_hidden: "NO" },
  { tag: TAGS.api, name: "API", status: "ACTIVE", is_hidden: "NO" },
  { tag: TAGS.db, name: "Database", status: "ACTIVE", is_hidden: "NO" },
  { tag: TAGS.hidden, name: "Billing", status: "ACTIVE", is_hidden: "YES" },
  { tag: TAGS.paused, name: "Legacy", status: "INACTIVE", is_hidden: "NO" },
];

async function addSubscriber(email: string, tags: string[]): Promise<number> {
  const result = await AdminAddSubscriber(email, tags);
  expect(result.success).toBe(true);
  return result.subscriber!.method_id;
}

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
  await knex("subscriber_monitors").del();
  await knex("subscriber_methods").del();
  await knex("subscriber_users").del();
  await knex("monitors").whereIn("tag", Object.values(TAGS)).del();
  await knex("monitors").insert(MONITORS.map((m) => ({ ...m, monitor_type: "NONE", type_data: "{}" })));
});

afterAll(async () => {
  await knex.destroy();
});

describe("subscribing to monitors", () => {
  it("offers only the active monitors a status page shows", async () => {
    const offered = (await GetSubscribableMonitors()).filter((m) => m.tag.startsWith("sub-"));

    expect(offered).toEqual([
      { tag: TAGS.api, name: "API" },
      { tag: TAGS.db, name: "Database" },
      { tag: TAGS.web, name: "Website" },
    ]);
  });

  it("subscribes to the monitors asked for, leaving out hidden, inactive and unknown ones", async () => {
    const result = await AdminAddSubscriber("Ana@Example.com", [
      TAGS.web,
      TAGS.api,
      TAGS.hidden,
      TAGS.paused,
      "sub-missing",
    ]);

    expect(result.subscriber).toMatchObject({ email: "ana@example.com", monitor_tags: [TAGS.api, TAGS.web] });
  });

  it("keeps one subscription when a monitor is added twice", async () => {
    const methodId = await addSubscriber("ana@example.com", [TAGS.web]);
    const method = (await db.getSubscriberMethodById(methodId))!;

    await db.addSubscriberMonitors(method.subscriber_user_id, methodId, [TAGS.web, TAGS.api]);
    await AdminSetSubscriberMonitors(methodId, [TAGS.web, TAGS.web, TAGS.api]);

    expect(await db.getSubscriberMonitorTags(methodId)).toEqual([TAGS.api, TAGS.web]);
  });

  it("replaces the monitors of a subscriber", async () => {
    const methodId = await addSubscriber("ana@example.com", [TAGS.web, TAGS.api]);

    const result = await AdminSetSubscriberMonitors(methodId, [TAGS.api, TAGS.db]);

    expect(result.monitor_tags).toEqual([TAGS.api, TAGS.db]);
  });

  it("lets a subscriber change their monitors with their token, and drop one that is now hidden", async () => {
    const methodId = await addSubscriber("ana@example.com", [TAGS.web]);
    const method = (await db.getSubscriberMethodById(methodId))!;
    await knex("monitors").where("tag", TAGS.web).update({ is_hidden: "YES" });
    const token = await GenerateTokenWithExpiry(
      {
        subscriber_user_id: method.subscriber_user_id,
        subscriber_method_id: methodId,
        email: "ana@example.com",
        type: "subscriber",
      },
      "1h",
    );

    const result = await UpdateSubscriberMonitors(token, { [TAGS.web]: false, [TAGS.api]: true, [TAGS.hidden]: true });

    expect(result).toEqual({ success: true, monitorTags: [TAGS.api] });
    expect((await VerifySubscriberToken(token)).monitorTags).toEqual([TAGS.api]);
  });

  it("refuses a token that is not a subscriber's", async () => {
    const result = await UpdateSubscriberMonitors("not-a-token", { [TAGS.api]: true });

    expect(result.success).toBe(false);
    expect(Number((await knex("subscriber_monitors").count("id as count").first())?.count)).toBe(0);
  });

  it("drops the subscriptions of a deleted monitor", async () => {
    const methodId = await addSubscriber("ana@example.com", [TAGS.web, TAGS.api]);

    await DeleteMonitorCompletelyUsingTag(TAGS.web);

    expect(await db.getSubscriberMonitorTags(methodId)).toEqual([TAGS.api]);
  });
});

describe("who gets a monitor's mail", () => {
  it("reaches each subscriber of the given monitors once, and no one else", async () => {
    await addSubscriber("ana@example.com", [TAGS.web, TAGS.api]);
    await addSubscriber("bo@example.com", [TAGS.web]);
    await addSubscriber("cy@example.com", [TAGS.db]);

    expect((await GetActiveEmailsForMonitors([TAGS.web, TAGS.api, TAGS.web])).sort()).toEqual([
      "ana@example.com",
      "bo@example.com",
    ]);
    expect(await GetActiveEmailsForMonitors([TAGS.db])).toEqual(["cy@example.com"]);
    expect(await GetActiveEmailsForMonitors([])).toEqual([]);
  });

  it("leaves out inactive subscribers and monitors hidden after they subscribed", async () => {
    const anaMethod = await addSubscriber("ana@example.com", [TAGS.web]);
    const boMethod = await addSubscriber("bo@example.com", [TAGS.api]);
    await addSubscriber("cy@example.com", [TAGS.api]);
    await db.updateSubscriberMethod(boMethod, { status: "INACTIVE" });
    await knex("monitors").where("tag", TAGS.web).update({ is_hidden: "YES" });

    expect(await GetActiveEmailsForMonitors([TAGS.web, TAGS.api])).toEqual(["cy@example.com"]);
    expect(await db.getSubscriberMonitorTags(anaMethod)).toEqual([TAGS.web]);
  });
});

describe("VerifySubscriberOTP", () => {
  const invalid = { success: false, error: "Invalid verification code" };
  const inFiveMinutes = () => new Date(Date.now() + 5 * 60 * 1000);

  // An account an admin added: no code pending until the subscriber asks for one.
  async function subscriber(code: string | null, expiresAt: Date | null): Promise<void> {
    const methodId = await addSubscriber("ana@example.com", [TAGS.web]);
    const method = (await db.getSubscriberMethodById(methodId))!;
    await db.updateSubscriberUser(method.subscriber_user_id, {
      verification_code: code,
      verification_expires_at: expiresAt,
    });
  }

  it("signs in with the code that was mailed, and only once", async () => {
    await subscriber("123456", inFiveMinutes());

    const result = await VerifySubscriberOTP("ana@example.com", "123456");

    expect(result.success).toBe(true);
    expect(await VerifySubscriberToken(result.token!)).toMatchObject({ success: true, monitorTags: [TAGS.web] });
    expect(await VerifySubscriberOTP("ana@example.com", "123456")).toEqual(invalid);
  });

  it.each([null, undefined, 123456, "", "12345", "abcdef", "123456 "])(
    "refuses %j for an account with no code pending",
    async (code) => {
      await subscriber(null, null);

      expect(await VerifySubscriberOTP("ana@example.com", code)).toEqual(invalid);
    },
  );

  it("refuses a wrong code, a code with no expiry, and an expired one", async () => {
    await subscriber("123456", inFiveMinutes());
    expect(await VerifySubscriberOTP("ana@example.com", "654321")).toEqual(invalid);

    await subscriber("123456", null);
    expect(await VerifySubscriberOTP("ana@example.com", "123456")).toEqual(invalid);

    await subscriber("123456", new Date(Date.now() - 1000));
    expect(await VerifySubscriberOTP("ana@example.com", "123456")).toEqual({
      success: false,
      error: "Verification code expired",
    });
  });

  it("answers an unknown email as it answers a wrong code", async () => {
    expect(await VerifySubscriberOTP("nobody@example.com", "123456")).toEqual(invalid);
  });
});

describe("IsEmailSubscriptionEnabled", () => {
  it.each([
    [{ enable: true, methods: { emails: { monitors: true } } }, true],
    [{ enable: true, methods: { emails: { monitors: false, incidents: true } } }, false],
    [{ enable: false, methods: { emails: { monitors: true } } }, false],
    // Saved before monitor subscriptions: either old flag keeps them on.
    [{ enable: true, methods: { emails: { incidents: false, maintenances: true } } }, true],
    [{ enable: true, methods: { emails: { incidents: false, maintenances: false } } }, false],
    [null, false],
  ])("%j → %s", (settings, enabled) => {
    expect(IsEmailSubscriptionEnabled(settings)).toBe(enabled);
  });
});

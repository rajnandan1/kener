import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

const { hourlyJob } = vi.hoisted(() => ({
  hourlyJob: { run: (async () => {}) as (job: unknown) => Promise<unknown> },
}));
vi.mock("$lib/server/cache/cache", () => ({
  getCache: async (_key: string, fetcher?: () => unknown) => (fetcher ? await fetcher() : null),
  setCache: async () => {},
  deleteCache: async () => {},
}));
vi.mock("$lib/server/queues/subscriberQueue", () => ({ default: { push: vi.fn() } }));
vi.mock("$lib/server/queues/alertingQueue", () => ({ default: { push: vi.fn() } }));
vi.mock("$lib/server/queues/q", () => ({
  default: {
    createQueue: () => ({ upsertJobScheduler: async () => {} }),
    createWorker: (_queue: unknown, processor: (job: unknown) => Promise<unknown>) => {
      hourlyJob.run = processor;
      return { on: () => {}, close: async () => {} };
    },
  },
}));

import db from "$lib/server/db/db";
import {
  CreateMaintenance,
  UpdateMaintenance,
  UpdateMaintenanceEventStatuses,
} from "$lib/server/controllers/maintenanceController";
import subscriberQueue from "$lib/server/queues/subscriberQueue";
import scheduler from "./maintenanceScheduler";
import { seed as seedSiteData } from "../../../../seeds/site_data";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const knex = (db as unknown as { knex: Knex }).knex;
const NEW_YORK = "America/New_York";
const HOUR = 3600;
const DAY = 24 * HOUR;

const seconds = (iso: string) => Date.parse(iso) / 1000;
const setClock = (iso: string) => vi.setSystemTime(new Date(iso));
const hourlyRun = async (iso: string) => {
  setClock(iso);
  await hourlyJob.run({});
};

const wallClock = (startDateTime: number, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(new Date(startDateTime * 1000))
    .replace(/ /g, " ");

const eventRows = (id: number) => knex("maintenances_events").where({ maintenance_id: id }).orderBy("start_date_time");
const eventTimes = async (id: number, timeZone: string) =>
  (await eventRows(id)).map((event) => wallClock(event.start_date_time, timeZone));

const createMaintenance = async (start: string, rrule: string, timezone?: string) =>
  (
    await CreateMaintenance({
      title: "Patch window",
      start_date_time: seconds(start),
      rrule,
      duration_seconds: 1800,
      ...(timezone ? { timezone } : {}),
    })
  ).maintenance_id;

beforeAll(async () => {
  await knex.migrate.latest({
    migrationSource: {
      getMigrations: async () => Object.keys(migrations).sort(),
      getMigrationName: (name: string) => name.slice("/migrations/".length),
      getMigration: async (name: string) => migrations[name],
    },
  });
  await knex("site_data").del();
  await seedSiteData(knex);
  await scheduler.start();
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await knex("maintenances_events").del();
  await knex("maintenances").del();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await knex.destroy();
});

describe("a recurring maintenance with a timezone keeps its local time (issue 917)", () => {
  it("runs Every Monday at 10:00 AM New York at 10:00 AM after clocks go back on Nov 1, 2026", async () => {
    setClock("2026-10-25T12:00:00Z");
    const id = await createMaintenance("2026-10-05T14:00:00Z", "FREQ=WEEKLY;BYDAY=MO", NEW_YORK);

    await hourlyRun("2026-10-27T12:00:00Z");

    expect(await eventTimes(id, NEW_YORK)).toEqual(["Mon, Oct 26, 10:00 AM", "Mon, Nov 2, 10:00 AM"]);
  });

  it("runs Every Monday at 10:00 AM New York at 10:00 AM after clocks go forward on Mar 8, 2026", async () => {
    setClock("2026-03-01T12:00:00Z");
    const id = await createMaintenance("2026-02-02T15:00:00Z", "FREQ=WEEKLY;BYDAY=MO", NEW_YORK);

    await hourlyRun("2026-03-03T12:00:00Z");

    expect(await eventTimes(id, NEW_YORK)).toEqual(["Mon, Mar 2, 10:00 AM", "Mon, Mar 9, 10:00 AM"]);
  });

  it("runs Every Monday at 10:00 PM New York on Monday night, not Sunday night", async () => {
    setClock("2026-10-07T12:00:00Z");
    const id = await createMaintenance("2026-10-06T02:00:00Z", "FREQ=WEEKLY;BYDAY=MO", NEW_YORK);

    await hourlyRun("2026-10-08T12:00:00Z");

    expect(await eventTimes(id, NEW_YORK)).toEqual(["Mon, Oct 12, 10:00 PM"]);
  });
});

describe("a maintenance without a timezone repeats in UTC as before", () => {
  it("keeps 14:00 UTC across Nov 1, 2026, which moves to 9:00 AM New York", async () => {
    setClock("2026-10-25T12:00:00Z");
    const id = await createMaintenance("2026-10-05T14:00:00Z", "FREQ=WEEKLY;BYDAY=MO");

    await hourlyRun("2026-10-27T12:00:00Z");

    expect(await eventTimes(id, NEW_YORK)).toEqual(["Mon, Oct 26, 10:00 AM", "Mon, Nov 2, 9:00 AM"]);
  });

  it("still reads BYDAY on the UTC date, so a Monday 10:00 PM New York start fires on Sunday night", async () => {
    setClock("2026-10-07T12:00:00Z");
    const id = await createMaintenance("2026-10-06T02:00:00Z", "FREQ=WEEKLY;BYDAY=MO");

    await hourlyRun("2026-10-08T12:00:00Z");

    expect(await eventTimes(id, NEW_YORK)).toEqual(["Sun, Oct 11, 10:00 PM"]);
  });
});

describe("the hourly scheduler", () => {
  const atNoon = "FREQ=DAILY";

  it("creates no second event on the next hourly run", async () => {
    setClock("2026-10-29T12:00:00Z");
    const id = await createMaintenance("2026-10-20T14:00:00Z", atNoon, NEW_YORK);

    await hourlyRun("2026-10-29T13:00:00Z");
    const firstRun = await eventRows(id);
    expect(firstRun.every((event) => event.end_date_time === event.start_date_time + 1800)).toBe(true);
    expect(await hourlyJob.run({})).toMatchObject({ total: 1, eventsCreated: 0 });
    await hourlyRun("2026-10-29T14:30:00Z");
    await hourlyRun("2026-10-29T15:00:00Z");

    expect(firstRun).toHaveLength(7);
    expect((await eventRows(id)).map((event) => event.start_date_time)).toEqual([
      ...firstRun.map((event) => event.start_date_time),
      seconds("2026-11-05T15:00:00Z"),
    ]);
  });

  it("includes an occurrence exactly 7 days ahead and leaves the next second for a later run", async () => {
    setClock("2026-10-29T13:59:59Z");
    const id = await createMaintenance("2026-11-05T15:00:00Z", "FREQ=DAILY;COUNT=2", NEW_YORK);
    await knex("maintenances_events").where({ maintenance_id: id }).del();

    await hourlyRun("2026-10-29T14:59:59Z");
    expect(await eventRows(id)).toHaveLength(0);

    await hourlyRun("2026-10-29T15:00:00Z");
    expect((await eventRows(id)).map((event) => event.start_date_time)).toEqual([seconds("2026-11-05T15:00:00Z")]);
  });

  it("uses a window of 168 hours across a clock change on every server timezone", async () => {
    setClock("2026-10-29T14:00:00Z");
    const id = await createMaintenance("2026-11-05T15:00:01Z", "FREQ=DAILY;COUNT=2", NEW_YORK);
    await knex("maintenances_events").where({ maintenance_id: id }).del();

    await hourlyRun("2026-10-29T15:00:00Z");

    expect(await eventRows(id)).toHaveLength(0);
  });

  it("creates one event for a repeated local time and one for a missing local time", async () => {
    setClock("2026-10-30T00:00:00Z");
    const repeated = await createMaintenance("2026-10-20T05:30:00Z", atNoon, NEW_YORK);
    setClock("2026-03-07T00:00:00Z");
    const missing = await createMaintenance("2026-03-01T07:30:00Z", "FREQ=DAILY;BYHOUR=2,3;BYMINUTE=30", NEW_YORK);

    await hourlyRun("2026-03-08T01:00:00Z");
    await knex("maintenances_events").where({ maintenance_id: repeated }).del();
    await hourlyRun("2026-10-30T12:00:00Z");

    const times = await eventTimes(repeated, NEW_YORK);
    expect(times.filter((time) => time.startsWith("Sun, Nov 1"))).toEqual(["Sun, Nov 1, 1:30 AM"]);
    const gapDay = (await eventRows(missing)).filter(
      (event) => event.start_date_time === seconds("2026-03-08T07:30:00Z"),
    );
    expect(gapDay).toHaveLength(1);
  });

  it("stops at an UNTIL instant", async () => {
    setClock("2026-10-30T00:00:00Z");
    const id = await createMaintenance("2026-10-20T14:00:00Z", "FREQ=DAILY;UNTIL=20261102T150000Z", NEW_YORK);

    await hourlyRun("2026-10-30T01:00:00Z");

    expect((await eventTimes(id, NEW_YORK)).at(-1)).toBe("Mon, Nov 2, 10:00 AM");
    expect(await eventRows(id)).toHaveLength(4);
  });

  it("reads a local time in every occurrence after a timezone is added to an existing maintenance", async () => {
    setClock("2026-10-25T12:00:00Z");
    const id = await createMaintenance("2026-10-05T14:00:00Z", "FREQ=WEEKLY;BYDAY=MO");

    await UpdateMaintenance(id, { timezone: NEW_YORK });
    await hourlyRun("2026-10-27T12:00:00Z");

    expect(await eventTimes(id, NEW_YORK)).toEqual(["Mon, Oct 26, 10:00 AM", "Mon, Nov 2, 10:00 AM"]);
  });
});

describe("UpdateMaintenance with a timezone", () => {
  const weekly = "FREQ=WEEKLY;BYDAY=MO";
  const ongoing = async (id: number) => (await eventRows(id)).filter((event) => event.status === "ONGOING");

  it("replaces a READY event when the timezone changes, so no old event stays 1 hour beside a new one", async () => {
    setClock("2026-11-02T12:00:00Z");
    const id = await createMaintenance("2026-07-06T14:00:00Z", "FREQ=DAILY");
    await hourlyRun("2026-11-02T13:30:00Z");
    await UpdateMaintenanceEventStatuses();
    expect((await eventRows(id)).slice(0, 2).map((event) => event.status)).toEqual(["READY", "SCHEDULED"]);

    await UpdateMaintenance(id, { timezone: NEW_YORK });
    await hourlyRun("2026-11-02T13:40:00Z");

    const times = await eventTimes(id, NEW_YORK);
    expect(times.at(0)).toBe("Mon, Nov 2, 10:00 AM");
    expect(times.filter((time) => !time.endsWith("10:00 AM"))).toEqual([]);
  });

  it("keeps an event that has already started", async () => {
    setClock("2026-07-06T12:00:00Z");
    const id = await createMaintenance("2026-07-06T14:00:00Z", weekly, NEW_YORK);
    setClock("2026-07-06T14:10:00Z");
    await UpdateMaintenanceEventStatuses();

    await UpdateMaintenance(id, { timezone: "America/Chicago" });

    expect(await ongoing(id)).toHaveLength(1);
    expect((await ongoing(id))[0].start_date_time).toBe(seconds("2026-07-06T14:00:00Z"));
  });

  it("does not touch events when the timezone stays the same", async () => {
    setClock("2026-07-06T12:00:00Z");
    const id = await createMaintenance("2026-07-06T14:00:00Z", weekly, NEW_YORK);
    const before = await eventRows(id);

    await UpdateMaintenance(id, { timezone: NEW_YORK, title: "Renamed" });

    expect(await eventRows(id)).toEqual(before);
  });

  it.each([null, "", "   "])("clears the timezone with %j and repeats in UTC again", async (timezone) => {
    setClock("2026-10-25T12:00:00Z");
    const id = await createMaintenance("2026-10-05T14:00:00Z", weekly, NEW_YORK);

    await UpdateMaintenance(id, { timezone });
    await hourlyRun("2026-10-27T12:00:00Z");

    expect((await db.getMaintenanceById(id))?.timezone).toBeNull();
    expect(await eventTimes(id, NEW_YORK)).toEqual(["Mon, Oct 26, 10:00 AM", "Mon, Nov 2, 9:00 AM"]);
  });

  it("treats an empty timezone on a row with no timezone as no change", async () => {
    setClock("2026-07-06T12:00:00Z");
    const id = await createMaintenance("2026-07-06T14:00:00Z", weekly);
    const before = await eventRows(id);

    await UpdateMaintenance(id, { timezone: "" });

    expect(await eventRows(id)).toEqual(before);
  });

  it("keeps the event of a one-time maintenance, because a timezone does not move it", async () => {
    setClock("2026-07-06T12:00:00Z");
    const id = await createMaintenance("2026-07-10T14:00:00Z", "FREQ=MINUTELY;COUNT=1");
    const before = await eventRows(id);

    await UpdateMaintenance(id, { timezone: NEW_YORK });

    expect(await eventRows(id)).toEqual(before);
  });

  it("rejects an unknown timezone and changes nothing", async () => {
    setClock("2026-07-06T12:00:00Z");
    const id = await createMaintenance("2026-07-06T14:00:00Z", weekly, NEW_YORK);

    await expect(UpdateMaintenance(id, { timezone: "Mars/Olympus_Mons" })).rejects.toThrow(/Mars\/Olympus_Mons/);
    expect((await db.getMaintenanceById(id))?.timezone).toBe(NEW_YORK);
    await expect(
      CreateMaintenance({
        title: "Bad zone",
        start_date_time: seconds("2026-07-06T14:00:00Z"),
        rrule: weekly,
        duration_seconds: 60,
        timezone: "Mars/Olympus_Mons",
      }),
    ).rejects.toThrow(/Mars\/Olympus_Mons/);
    expect(await knex("maintenances").where({ title: "Bad zone" })).toHaveLength(0);
  });
});

describe("CreateMaintenance", () => {
  const fields = { title: "Patch", start_date_time: seconds("2026-07-10T14:00:00Z"), rrule: "FREQ=DAILY" };

  beforeEach(() => {
    setClock("2026-07-06T12:00:00Z");
    vi.mocked(subscriberQueue.push).mockClear();
  });

  it.each([
    ["title", { title: "" }, "Title is required"],
    ["start", { start_date_time: 0 }, "Start date/time is required"],
    ["rrule", { rrule: "" }, "RRULE is required"],
    ["a missing duration", { duration_seconds: 0 }, "Duration must be greater than 0"],
    ["a negative duration", { duration_seconds: -1 }, "Duration must be greater than 0"],
  ])("rejects %s", async (_name, change, message) => {
    await expect(CreateMaintenance({ ...fields, duration_seconds: 60, ...change })).rejects.toThrow(message);
  });

  it("keeps a one-second duration, the description, the global flag and one monitor", async () => {
    await knex("monitors").where({ tag: "patch-api" }).del();
    await knex("monitors").insert({
      tag: "patch-api",
      name: "API",
      status: "ACTIVE",
      monitor_type: "NONE",
      type_data: "{}",
      cron: "* * * * *",
    });
    const { maintenance_id: id } = await CreateMaintenance({
      ...fields,
      duration_seconds: 1,
      description: "Kernel patches",
      is_global: "NO",
      monitors: [{ monitor_tag: "patch-api", monitor_impact: "DOWN" }],
    });

    expect(await db.getMaintenanceById(id)).toMatchObject({ description: "Kernel patches", is_global: "NO" });
    expect((await eventRows(id))[0]).toMatchObject({ end_date_time: seconds("2026-07-10T14:00:01Z") });
    expect(await db.getMaintenanceMonitors(id)).toMatchObject([{ monitor_tag: "patch-api", monitor_impact: "DOWN" }]);

    await UpdateMaintenance(id, { monitors: [] });
    expect(await db.getMaintenanceMonitors(id)).toEqual([]);
    await UpdateMaintenance(id, { monitors: [{ monitor_tag: "patch-api", monitor_impact: "DEGRADED" }] });
    expect(await db.getMaintenanceMonitors(id)).toMatchObject([{ monitor_impact: "DEGRADED" }]);
    await knex("maintenance_monitors").where({ maintenance_id: id }).del();
    await knex("monitors").where({ tag: "patch-api" }).del();
  });

  it("sends the description in the created notification when that setting is on", async () => {
    const key = "globalMaintenanceNotificationSettings";
    const row = await knex("site_data").where({ key }).first();
    const settings = JSON.parse(row.value);
    const value = JSON.stringify({ ...settings, event_types: { ...settings.event_types, created: true } });
    await knex("site_data").where({ key }).update({ value });

    await CreateMaintenance({ ...fields, duration_seconds: 60, description: "Kernel patches" });
    await hourlyRun("2026-07-06T12:30:00Z");
    await knex("site_data").where({ key }).update({ value: row.value });

    const notifications = vi.mocked(subscriberQueue.push).mock.calls.map((call) => JSON.stringify(call));
    expect(notifications.length).toBeGreaterThan(1);
    expect(notifications.filter((text) => !text.includes("Kernel patches"))).toEqual([]);
  });

  it("defaults the description to null and the global flag to YES", async () => {
    const { maintenance_id: id } = await CreateMaintenance({ ...fields, duration_seconds: 60 });

    expect(await db.getMaintenanceById(id)).toMatchObject({ description: null, is_global: "YES" });
  });
});

describe("a one-time maintenance", () => {
  const oneTime = "FREQ=MINUTELY;COUNT=1";

  beforeEach(() => {
    setClock("2026-07-06T12:00:00Z");
  });

  it("creates its event at the start time", async () => {
    const id = await createMaintenance("2026-07-10T14:00:00Z", oneTime);

    expect((await eventRows(id)).map((event) => event.start_date_time)).toEqual([seconds("2026-07-10T14:00:00Z")]);
  });

  it("creates an event for a start up to 1 day ago and none for an older start", async () => {
    const dayOld = await createMaintenance("2026-07-05T12:00:00Z", oneTime);
    const older = await createMaintenance("2026-07-05T11:59:59Z", oneTime);

    expect(await eventRows(dayOld)).toHaveLength(1);
    expect(await eventRows(older)).toHaveLength(0);
  });

  it.each([
    ["SCHEDULED", 1],
    ["READY", 1],
    ["ONGOING", 1],
    ["COMPLETED", 2],
    ["CANCELLED", 2],
  ])("moving it replaces a %s event or keeps the event as history", async (status, rows) => {
    const id = await createMaintenance("2026-07-10T14:00:00Z", oneTime);
    await knex("maintenances_events").where({ maintenance_id: id }).update({ status });

    await UpdateMaintenance(id, { start_date_time: seconds("2026-07-11T14:00:00Z") });

    const events = await eventRows(id);
    expect(events).toHaveLength(rows);
    expect(events.at(-1)?.start_date_time).toBe(seconds("2026-07-11T14:00:00Z"));
  });
});

describe("a schedule change on a recurring maintenance", () => {
  const daily = "FREQ=DAILY";
  const start = "2026-07-06T14:00:00Z";
  const nextStart = seconds("2026-07-07T14:00:00Z");

  beforeEach(() => {
    setClock("2026-07-06T15:00:00Z");
  });

  it.each([
    ["start_date_time", { start_date_time: seconds("2026-07-06T16:00:00Z") }, seconds("2026-07-06T16:00:00Z")],
    ["rrule", { rrule: "FREQ=DAILY;INTERVAL=2" }, seconds("2026-07-08T14:00:00Z")],
    ["duration_seconds", { duration_seconds: 7200 }, nextStart],
  ])("replaces the next event when only %s changes", async (_field, change, wanted) => {
    const id = await createMaintenance(start, daily);
    const [before] = await eventRows(id);

    await UpdateMaintenance(id, change);

    const [after] = await eventRows(id);
    expect(after.start_date_time).toBe(wanted);
    expect(after.id).not.toBe(before.id);
  });

  it("does not recreate a cancelled occurrence", async () => {
    const id = await createMaintenance(start, daily);
    await knex("maintenances_events").where({ maintenance_id: id }).update({ status: "CANCELLED" });

    await UpdateMaintenance(id, { duration_seconds: 7200 });

    expect(await eventRows(id)).toMatchObject([{ start_date_time: nextStart, status: "CANCELLED" }]);
  });

  it.each([
    ["SCHEDULED, already started", "SCHEDULED", -60],
    ["READY, starting this second", "READY", 0],
    ["ONGOING", "ONGOING", -60],
    ["COMPLETED", "COMPLETED", 3600],
  ])("keeps a %s event", async (_name, status, offset) => {
    const id = await createMaintenance(start, daily);
    const kept = seconds("2026-07-06T15:00:00Z") + offset;
    await knex("maintenances_events").where({ maintenance_id: id }).update({ status, start_date_time: kept });

    await UpdateMaintenance(id, { duration_seconds: 7200 });

    const starts = (await eventRows(id)).map((event) => event.start_date_time);
    expect(starts).toContain(kept);
    expect(starts).toContain(nextStart);
  });
});

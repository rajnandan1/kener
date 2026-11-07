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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOccurrences,
  isValidRrule,
  isValidTimezone,
  startToWallClock,
  wallClockToStart,
} from "./maintenanceOccurrences";

const NEW_YORK = "America/New_York";
const BERLIN = "Europe/Berlin";
const LORD_HOWE = "Australia/Lord_Howe";
const DAY_MS = 86_400_000;

const seconds = (iso: string) => Date.parse(iso) / 1000;
const iso = (dates: Date[]) => dates.map((date) => date.toISOString().replace(":00.000Z", "Z"));
const between = (rrule: string, start: string, timezone: string | null, from: string, to: string) =>
  iso(getOccurrences({ start_date_time: seconds(start), rrule, timezone }, new Date(from), { to: new Date(to) }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getOccurrences in a timezone", () => {
  const weekly = "FREQ=WEEKLY;BYDAY=MO";
  const daily = "FREQ=DAILY";

  it.each([
    {
      name: "keeps Monday 10:00 AM New York across Nov 1, 2026",
      now: "2026-10-20T00:00:00Z",
      rrule: weekly,
      start: "2026-10-05T14:00:00Z",
      timezone: NEW_YORK,
      to: "2026-11-10T00:00:00Z",
      want: ["2026-10-26T14:00Z", "2026-11-02T15:00Z", "2026-11-09T15:00Z"],
    },
    {
      name: "keeps Monday 10:00 AM New York across Mar 8, 2026",
      now: "2026-03-01T00:00:00Z",
      rrule: weekly,
      start: "2026-02-02T15:00:00Z",
      timezone: NEW_YORK,
      to: "2026-03-17T00:00:00Z",
      want: ["2026-03-02T15:00Z", "2026-03-09T14:00Z", "2026-03-16T14:00Z"],
    },
    {
      name: "reads BYDAY on the local date for Monday 10:00 PM New York",
      now: "2026-10-07T00:00:00Z",
      rrule: weekly,
      start: "2026-10-06T02:00:00Z",
      timezone: NEW_YORK,
      to: "2026-11-04T00:00:00Z",
      want: ["2026-10-13T02:00Z", "2026-10-20T02:00Z", "2026-10-27T02:00Z", "2026-11-03T03:00Z"],
    },
    {
      name: "runs a missing 02:30 New York at 3:30 AM EDT, and goes back to 02:30",
      now: "2026-03-07T00:00:00Z",
      rrule: daily,
      start: "2026-03-01T07:30:00Z",
      timezone: NEW_YORK,
      to: "2026-03-10T00:00:00Z",
      want: ["2026-03-07T07:30Z", "2026-03-08T07:30Z", "2026-03-09T06:30Z"],
    },
    {
      name: "runs a missing 02:30 Berlin at 3:30 AM CEST",
      now: "2026-03-28T00:00:00Z",
      rrule: daily,
      start: "2026-03-20T01:30:00Z",
      timezone: BERLIN,
      to: "2026-03-31T00:00:00Z",
      want: ["2026-03-28T01:30Z", "2026-03-29T01:30Z", "2026-03-30T00:30Z"],
    },
    {
      name: "runs a repeated 01:30 New York once, at the first occurrence (EDT)",
      now: "2026-10-31T00:00:00Z",
      rrule: daily,
      start: "2026-10-20T05:30:00Z",
      timezone: NEW_YORK,
      to: "2026-11-03T00:00:00Z",
      want: ["2026-10-31T05:30Z", "2026-11-01T05:30Z", "2026-11-02T06:30Z"],
    },
    {
      name: "runs a repeated 02:30 Berlin once, at the first occurrence (CEST)",
      now: "2026-10-24T00:00:00Z",
      rrule: daily,
      start: "2026-10-20T00:30:00Z",
      timezone: BERLIN,
      to: "2026-10-27T00:00:00Z",
      want: ["2026-10-24T00:30Z", "2026-10-25T00:30Z", "2026-10-26T01:30Z"],
    },
    {
      name: "shifts a missing 02:15 Lord Howe by the 30-minute gap",
      now: "2026-10-03T00:00:00Z",
      rrule: daily,
      start: "2026-09-20T15:45:00Z",
      timezone: LORD_HOWE,
      to: "2026-10-05T00:00:00Z",
      want: ["2026-10-03T15:45Z", "2026-10-04T15:15Z"],
    },
    {
      name: "reads BYHOUR as local hours",
      now: "2026-10-31T00:00:00Z",
      rrule: "FREQ=DAILY;BYHOUR=6,18;BYMINUTE=0",
      start: "2026-10-20T10:00:00Z",
      timezone: NEW_YORK,
      to: "2026-11-02T12:00:00Z",
      want: ["2026-10-31T10:00Z", "2026-10-31T22:00Z", "2026-11-01T11:00Z", "2026-11-01T23:00Z", "2026-11-02T11:00Z"],
    },
    {
      name: "merges two local times that land on one instant in a gap",
      now: "2026-03-08T00:00:00Z",
      rrule: "FREQ=DAILY;BYHOUR=2,3;BYMINUTE=30",
      start: "2026-03-01T07:30:00Z",
      timezone: NEW_YORK,
      to: "2026-03-09T00:00:00Z",
      want: ["2026-03-08T07:30Z"],
    },
    {
      name: "treats UNTIL with Z as an instant and keeps the occurrence on it",
      now: "2026-10-30T00:00:00Z",
      rrule: "FREQ=DAILY;UNTIL=20261101T053000Z",
      start: "2026-10-20T05:30:00Z",
      timezone: NEW_YORK,
      to: "2026-11-10T00:00:00Z",
      want: ["2026-10-30T05:30Z", "2026-10-31T05:30Z", "2026-11-01T05:30Z"],
    },
    {
      name: "compares UNTIL with Z in the repeated hour against the instant, not the local time",
      now: "2026-11-01T00:00:00Z",
      rrule: "FREQ=DAILY;BYHOUR=1;BYMINUTE=45;UNTIL=20261101T063000Z",
      start: "2026-10-20T05:45:00Z",
      timezone: NEW_YORK,
      to: "2026-11-10T00:00:00Z",
      want: ["2026-11-01T05:45Z"],
    },
    {
      name: "keeps a local UNTIL local to the timezone",
      now: "2026-10-30T00:00:00Z",
      rrule: "FREQ=DAILY;UNTIL=20261031T013000",
      start: "2026-10-20T05:30:00Z",
      timezone: NEW_YORK,
      to: "2026-11-10T00:00:00Z",
      want: ["2026-10-30T05:30Z", "2026-10-31T05:30Z"],
    },
  ])("$name", ({ now, rrule, start, timezone, to, want }) => {
    vi.setSystemTime(new Date(now));
    expect(between(rrule, start, timezone, now, to)).toEqual(want);
  });
});

describe("getOccurrences without a timezone", () => {
  it.each([
    {
      name: "repeats at one UTC time across Nov 1, 2026",
      rrule: "FREQ=WEEKLY;BYDAY=MO",
      start: "2026-10-05T14:00:00Z",
      want: ["2026-10-26T14:00Z", "2026-11-02T14:00Z"],
    },
    {
      name: "reads BYDAY on the UTC date",
      rrule: "FREQ=WEEKLY;BYDAY=MO",
      start: "2026-10-06T02:00:00Z",
      want: ["2026-10-26T02:00Z", "2026-11-02T02:00Z"],
    },
  ])("$name", ({ rrule, start, want }) => {
    for (const timezone of [null, undefined, ""]) {
      expect(
        iso(
          getOccurrences({ start_date_time: seconds(start), rrule, timezone }, new Date("2026-10-20T00:00:00Z"), {
            to: new Date("2026-11-08T00:00:00Z"),
          }),
        ),
      ).toEqual(want);
    }
  });
});

describe("getOccurrences range", () => {
  const schedule = { start_date_time: seconds("2026-10-05T14:00:00Z"), rrule: "FREQ=DAILY", timezone: NEW_YORK };
  const onOccurrence = new Date("2026-10-26T14:00:00Z");

  it("includes an occurrence on `from` and on `to`", () => {
    const to = new Date(onOccurrence.getTime() + 7 * DAY_MS);
    expect(getOccurrences(schedule, onOccurrence, { to })).toHaveLength(7);
    expect(getOccurrences(schedule, onOccurrence, { to }).at(0)).toEqual(onOccurrence);
    expect(iso(getOccurrences(schedule, onOccurrence, { to })).at(-1)).toBe("2026-11-01T15:00Z");
  });

  it("leaves out an occurrence one second past either end", () => {
    const from = new Date(onOccurrence.getTime() + 1000);
    const to = new Date("2026-11-02T14:59:59Z");
    expect(iso(getOccurrences(schedule, from, { to })).at(0)).toBe("2026-10-27T14:00Z");
    expect(iso(getOccurrences(schedule, from, { to })).at(-1)).toBe("2026-11-01T15:00Z");
  });

  it("returns the next `limit` occurrences from `from`", () => {
    expect(iso(getOccurrences(schedule, onOccurrence, { limit: 2 }))).toEqual([
      "2026-10-26T14:00Z",
      "2026-10-27T14:00Z",
    ]);
  });

  describe("when a gap puts instants out of local order", () => {
    // 02:00 and 02:40 are missing and move to 03:00 and 03:40 EDT, so 02:40 lands after the real 03:20.
    const gap = {
      start_date_time: seconds("2026-03-08T06:20:00Z"),
      rrule: "FREQ=MINUTELY;INTERVAL=40",
      timezone: NEW_YORK,
    };
    const from = new Date("2026-03-08T06:20:00Z");

    it("returns a window in ascending order", () => {
      expect(iso(getOccurrences(gap, from, { to: new Date("2026-03-08T08:00:00Z") }))).toEqual([
        "2026-03-08T06:20Z",
        "2026-03-08T07:00Z",
        "2026-03-08T07:20Z",
        "2026-03-08T07:40Z",
        "2026-03-08T08:00Z",
      ]);
    });

    it("keeps walking past `to` until the gap ends", () => {
      expect(iso(getOccurrences(gap, from, { to: new Date("2026-03-08T07:30:00Z") }))).toEqual([
        "2026-03-08T06:20Z",
        "2026-03-08T07:00Z",
        "2026-03-08T07:20Z",
      ]);
    });

    it("keeps walking past `limit` until the gap ends", () => {
      const steps = { ...gap, start_date_time: seconds("2026-03-08T06:50:00Z"), rrule: "FREQ=MINUTELY;INTERVAL=25" };
      expect(iso(getOccurrences(steps, new Date("2026-03-08T07:00:00Z"), { limit: 1 }))).toEqual(["2026-03-08T07:05Z"]);
    });

    it("picks the earliest instants for `limit`, not the first local times", () => {
      expect(iso(getOccurrences(gap, from, { limit: 3 }))).toEqual([
        "2026-03-08T06:20Z",
        "2026-03-08T07:00Z",
        "2026-03-08T07:20Z",
      ]);
    });
  });

  it("stops at `limit` right away when no clock change is near", () => {
    const formatToParts = vi.spyOn(Intl.DateTimeFormat.prototype, "formatToParts");
    const everyMinute = { ...schedule, rrule: "FREQ=MINUTELY", start_date_time: seconds("2026-07-01T00:00:00Z") };

    const found = getOccurrences(everyMinute, new Date("2026-07-01T00:00:00Z"), { limit: 2 });

    expect(iso(found)).toEqual(["2026-07-01T00:00Z", "2026-07-01T00:01Z"]);
    expect(formatToParts.mock.calls.length).toBeLessThan(40);
    formatToParts.mockRestore();
  });

  it("stops at `to` right away when no clock change is near", () => {
    const formatToParts = vi.spyOn(Intl.DateTimeFormat.prototype, "formatToParts");
    const everyMinute = { ...schedule, rrule: "FREQ=MINUTELY", start_date_time: seconds("2026-07-01T00:00:00Z") };
    const to = new Date("2026-07-01T00:01:00Z");

    expect(getOccurrences(everyMinute, new Date("2026-07-01T00:00:00Z"), { to })).toHaveLength(2);
    expect(formatToParts.mock.calls.length).toBeLessThan(40);
    formatToParts.mockRestore();
  });

  it("honors `to` at the epoch", () => {
    const old = { start_date_time: -2 * 86_400, rrule: "FREQ=DAILY;COUNT=5" };
    expect(getOccurrences(old, new Date(-3 * DAY_MS), { to: new Date(0) })).toHaveLength(3);
  });

  it("ends a finite rule with fewer than `limit` occurrences", () => {
    const finite = { ...schedule, rrule: "FREQ=DAILY;COUNT=2" };
    expect(iso(getOccurrences(finite, new Date("2026-10-06T00:00:00Z"), { limit: 5 }))).toEqual(["2026-10-06T14:00Z"]);
  });

  it("throws on an invalid rule", () => {
    expect(() => getOccurrences({ ...schedule, rrule: "FREQ=NOPE" }, onOccurrence, { limit: 1 })).toThrow();
  });
});

describe("isValidRrule", () => {
  it.each(["FREQ=DAILY", "FREQ=WEEKLY;BYDAY=MO", "FREQ=DAILY;UNTIL=20261231T235959Z", "FREQ=MINUTELY;COUNT=1"])(
    "accepts %s",
    (rrule) => {
      expect(isValidRrule(rrule)).toBe(true);
    },
  );

  it.each(["FREQ=NOPE", "NOPE=1", "FREQ=WEEKLY;BYDAY=XX1"])("rejects %s", (rrule) => {
    expect(isValidRrule(rrule)).toBe(false);
  });
});

describe("isValidTimezone", () => {
  it.each(["America/New_York", "Asia/Kolkata", "Australia/Lord_Howe", "UTC", "Etc/GMT+5", "US/Eastern"])(
    "accepts %s",
    (timezone) => {
      expect(isValidTimezone(timezone)).toBe(true);
    },
  );

  it.each(["Mars/Olympus_Mons", "", "+05:30", "-05", "America/New York", "Z"])("rejects %j", (timezone) => {
    expect(isValidTimezone(timezone)).toBe(false);
  });
});

describe("the Manage form start time", () => {
  it.each([
    { name: "plain", wall: "2026-11-02T10:00", timezone: NEW_YORK, start: "2026-11-02T15:00:00Z" },
    { name: "summer", wall: "2026-07-06T10:00", timezone: NEW_YORK, start: "2026-07-06T14:00:00Z" },
    { name: "half-hour zone", wall: "2026-07-06T10:00", timezone: "Asia/Kolkata", start: "2026-07-06T04:30:00Z" },
  ])("converts a $name start both ways", ({ wall, timezone, start }) => {
    expect(wallClockToStart(wall, timezone)).toBe(seconds(start));
    expect(startToWallClock(seconds(start), timezone)).toBe(wall);
  });

  it("moves a missing local start past the gap", () => {
    expect(wallClockToStart("2026-03-08T02:30", NEW_YORK)).toBe(seconds("2026-03-08T07:30:00Z"));
    expect(startToWallClock(seconds("2026-03-08T07:30:00Z"), NEW_YORK)).toBe("2026-03-08T03:30");
  });

  it("uses the first occurrence of a repeated local start", () => {
    expect(wallClockToStart("2026-11-01T01:30", NEW_YORK)).toBe(seconds("2026-11-01T05:30:00Z"));
  });
});

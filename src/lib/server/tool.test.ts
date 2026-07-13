import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BeginningOfDay,
  BeginningOfMinute,
  DurationInMinutes,
  GetDayStartTimestampUTC,
  GetDayStartWithOffset,
  GetMinuteStartNowTimestampUTC,
  GetMinuteStartTimestampUTC,
  GetNowTimestampUTC,
  GetNowTimestampUTCInMs,
  IsValidUptimeFormula,
  ParsePercentage,
  ParseUptime,
  UnparsePercentage,
  UptimeCalculator,
} from "./tool";
import type { TimestampStatusCount } from "./types/db";

// All fixed timestamps are at 12:00 UTC so that local-date-based functions
// (GetDayStartTimestampUTC mixes local date parts with Date.UTC) produce the
// same result on any machine with a UTC offset between -11 and +11 hours.
const NOON_UTC = 1768478400; // 2026-01-15T12:00:00Z
const DAY_START = 1768435200; // 2026-01-15T00:00:00Z

describe("timestamp helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("GetNowTimestampUTC returns the current epoch in seconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    expect(GetNowTimestampUTC()).toBe(NOON_UTC);
  });

  it("GetNowTimestampUTCInMs returns the current epoch in milliseconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    expect(GetNowTimestampUTCInMs()).toBe(NOON_UTC * 1000);
  });

  it("GetMinuteStartTimestampUTC floors a timestamp to the start of its minute", () => {
    expect(GetMinuteStartTimestampUTC(NOON_UTC + 45)).toBe(NOON_UTC);
    expect(GetMinuteStartTimestampUTC(NOON_UTC)).toBe(NOON_UTC);
    expect(GetMinuteStartTimestampUTC(NOON_UTC + 59)).toBe(NOON_UTC);
  });

  it("GetMinuteStartNowTimestampUTC floors the current time to the minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:45Z"));
    expect(GetMinuteStartNowTimestampUTC()).toBe(NOON_UTC);
  });

  it("GetDayStartTimestampUTC returns midnight UTC of the timestamp's day", () => {
    expect(GetDayStartTimestampUTC(NOON_UTC)).toBe(DAY_START);
    expect(GetDayStartTimestampUTC(DAY_START + 12 * 3600 + 61)).toBe(DAY_START);
  });

  it("DurationInMinutes floors the difference to whole minutes", () => {
    expect(DurationInMinutes(0, 600)).toBe(10);
    expect(DurationInMinutes(0, 59)).toBe(0);
    expect(DurationInMinutes(DAY_START, NOON_UTC)).toBe(720);
  });

  it("GetDayStartWithOffset shifts the UTC day start by positive offsets", () => {
    // 330 minutes = UTC+5:30 (e.g. IST)
    expect(GetDayStartWithOffset(NOON_UTC, 330)).toBe(DAY_START + 330 * 60);
    expect(GetDayStartWithOffset(NOON_UTC, 0)).toBe(DAY_START);
  });

  it("GetDayStartWithOffset moves to the next day for negative offsets", () => {
    expect(GetDayStartWithOffset(NOON_UTC, -330)).toBe(DAY_START + 86400 - 330 * 60);
  });

  it("BeginningOfDay returns midnight in the given timezone", () => {
    const date = new Date("2026-01-15T12:00:00Z");
    expect(BeginningOfDay({ date, timeZone: "UTC" })).toBe(DAY_START);
    // Midnight in New York (UTC-5 in January) is 05:00 UTC
    expect(BeginningOfDay({ date, timeZone: "America/New_York" })).toBe(DAY_START + 5 * 3600);
  });

  it("BeginningOfMinute strips seconds", () => {
    const date = new Date("2026-01-15T12:00:45Z");
    expect(BeginningOfMinute({ date, timeZone: "UTC" })).toBe(NOON_UTC);
  });
});

describe("ParseUptime", () => {
  it("returns '-' when there is no data", () => {
    expect(ParseUptime(0, 0)).toBe("-");
  });

  it("returns '0' when nothing is up", () => {
    expect(ParseUptime(0, 10)).toBe("0");
  });

  it("returns whole numbers without decimals", () => {
    expect(ParseUptime(10, 10)).toBe("100");
    expect(ParseUptime(5, 10)).toBe("50");
  });

  it("keeps 4 decimal places and strips trailing zeros", () => {
    expect(ParseUptime(1, 3)).toBe("33.3333");
    expect(ParseUptime(2, 3)).toBe("66.6667");
    expect(ParseUptime(1, 8)).toBe("12.5");
    expect(ParseUptime(999, 1000)).toBe("99.9");
  });
});

describe("ParsePercentage / UnparsePercentage", () => {
  it("formats numbers as percentage strings", () => {
    expect(ParsePercentage(NaN)).toBe("-");
    expect(ParsePercentage(0)).toBe("0");
    expect(ParsePercentage(100)).toBe("100");
    expect(ParsePercentage(99.9)).toBe("99.9000");
  });

  it("parses percentage strings back to numbers", () => {
    expect(UnparsePercentage("99.9")).toBe(99.9);
    expect(UnparsePercentage("0")).toBe(0);
    expect(Number.isNaN(UnparsePercentage("-"))).toBe(true);
  });
});

describe("IsValidUptimeFormula", () => {
  it("accepts single variables and operator chains", () => {
    expect(IsValidUptimeFormula("up")).toBe(true);
    expect(IsValidUptimeFormula("up + down")).toBe(true);
    expect(IsValidUptimeFormula("up+down+degraded+maintenance")).toBe(true);
    expect(IsValidUptimeFormula("up - down * maintenance / degraded")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(IsValidUptimeFormula("UP + Maintenance")).toBe(true);
  });

  it("rejects malformed formulas", () => {
    expect(IsValidUptimeFormula("")).toBe(false);
    expect(IsValidUptimeFormula("   ")).toBe(false);
    expect(IsValidUptimeFormula("up +")).toBe(false);
    expect(IsValidUptimeFormula("+ up")).toBe(false);
    expect(IsValidUptimeFormula("banana + up")).toBe(false);
    expect(IsValidUptimeFormula("up ** down")).toBe(false);
    expect(IsValidUptimeFormula("up down")).toBe(false);
    expect(IsValidUptimeFormula("42")).toBe(false);
  });
});

describe("UptimeCalculator", () => {
  const day = (overrides: Partial<TimestampStatusCount>): TimestampStatusCount => ({
    ts: 0,
    countOfUp: 0,
    countOfDown: 0,
    countOfDegraded: 0,
    countOfMaintenance: 0,
    avgLatency: 0,
    maxLatency: 0,
    minLatency: 0,
    ...overrides,
  });

  it("computes uptime and latency aggregates with the default formulas", () => {
    // Defaults (global-constants): numerator "up + maintenance + degraded",
    // denominator "up + down + degraded + maintenance"
    const data = [
      day({ countOfUp: 30, countOfDown: 10, avgLatency: 100, maxLatency: 150, minLatency: 50 }),
      day({ countOfUp: 50, countOfDegraded: 10, avgLatency: 200, maxLatency: 300, minLatency: 80 }),
    ];
    expect(UptimeCalculator(data)).toEqual({
      uptime: "90", // (80 up + 0 maintenance + 10 degraded) / 100 total
      avgLatency: "150ms", // (100 + 200) / 2
      maxLatency: "300ms",
      minLatency: "50ms",
    });
  });

  it("supports a custom numerator formula", () => {
    const data = [day({ countOfUp: 30, countOfDown: 10 }), day({ countOfUp: 50, countOfDegraded: 10 })];
    expect(UptimeCalculator(data, "up").uptime).toBe("80");
  });

  it("falls back to the default formula when the custom one is invalid", () => {
    const data = [day({ countOfUp: 30, countOfDown: 10 }), day({ countOfUp: 50, countOfDegraded: 10 })];
    expect(UptimeCalculator(data, "banana + up").uptime).toBe("90");
  });

  it("returns '-' uptime and empty latencies for no data", () => {
    expect(UptimeCalculator([])).toEqual({
      uptime: "-",
      avgLatency: "",
      maxLatency: "",
      minLatency: "",
    });
  });

  it("only counts entries with a positive avgLatency toward the average", () => {
    const data = [
      day({ countOfUp: 10, avgLatency: 0 }),
      day({ countOfUp: 10, avgLatency: 100, maxLatency: 100, minLatency: 100 }),
    ];
    const result = UptimeCalculator(data);
    expect(result.uptime).toBe("100");
    expect(result.avgLatency).toBe("100ms"); // (0 + 100) / 1 entry with latency > 0
  });
});

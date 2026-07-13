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
} from "./tool";

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

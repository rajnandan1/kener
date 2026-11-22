import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEndOfDayAtTz, getStartOfDayAtTz } from "./datetime";

describe("getEndOfDayAtTz", () => {
  it("returns a number for a valid zone", () => {
    expect(Number.isFinite(getEndOfDayAtTz("Asia/Kolkata"))).toBe(true);
  });

  it("falls back to UTC for a zone date-fns-tz cannot resolve", () => {
    expect(getEndOfDayAtTz("Etc/Unknown")).toBe(getEndOfDayAtTz("UTC"));
  });

  describe("on a daylight-saving day", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([
      { name: "a 23-hour day", now: "2026-03-08T16:00:00Z", want: "2026-03-09T04:00:00Z" },
      { name: "a 25-hour day", now: "2026-11-01T16:00:00Z", want: "2026-11-02T05:00:00Z" },
      { name: "a 24-hour day", now: "2026-11-02T16:00:00Z", want: "2026-11-03T05:00:00Z" },
    ])("returns the next local midnight on $name", ({ now, want }) => {
      vi.setSystemTime(new Date(now));
      expect(getEndOfDayAtTz("America/New_York")).toBe(new Date(want).getTime() / 1000);
    });
  });

  describe("when the runtime's own timezone skips a midnight", () => {
    const originalTz = process.env.TZ;

    beforeEach(() => {
      // Chile moves its clocks from 00:00 to 01:00 on 2026-09-06.
      process.env.TZ = "America/Santiago";
      vi.useFakeTimers({ toFake: ["Date"] });
    });

    afterEach(() => {
      vi.useRealTimers();
      process.env.TZ = originalTz;
    });

    it.each([
      { now: "2026-09-05T12:00:00Z", start: "2026-09-05T00:00:00Z", end: "2026-09-06T00:00:00Z" },
      { now: "2026-09-06T12:00:00Z", start: "2026-09-06T00:00:00Z", end: "2026-09-07T00:00:00Z" },
    ])("still returns UTC midnights at $now", ({ now, start, end }) => {
      vi.setSystemTime(new Date(now));
      expect(getStartOfDayAtTz("UTC")).toBe(new Date(start).getTime() / 1000);
      expect(getEndOfDayAtTz("UTC")).toBe(new Date(end).getTime() / 1000);
    });
  });
});

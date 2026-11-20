import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEndOfDayAtTz } from "./datetime";

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
});

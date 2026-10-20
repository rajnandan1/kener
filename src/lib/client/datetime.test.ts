import { describe, expect, it } from "vitest";
import { getEndOfDayAtTz } from "./datetime";

describe("getEndOfDayAtTz", () => {
  it("returns a number for a valid zone", () => {
    expect(Number.isFinite(getEndOfDayAtTz("Asia/Kolkata"))).toBe(true);
  });

  it("falls back to UTC for a zone date-fns-tz cannot resolve", () => {
    expect(getEndOfDayAtTz("Etc/Unknown")).toBe(getEndOfDayAtTz("UTC"));
  });
});

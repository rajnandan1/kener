import { describe, expect, it } from "vitest";
import { parseDateInput } from "./datetime";

describe("parseDateInput", () => {
  it("treats a naive DB audit-column string as UTC", () => {
    expect(parseDateInput("2026-08-20 04:02:00").toISOString()).toBe("2026-08-20T04:02:00.000Z");
  });

  it("accepts epoch seconds, epoch milliseconds, ISO strings, and Dates", () => {
    const iso = "2026-08-20T04:02:00.000Z";
    expect(parseDateInput(1787198520).toISOString()).toBe(iso);
    expect(parseDateInput(1787198520000).toISOString()).toBe(iso);
    expect(parseDateInput(iso).toISOString()).toBe(iso);
    expect(parseDateInput(new Date(iso)).toISOString()).toBe(iso);
  });
});

import { describe, expect, it } from "vitest";
import { getDefaultPageSettings, mergePageSettings, toApiPageSettings, validatePageSettings } from "./pageSettings";

describe("pageSettings — monitor_latency_display", () => {
  it("defaults to avg only", () => {
    expect(getDefaultPageSettings().monitor_latency_display).toEqual({
      current: false,
      avg: true,
      min: false,
      max: false,
    });
  });

  it("merges a partial patch over defaults", () => {
    const merged = mergePageSettings(getDefaultPageSettings(), {
      monitor_latency_display: { min: true },
    });
    expect(merged.monitor_latency_display).toEqual({ current: false, avg: true, min: true, max: false });
  });

  it("merges the current flag", () => {
    const merged = mergePageSettings(getDefaultPageSettings(), {
      monitor_latency_display: { current: true },
    });
    expect(merged.monitor_latency_display).toEqual({ current: true, avg: true, min: false, max: false });
  });

  it("reads stored flags and fills missing ones from defaults", () => {
    const json = JSON.stringify({ monitor_latency_display: { avg: false, max: true } });
    expect(toApiPageSettings(json).monitor_latency_display).toEqual({
      current: false,
      avg: false,
      min: false,
      max: true,
    });
  });

  it("ignores non-boolean stored flags (falls back to defaults)", () => {
    const json = JSON.stringify({ monitor_latency_display: { avg: "yes", min: 1 } });
    expect(toApiPageSettings(json).monitor_latency_display).toEqual({
      current: false,
      avg: true,
      min: false,
      max: false,
    });
  });

  it("validates: rejects a non-object", () => {
    expect(validatePageSettings({ monitor_latency_display: [] })).toMatch(/monitor_latency_display must be an object/);
  });

  it("validates: rejects a non-boolean flag", () => {
    expect(validatePageSettings({ monitor_latency_display: { avg: "true" } })).toMatch(
      /monitor_latency_display\.avg must be a boolean/,
    );
  });

  it("validates: accepts a valid partial", () => {
    expect(validatePageSettings({ monitor_latency_display: { avg: true, max: false } })).toBeNull();
  });
});

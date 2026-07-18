import { describe, expect, it } from "vitest";
import { FormatValue, IsCustomUnit, ParseLatency } from "./clientTools";

describe("FormatValue - legacy latency path (no config or unit 'ms')", () => {
  it("is byte-identical to the old ParseLatency behavior", () => {
    expect(FormatValue(0)).toBe("");
    expect(FormatValue(null)).toBe("");
    expect(FormatValue(undefined)).toBe("");
    expect(FormatValue(42)).toBe("42ms");
    expect(FormatValue(999.4)).toBe("999ms");
    expect(FormatValue(999.6)).toBe("1000ms");
    expect(FormatValue(1000)).toBe("1.00s");
    expect(FormatValue(59999)).toBe("60.00s");
    expect(FormatValue(60000)).toBe("1.00m");
    expect(FormatValue(3599999)).toBe("60.00m");
    expect(FormatValue(3600000)).toBe("1.00h");
  });

  it("treats an explicit unit 'ms' as the legacy path", () => {
    expect(FormatValue(0, { unit: "ms" })).toBe("");
    expect(FormatValue(1500, { unit: "ms" })).toBe("1.50s");
    // decimals is ignored on the legacy path
    expect(FormatValue(42, { unit: "ms", decimals: 2 })).toBe("42ms");
  });

  it("keeps ParseLatency working as a deprecated alias", () => {
    expect(ParseLatency(42)).toBe("42ms");
    expect(ParseLatency(0)).toBe("");
  });
});

describe("FormatValue - custom units", () => {
  it("appends the unit with a space and no auto-scaling", () => {
    expect(FormatValue(42, { unit: "items" })).toBe("42 items");
    expect(FormatValue(60000, { unit: "items" })).toBe("60000 items");
  });

  it("renders 0 as a valid value", () => {
    expect(FormatValue(0, { unit: "items" })).toBe("0 items");
  });

  it("joins '%' and empty unit without a space", () => {
    expect(FormatValue(97.3, { unit: "%" })).toBe("97.3%");
    expect(FormatValue(42, { unit: "" })).toBe("42");
  });

  it("defaults to up to 2 decimals with trailing zeros trimmed", () => {
    expect(FormatValue(3.456, { unit: "items" })).toBe("3.46 items");
    expect(FormatValue(3.5, { unit: "items" })).toBe("3.5 items");
    expect(FormatValue(3.0, { unit: "items" })).toBe("3 items");
  });

  it("uses exact decimals when set", () => {
    expect(FormatValue(42, { unit: "items", decimals: 2 })).toBe("42.00 items");
    expect(FormatValue(3.456, { unit: "items", decimals: 0 })).toBe("3 items");
  });

  it("clamps out-of-range decimals and treats invalid decimals as unset", () => {
    expect(FormatValue(3.45678, { unit: "items", decimals: 9 })).toBe("3.4568 items"); // clamped to 4
    expect(FormatValue(3.456, { unit: "items", decimals: -1 })).toBe("3 items"); // clamped to 0
    expect(FormatValue(3.456, { unit: "items", decimals: Number.NaN })).toBe("3.46 items"); // invalid -> auto
  });

  it("does not use thousands grouping and uses '.' as decimal separator", () => {
    expect(FormatValue(1234567.5, { unit: "items" })).toBe("1234567.5 items");
  });

  it("returns empty string for null/undefined/NaN", () => {
    expect(FormatValue(null, { unit: "items" })).toBe("");
    expect(FormatValue(undefined, { unit: "items" })).toBe("");
    expect(FormatValue(Number.NaN, { unit: "items" })).toBe("");
  });
});

describe("IsCustomUnit", () => {
  it("is false for absent config, absent unit, or 'ms'", () => {
    expect(IsCustomUnit(undefined)).toBe(false);
    expect(IsCustomUnit(null)).toBe(false);
    expect(IsCustomUnit({})).toBe(false);
    expect(IsCustomUnit({ name: "Queue length" })).toBe(false);
    expect(IsCustomUnit({ unit: "ms" })).toBe(false);
  });

  it("is true for any present non-'ms' unit including empty string", () => {
    expect(IsCustomUnit({ unit: "items" })).toBe(true);
    expect(IsCustomUnit({ unit: "%" })).toBe(true);
    expect(IsCustomUnit({ unit: "" })).toBe(true);
  });
});

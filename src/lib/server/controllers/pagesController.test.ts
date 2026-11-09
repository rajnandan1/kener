import { describe, expect, it } from "vitest";
import { normalizePageMonitorInputs } from "./pagesController";

describe("normalizePageMonitorInputs", () => {
  it("keeps legacy tags ungrouped at their input position", () => {
    expect(normalizePageMonitorInputs(["api", "db"])).toEqual([
      { tag: "api", group: null, position: 0 },
      { tag: "db", group: null, position: 1 },
    ]);
  });

  it("accepts grouped monitor objects and trims their values", () => {
    expect(normalizePageMonitorInputs([{ tag: " api ", group: " Backend ", position: 4 }])).toEqual([
      { tag: "api", group: "Backend", position: 4 },
    ]);
  });

  it("rejects a non-string group", () => {
    expect(() => normalizePageMonitorInputs([{ tag: "api", group: 1 as unknown as string }])).toThrow(
      "Monitor `group` must be a string or null",
    );
  });
});

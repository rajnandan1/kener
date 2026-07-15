import { describe, expect, it } from "vitest";
import { buildLatencyDisplay } from "./clientTools";

const VALUES = { current: "123ms", avg: "250ms", min: "10ms", max: "900ms" };
const LABELS = { current: "now.", avg: "avg.", min: "min.", max: "max." };

describe("buildLatencyDisplay", () => {
  it("renders all three metrics in fixed avg→min→max order", () => {
    const out = buildLatencyDisplay({ avg: true, min: true, max: true }, VALUES, LABELS);
    expect(out).toBe("avg. 250ms | min. 10ms | max. 900ms");
  });

  it("renders avg only", () => {
    expect(buildLatencyDisplay({ avg: true, min: false, max: false }, VALUES, LABELS)).toBe("avg. 250ms");
  });

  it("renders current first, before the aggregates", () => {
    expect(buildLatencyDisplay({ current: true, avg: true, min: true, max: true }, VALUES, LABELS)).toBe(
      "now. 123ms | avg. 250ms | min. 10ms | max. 900ms",
    );
  });

  it("renders current only", () => {
    expect(buildLatencyDisplay({ current: true, avg: false, min: false, max: false }, VALUES, LABELS)).toBe(
      "now. 123ms",
    );
  });

  it("omits current when its value is empty", () => {
    expect(
      buildLatencyDisplay({ current: true, avg: true, min: false, max: false }, { ...VALUES, current: "" }, LABELS),
    ).toBe("avg. 250ms");
  });

  it("renders min + max without avg", () => {
    expect(buildLatencyDisplay({ avg: false, min: true, max: true }, VALUES, LABELS)).toBe("min. 10ms | max. 900ms");
  });

  it("keeps avg→min→max order regardless of flag object order", () => {
    expect(buildLatencyDisplay({ max: true, avg: true }, VALUES, LABELS)).toBe("avg. 250ms | max. 900ms");
  });

  it("omits a flagged metric whose value is empty", () => {
    expect(
      buildLatencyDisplay(
        { avg: true, min: true, max: false },
        { current: "", avg: "250ms", min: "", max: "" },
        LABELS,
      ),
    ).toBe("avg. 250ms");
  });

  it("returns empty string when no flags are set", () => {
    expect(buildLatencyDisplay({ avg: false, min: false, max: false }, VALUES, LABELS)).toBe("");
  });

  it("returns empty string when display is undefined", () => {
    expect(buildLatencyDisplay(undefined, VALUES, LABELS)).toBe("");
  });

  it("treats missing flags as false", () => {
    expect(buildLatencyDisplay({ min: true }, VALUES, LABELS)).toBe("min. 10ms");
  });
});

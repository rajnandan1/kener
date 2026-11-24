import { describe, expect, it } from "vitest";
import {
  GetStatusBarGeometry,
  GetStatusBarIndexAt,
  GetStatusBarStart,
  IsStatusBarLayout,
  ResolveStatusBarLayout,
} from "./statusBarLayout";

describe("ResolveStatusBarLayout", () => {
  it("keeps valid values", () => {
    expect(ResolveStatusBarLayout("JOINED")).toBe("JOINED");
    expect(ResolveStatusBarLayout("SEPARATED")).toBe("SEPARATED");
  });

  it("falls back to JOINED for missing or unknown values", () => {
    expect(ResolveStatusBarLayout(undefined)).toBe("JOINED");
    expect(ResolveStatusBarLayout("")).toBe("JOINED");
    expect(ResolveStatusBarLayout("separated")).toBe("JOINED");
    expect(IsStatusBarLayout(42)).toBe(false);
  });
});

describe("GetStatusBarGeometry", () => {
  it("has no gap and no per-bar corners for joined bars", () => {
    expect(GetStatusBarGeometry(900, 90, "JOINED")).toEqual({ gap: 0, barWidth: 10, cornerRadius: 0 });
  });

  it("uses a 3px gap and 3px corners for separated bars with enough room", () => {
    const geometry = GetStatusBarGeometry(1200, 90, "SEPARATED");
    expect(geometry.gap).toBe(3);
    expect(geometry.cornerRadius).toBe(3);
    // all bars plus all gaps fill the full width
    expect(90 * geometry.barWidth + 89 * geometry.gap).toBeCloseTo(1200);
  });

  it("shrinks the gap and corners on narrow screens", () => {
    // 90 days on a 320px phone: about 3.5px per day
    const geometry = GetStatusBarGeometry(320, 90, "SEPARATED");
    expect(geometry.gap).toBe(1);
    expect(geometry.cornerRadius).toBeLessThanOrEqual(geometry.barWidth / 2);
    expect(geometry.barWidth).toBeGreaterThan(geometry.gap);
  });

  it("drops the gap when a day gets less than 2px, so no day is cut off", () => {
    // 90 days in narrow embeds: the newest days on the right must stay visible
    for (const width of [90, 120, 160, 179]) {
      const geometry = GetStatusBarGeometry(width, 90, "SEPARATED");
      expect(geometry.gap).toBe(0);
      expect(90 * geometry.barWidth).toBeCloseTo(width);
    }
  });

  it("never needs more than the available width", () => {
    for (const width of [60, 180, 200, 321, 640, 999, 1440]) {
      for (const count of [1, 7, 30, 45, 90]) {
        const g = GetStatusBarGeometry(width, count, "SEPARATED");
        expect(count * g.barWidth + (count - 1) * g.gap).toBeCloseTo(width);
      }
    }
  });

  it("returns an empty geometry when there is nothing to draw", () => {
    expect(GetStatusBarGeometry(0, 90, "SEPARATED")).toEqual({ gap: 0, barWidth: 0, cornerRadius: 0 });
    expect(GetStatusBarGeometry(500, 0, "JOINED")).toEqual({ gap: 0, barWidth: 0, cornerRadius: 0 });
  });
});

describe("GetStatusBarIndexAt", () => {
  const geometry = { gap: 2, barWidth: 8, cornerRadius: 3 };

  it("finds the bar under the pointer", () => {
    expect(GetStatusBarIndexAt(0, 3, geometry)).toBe(0);
    expect(GetStatusBarIndexAt(15, 3, geometry)).toBe(1);
    expect(GetStatusBarIndexAt(27, 3, geometry)).toBe(2);
  });

  it("counts the gap after a bar as part of that bar", () => {
    expect(GetStatusBarIndexAt(9, 3, geometry)).toBe(0);
  });

  it("returns -1 outside the bars", () => {
    expect(GetStatusBarIndexAt(-1, 3, geometry)).toBe(-1);
    expect(GetStatusBarIndexAt(31, 3, geometry)).toBe(-1);
    expect(GetStatusBarIndexAt(5, 0, geometry)).toBe(-1);
  });
});

describe("GetStatusBarIndexAt and the drawn bars", () => {
  it("picks the bar that is drawn under every pixel, and the left bar inside a gap", () => {
    const failures: string[] = [];
    for (const layout of ["JOINED", "SEPARATED"] as const) {
      for (const width of [160, 180, 320, 333, 1000, 1200]) {
        for (const count of [30, 45, 90]) {
          const g = GetStatusBarGeometry(width, count, layout);
          for (let i = 0; i < count; i++) {
            // Bar i is drawn from its start up to the next bar's start; the gap sits at the end
            for (let x = GetStatusBarStart(i, g); x < GetStatusBarStart(i + 1, g); x++) {
              const lastBarGap = i === count - 1 && x >= GetStatusBarStart(count, g) - Math.round(g.gap);
              const expected = lastBarGap ? -1 : i;
              const got = GetStatusBarIndexAt(x + 0.5, count, g);
              if (got !== expected) failures.push(`${layout} ${width}px/${count}: x=${x} -> ${got}, drawn ${expected}`);
            }
          }
        }
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
  });
});

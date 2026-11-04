import { describe, expect, it } from "vitest";
import {
  GetGridContainerClass,
  GetGridItemSpanClass,
  IsCompactLayout,
  IsGridLayout,
  MONITOR_LAYOUT_STYLE_LABELS,
  ResolveMonitorLayoutStyle,
} from "./monitorLayout";

describe("ResolveMonitorLayoutStyle", () => {
  it.each(["default-list", "default-grid", "compact-list", "compact-grid"])("keeps %s", (style) => {
    expect(ResolveMonitorLayoutStyle(style)).toBe(style);
  });

  it.each([undefined, null, "", "carousel", 3, {}])("falls back to default-list for %j", (value) => {
    expect(ResolveMonitorLayoutStyle(value)).toBe("default-list");
  });
});

describe("layout kinds", () => {
  it("tells grids and compact styles apart", () => {
    expect(
      ["default-list", "default-grid", "compact-list", "compact-grid"].map((s) => IsGridLayout(s as never)),
    ).toEqual([false, true, false, true]);
    expect(
      ["default-list", "default-grid", "compact-list", "compact-grid"].map((s) => IsCompactLayout(s as never)),
    ).toEqual([false, false, true, true]);
    expect(IsGridLayout(undefined)).toBe(false);
  });

  it("labels every style", () => {
    expect(Object.values(MONITOR_LAYOUT_STYLE_LABELS)).toEqual([
      "Default List",
      "Default Grid",
      "Compact List",
      "Compact Grid",
    ]);
  });
});

describe("grid classes", () => {
  it("adds no grid columns to a list", () => {
    expect(GetGridContainerClass("default-list")).toBe("");
    expect(GetGridContainerClass("compact-list")).toBe("");
  });

  it("gives default and compact grids their columns", () => {
    expect(GetGridContainerClass("default-grid")).toBe("bg-border gap-px md:grid-cols-4 lg:grid-cols-4");
    expect(GetGridContainerClass("compact-grid")).toBe("bg-border gap-px sm:grid-cols-4 lg:grid-cols-6");
  });

  it("stretches a lone last item in a default grid across the row", () => {
    expect([0, 1, 2].map((i) => GetGridItemSpanClass(i, 3, "default-grid"))).toEqual([
      "md:col-span-2 lg:col-span-2",
      "md:col-span-2 lg:col-span-2",
      "md:col-span-4 lg:col-span-4",
    ]);
  });

  it("fills a short last row in a compact grid", () => {
    expect([0, 1, 2, 3].map((i) => GetGridItemSpanClass(i, 4, "compact-grid"))).toEqual([
      "sm:col-span-2 lg:col-span-2",
      "sm:col-span-2 lg:col-span-2",
      "sm:col-span-2 lg:col-span-2",
      "sm:col-span-2 lg:col-span-6",
    ]);
  });
});

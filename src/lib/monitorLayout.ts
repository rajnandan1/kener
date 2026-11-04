import GC from "$lib/global-constants";
import type { PageMonitorLayoutStyle } from "$lib/types/api";

// How a list of monitors is laid out: a page's monitors (page_settings.monitor_layout_style) and a group
// monitor's members (type_data.memberLayoutStyle) use the same four styles and the same classes.

export const MONITOR_LAYOUT_STYLE_LABELS: Record<PageMonitorLayoutStyle, string> = {
  "default-list": "Default List",
  "default-grid": "Default Grid",
  "compact-list": "Compact List",
  "compact-grid": "Compact Grid",
};

/** The stored style, or the default (default-list) when it is missing or unknown. */
export function ResolveMonitorLayoutStyle(value: unknown): PageMonitorLayoutStyle {
  return (GC.MONITOR_LAYOUT_STYLES as readonly string[]).includes(value as string)
    ? (value as PageMonitorLayoutStyle)
    : GC.DEFAULT_MONITOR_LAYOUT_STYLE;
}

export function IsGridLayout(style: PageMonitorLayoutStyle | undefined): boolean {
  return style === "default-grid" || style === "compact-grid";
}

export function IsCompactLayout(style: PageMonitorLayoutStyle | undefined): boolean {
  return style === "compact-list" || style === "compact-grid";
}

/** Classes for the grid container, after `grid grid-cols-1`. Empty for a list. */
export function GetGridContainerClass(style: PageMonitorLayoutStyle | undefined): string {
  if (style === "compact-grid") return "bg-border gap-px sm:grid-cols-4 lg:grid-cols-6";
  if (style === "default-grid") return "bg-border gap-px md:grid-cols-4 lg:grid-cols-4";
  return "";
}

/** Column spans for the item at `index` of `total` in a grid, so a short last row fills the width. */
export function GetGridItemSpanClass(index: number, total: number, style: PageMonitorLayoutStyle | undefined): string {
  if (style === "default-grid") {
    const mdLastRowCount = total % 2 || 2;
    const mdLastRowStart = total - mdLastRowCount;
    const isInMdLastRow = index >= mdLastRowStart;
    const mdSpan = isInMdLastRow && mdLastRowCount === 1 ? "md:col-span-4" : "md:col-span-2";

    const lgLastRowCount = total % 2 || 2;
    const lgLastRowStart = total - lgLastRowCount;
    const isInLgLastRow = index >= lgLastRowStart;
    const lgSpan = isInLgLastRow && lgLastRowCount === 1 ? "lg:col-span-4" : "lg:col-span-2";

    return `${mdSpan} ${lgSpan}`;
  }

  const smLastRowCount = total % 2 || 2;
  const smLastRowStart = total - smLastRowCount;
  const isInSmLastRow = index >= smLastRowStart;
  const smSpan = isInSmLastRow && smLastRowCount === 1 ? "sm:col-span-4" : "sm:col-span-2";

  const lgLastRowCount = total % 3 || 3;
  const lgLastRowStart = total - lgLastRowCount;
  const isInLgLastRow = index >= lgLastRowStart;
  const lgSpan = isInLgLastRow
    ? lgLastRowCount === 1
      ? "lg:col-span-6"
      : lgLastRowCount === 2
        ? "lg:col-span-3"
        : "lg:col-span-2"
    : "lg:col-span-2";

  return `${smSpan} ${lgSpan}`;
}

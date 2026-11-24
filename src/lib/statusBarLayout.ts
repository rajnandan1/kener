/**
 * Layout of the daily status bars on the status page.
 *
 * JOINED:    the day bars touch each other and form one long strip (the original look).
 * SEPARATED: every day is its own small bar with a gap and slightly rounded corners.
 */
export type StatusBarLayout = "JOINED" | "SEPARATED";

export const STATUS_BAR_LAYOUTS: readonly StatusBarLayout[] = ["JOINED", "SEPARATED"];

export const DEFAULT_STATUS_BAR_LAYOUT: StatusBarLayout = "JOINED";

export function IsStatusBarLayout(value: unknown): value is StatusBarLayout {
  return typeof value === "string" && (STATUS_BAR_LAYOUTS as readonly string[]).includes(value);
}

/** Falls back to the joined layout for missing or unknown values, e.g. on installs that never saved the setting. */
export function ResolveStatusBarLayout(value: unknown): StatusBarLayout {
  return IsStatusBarLayout(value) ? value : DEFAULT_STATUS_BAR_LAYOUT;
}

export interface StatusBarGeometry {
  /** Space between two bars in px. */
  gap: number;
  /** Width of a single bar in px (can be fractional, the canvas rounds per bar). */
  barWidth: number;
  /** Corner radius of every single bar in px. 0 means only the outer ends of the strip are rounded. */
  cornerRadius: number;
  /** Screen pixels per px (devicePixelRatio). Bar edges are rounded to whole screen pixels. */
  pixelRatio: number;
}

// Upper limits for the separated look. On a wide screen this gives roughly the
// "row of pills" look; on narrow screens both values shrink automatically.
const MAX_GAP = 3;
const MAX_CORNER_RADIUS = 3;

/**
 * Works out how wide each bar is and how much space sits between two bars.
 *
 * For separated bars the gap is about a quarter of the space one day gets, at
 * most 3px. When a day gets less than 2px there is no room for a gap at all, so
 * the bars touch: all days must stay visible, the newest ones sit on the right.
 * Bars and gaps add up to exactly `width`, unless a day gets less than one
 * screen pixel: every bar keeps at least one, so no day disappears.
 */
export function GetStatusBarGeometry(
  width: number,
  count: number,
  layout: StatusBarLayout,
  pixelRatio = 1,
): StatusBarGeometry {
  const ratio = pixelRatio > 0 ? pixelRatio : 1;
  if (width <= 0 || count <= 0) {
    return { gap: 0, barWidth: 0, cornerRadius: 0, pixelRatio: ratio };
  }
  const minBarWidth = 1 / ratio;

  if (layout === "JOINED") {
    return { gap: 0, barWidth: Math.max(minBarWidth, width / count), cornerRadius: 0, pixelRatio: ratio };
  }

  const spacePerDay = width / count;
  const gap = spacePerDay < 2 ? 0 : Math.min(MAX_GAP, Math.max(1, Math.floor(spacePerDay / 4)));
  const barWidth = Math.max(minBarWidth, (width - (count - 1) * gap) / count);
  // Never rounder than half the bar width, otherwise thin bars turn into lines with blobs.
  const cornerRadius = Math.min(MAX_CORNER_RADIUS, barWidth / 2);

  return { gap, barWidth, cornerRadius, pixelRatio: ratio };
}

/** Left edge of bar `index` in px, rounded to whole screen pixels the same way the canvas draws it. */
export function GetStatusBarStart(index: number, geometry: StatusBarGeometry): number {
  return Math.round(index * (geometry.barWidth + geometry.gap) * geometry.pixelRatio) / geometry.pixelRatio;
}

/**
 * Returns the index of the bar at position x, or -1 if x is outside the bars.
 *
 * Uses the same rounded edges as the drawing, so the tooltip always belongs to
 * the bar under the pointer. The gap after a bar counts as part of that bar;
 * otherwise the tooltip would disappear and reappear at every gap.
 */
export function GetStatusBarIndexAt(x: number, count: number, geometry: StatusBarGeometry): number {
  const slot = geometry.barWidth + geometry.gap;
  if (count <= 0 || slot <= 0 || x < 0) return -1;
  if (x >= GetStatusBarStart(count, geometry) - Math.round(geometry.gap)) return -1;

  // Start from the unrounded guess, then step to the last bar whose drawn left edge is at or before x
  let index = Math.min(count - 1, Math.floor(x / slot));
  while (index > 0 && GetStatusBarStart(index, geometry) > x) index--;
  while (index < count - 1 && GetStatusBarStart(index + 1, geometry) <= x) index++;
  return index;
}

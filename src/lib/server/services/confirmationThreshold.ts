import GC from "../../global-constants.js";
import db from "../db/db.js";

export type Side = "UP" | "DOWN" | null;

/** Binary side: UP is healthy; DOWN/DEGRADED are unhealthy; everything else (NO_DATA) is neutral. */
export function sideOf(status: string | null | undefined): Side {
  if (status === GC.UP) return "UP";
  if (status === GC.DOWN || status === GC.DEGRADED) return "DOWN";
  return null;
}

export interface ResolveInput {
  monitor_tag: string;
  ts: number;
  rawStatus: string;
  threshold: number; // >= 2 to damp; 1 behaves as off (any opposite observation confirms instantly)
}

export interface ResolveResult {
  /** Effective status to commit for this minute. */
  status: string;
  /**
   * True while the displayed status is the held confirmed side (pending confirmation) rather
   * than the observed side. The caller keeps the observed latency and error text (tagging the
   * row) — it does not blank them.
   */
  pendingHold: boolean;
}

/** Minimal data access this resolver needs; defaults to the db singleton, injectable for tests. */
export interface ConfirmationDeps {
  getRecentSamplesForConfirmation: typeof db.getRecentSamplesForConfirmation;
  getLastObservedStatus: typeof db.getLastObservedStatus;
  backfillConfirmedStatus: typeof db.backfillConfirmedStatus;
}

// Overlay sample types that freeze the count (must match OVERLAY_TYPES in the monitoring repository).
const OVERLAY_TYPES: string[] = [GC.INCIDENT, GC.MAINTENANCE];
// Extra lookback rows beyond the threshold for the pending-run scan: headroom for interleaved
// overlay rows. NO_DATA observations are excluded by the query, and the anchor is fetched
// separately, so the buffer need not scale with NO_DATA density or overlay-window length.
const LOOKBACK_BUFFER = 10;

/**
 * Resolve the status to commit for one scheduled-check observation under Confirmation
 * Threshold damping (issue #712).
 *
 * IMPORTANT ordering contract: this MUST be called BEFORE the current row at `ts` is
 * persisted, and only when no incident/maintenance overlay is active for `ts` (the caller
 * gates that — overlays freeze the count). It anchors on the most recent stored observation
 * (timestamp < ts).
 *
 * Neutral (`NO_DATA`) observations are excluded from the count (neither advance nor reset).
 * Overlay rows act as a hard boundary: the pending run never crosses one, so monitoring
 * resumes with a fresh count after an incident/maintenance window.
 */
export async function resolveConfirmedStatus(
  input: ResolveInput,
  deps: ConfirmationDeps = db,
): Promise<ResolveResult> {
  const { monitor_tag, ts, rawStatus, threshold } = input;
  const observedSide = sideOf(rawStatus);

  // Neutral observation (NO_DATA): pass through untouched — written honestly as grey.
  if (observedSide === null) {
    return { status: rawStatus, pendingHold: false };
  }

  // Anchor = the side currently shown = the most recent real observation's committed status.
  // Fetched with a dedicated query (not from the windowed scan) so a long incident/maintenance
  // window can never push the anchor out of range and bypass damping.
  const confirmedStatus = await deps.getLastObservedStatus(monitor_tag, ts);
  const confirmedSide = sideOf(confirmedStatus);

  // Cold start / no usable anchor / same side: commit immediately.
  if (confirmedStatus === null || confirmedSide === null || observedSide === confirmedSide) {
    return { status: rawStatus, pendingHold: false };
  }

  // Opposite side: count the trailing pending run (incl. current = 1), stopping at an overlay
  // boundary (freeze) or at a confirmed-side observation. NO_DATA rows are excluded by the query.
  const recent = await deps.getRecentSamplesForConfirmation(monitor_tag, ts, threshold + LOOKBACK_BUFFER);
  let pendingRun = 1;
  const pendingTimestamps: number[] = [];
  for (const row of recent) {
    if (row.type !== null && OVERLAY_TYPES.includes(row.type)) break; // freeze boundary
    const rawSide = sideOf(row.raw_status);
    if (rawSide === null) continue; // NO_DATA: neutral (excluded by the query; this is a defensive guard)
    if (rawSide === observedSide && sideOf(row.status) === confirmedSide) {
      pendingRun++;
      pendingTimestamps.push(row.timestamp);
    } else {
      break; // hit a confirmed-side observation (the anchor)
    }
  }

  if (pendingRun >= threshold) {
    // Unhealthy confirm passes the count so the backfill can write a per-row severity note
    // ("Down"/"Degraded confirmed after N…"); recovery passes null (clears the held error text).
    await deps.backfillConfirmedStatus(monitor_tag, pendingTimestamps, observedSide === "DOWN" ? threshold : null);
    return { status: rawStatus, pendingHold: false };
  }

  // Still pending: hold the confirmed side.
  return { status: confirmedStatus, pendingHold: true };
}

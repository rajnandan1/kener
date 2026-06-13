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
  /** True while holding the confirmed side (pending) — the caller must blank latency/error for this row. */
  pendingHold: boolean;
}

/** Minimal data access this resolver needs; defaults to the db singleton, injectable for tests. */
export interface ConfirmationDeps {
  getRecentSamplesForConfirmation: typeof db.getRecentSamplesForConfirmation;
  backfillConfirmedStatus: typeof db.backfillConfirmedStatus;
}

// Overlay sample types that freeze the count (must match OVERLAY_TYPES in the monitoring repository).
const OVERLAY_TYPES: string[] = [GC.INCIDENT, GC.MAINTENANCE];
// Extra lookback rows beyond the threshold, to tolerate neutral (NO_DATA) rows that are skipped
// rather than counted. Pathologically neutral-dense histories may delay confirmation by a check.
const LOOKBACK_BUFFER = 10;

/**
 * Resolve the status to commit for one scheduled-check observation under Confirmation
 * Threshold damping (issue #712 / ADR 0009).
 *
 * IMPORTANT ordering contract: this MUST be called BEFORE the current row at `ts` is
 * persisted, and only when no incident/maintenance overlay is active for `ts` (the caller
 * gates that — overlays freeze the count). It anchors on the most recent stored sample
 * (timestamp < ts).
 *
 * Neutral (`NO_DATA`) observations are skipped in the count (neither advance nor reset).
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

  const recent = await deps.getRecentSamplesForConfirmation(monitor_tag, ts, threshold + LOOKBACK_BUFFER);

  // Confirmed side = the most recent non-neutral scheduled-check observation's committed
  // status (overlays and NO_DATA are skipped — they don't define the confirmed side).
  let confirmedSide: Side = null;
  for (const row of recent) {
    if (row.type !== null && OVERLAY_TYPES.indexOf(row.type) !== -1) continue; // overlay: skip for anchor
    const s = sideOf(row.status);
    if (s !== null) {
      confirmedSide = s;
      break;
    }
  }

  // Cold start / no usable anchor / same side: commit immediately.
  if (confirmedSide === null || observedSide === confirmedSide) {
    return { status: rawStatus, pendingHold: false };
  }

  // The displayed status to hold while pending = the confirmed side's actual stored status.
  const confirmedStatus = confirmedSideStatus(recent, confirmedSide);

  // Opposite side: count the trailing pending run (incl. current = 1), skipping NO_DATA
  // (neutral) and stopping at an overlay boundary (freeze) or a confirmed-side observation.
  let pendingRun = 1;
  const pendingTimestamps: number[] = [];
  for (const row of recent) {
    if (row.type !== null && OVERLAY_TYPES.indexOf(row.type) !== -1) break; // freeze boundary
    const rawSide = sideOf(row.raw_status);
    if (rawSide === null) continue; // NO_DATA: neutral — neither advance nor reset
    if (rawSide === observedSide && sideOf(row.status) === confirmedSide) {
      pendingRun++;
      pendingTimestamps.push(row.timestamp);
    } else {
      break; // hit a confirmed-side observation (the anchor)
    }
  }

  if (pendingRun >= threshold) {
    const message =
      observedSide === "DOWN" ? `Down confirmed after ${threshold} consecutive checks` : null;
    await deps.backfillConfirmedStatus(monitor_tag, pendingTimestamps, message);
    return { status: rawStatus, pendingHold: false };
  }

  // Still pending: hold the confirmed side, display clean.
  return { status: confirmedStatus, pendingHold: true };
}

/** The displayed status of the confirmed side — the most recent non-neutral, non-overlay row on it. */
function confirmedSideStatus(
  recent: Array<{ status: string | null; raw_status: string | null; type: string | null }>,
  confirmedSide: Side,
): string {
  for (const row of recent) {
    if (row.type !== null && OVERLAY_TYPES.indexOf(row.type) !== -1) continue;
    if (sideOf(row.status) === confirmedSide && row.status) return row.status;
  }
  return confirmedSide === "UP" ? GC.UP : GC.DOWN;
}

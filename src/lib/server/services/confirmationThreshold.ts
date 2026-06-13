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
  getRecentObservedSamples: typeof db.getRecentObservedSamples;
  backfillConfirmedStatus: typeof db.backfillConfirmedStatus;
}

/**
 * Resolve the status to commit for one scheduled-check observation under Confirmation
 * Threshold damping (issue #712 / ADR 0009).
 *
 * IMPORTANT ordering contract: this MUST be called BEFORE the current row at `ts` is
 * persisted. It anchors on the most recent stored sample (timestamp < ts); if the row at
 * `ts` were already written, it would mis-anchor the confirmed side. The scheduled-check
 * write path calls this, then persists the row with the returned status.
 */
export async function resolveConfirmedStatus(
  input: ResolveInput,
  deps: ConfirmationDeps = db,
): Promise<ResolveResult> {
  const { monitor_tag, ts, rawStatus, threshold } = input;
  const observedSide = sideOf(rawStatus);

  // Neutral observation (NO_DATA): pass through untouched (full neutrality is hardening slice #756).
  if (observedSide === null) {
    return { status: rawStatus, pendingHold: false };
  }

  const recent = await deps.getRecentObservedSamples(monitor_tag, ts, threshold);

  // Cold start: no prior observation to anchor against -> commit immediately.
  if (recent.length === 0) {
    return { status: rawStatus, pendingHold: false };
  }

  // A null stored status (unknown anchor) is treated as no-flip: commit the observation as-is.
  const confirmedStatus = recent[0].status ?? rawStatus;
  const confirmedSide = sideOf(confirmedStatus);

  // Same side, or anchor is neutral: no flip — commit the observed status (and its severity).
  if (confirmedSide === null || observedSide === confirmedSide) {
    return { status: rawStatus, pendingHold: false };
  }

  // Opposite side: count the trailing pending run of opposite-side observations (incl. current).
  let pendingRun = 1;
  const pendingTimestamps: number[] = [];
  for (const row of recent) {
    if (sideOf(row.raw_status) === observedSide && sideOf(row.status) === confirmedSide) {
      pendingRun++;
      pendingTimestamps.push(row.timestamp);
    } else {
      break;
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

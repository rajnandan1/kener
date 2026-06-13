# Confirmation Threshold (hardening: overlays, NO_DATA, verification) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the deferred boundary rules of Confirmation Threshold true (issue #756, parent #712): overlay count-freeze, NO_DATA neutrality, and verified MANUAL/DEFAULT transparency + DEGRADED handling — on top of the core slice #755.

**Architecture:** Two behavior gaps remain after #755. (1) **NO_DATA neutrality** — the resolver's lookback currently *breaks* the pending run on a NO_DATA row (resetting the count); it must *skip* it (neither advance nor reset). (2) **Overlay freeze** — incident/maintenance must (F1) suppress damping/backfill for the current minute when an overlay is active, and (F2) stop the pending-run count from carrying *across* a past overlay (fresh count when normal monitoring resumes). The lookback is widened to include overlay rows so the resolver can detect the freeze boundary; the resolver walk gains skip-neutral and break-on-overlay rules. DEGRADED-as-not-UP and MANUAL/DEFAULT transparency already work from #755 and only need test coverage. See `docs/adr/0009-confirmation-threshold-write-time-backfill.md`.

**Tech Stack:** SvelteKit 2 / Svelte 5, Node, Knex, BullMQ. No test runner — verify with throwaway in-memory `better-sqlite3` vite-node scripts (`npx vite-node`, `npm rebuild better-sqlite3` if NODE_MODULE_VERSION). Delete scripts after; never commit them.

**Branch:** `implement/756` (off `implement/712`, which carries #755). Do not switch branches.

**Current behavior reference (post-#755):**
- `resolveConfirmedStatus` (`src/lib/server/services/confirmationThreshold.ts`): anchors on `recent[0]`, walks `recent` counting the trailing pending run, `break`s on the first non-matching row (so NO_DATA *resets*).
- `getRecentObservedSamples(monitor_tag, beforeTs, limit)` (`src/lib/server/db/repositories/monitoring.ts`): returns last `limit` rows of type REALTIME/TIMEOUT/ERROR only (overlays excluded), `{timestamp, status, raw_status}`.
- `monitorExecuteQueue.ts` worker: runs the resolver on the realtime result *before* computing `incidentData`/`maintenanceData` overlays — so the resolver currently runs even during an overlay minute.

---

## File Structure

**Modify:**
- `src/lib/server/db/repositories/monitoring.ts` — rename `getRecentObservedSamples` → `getRecentSamplesForConfirmation`; widen its type filter to observed + overlay types and return `type`; add an overlay-types constant.
- `src/lib/server/db/dbimpl.ts` — update the declaration + binding for the renamed method.
- `src/lib/server/services/confirmationThreshold.ts` — rewrite anchor + pending-run walk (skip NO_DATA neutral, break at overlay boundary); widen `ConfirmationDeps`; bump lookback limit with a buffer; drop the "#756 deferred" comment.
- `src/lib/server/queues/monitorExecuteQueue.ts` — compute overlays before the resolver; gate the resolver (no damping/backfill) when an overlay is active for `ts` (F1); update the comment.

**No doc changes:** ADR 0009 and CONTEXT.md already describe the final (post-#756) behavior.

---

## Task 1: Widen the lookback to include overlay rows + return type

**Files:**
- Modify: `src/lib/server/db/repositories/monitoring.ts`
- Modify: `src/lib/server/db/dbimpl.ts`
- Test: throwaway `verify-lookback.ts` (repo root, deleted after)

The resolver needs to *see* overlay rows (to detect the freeze boundary) and NO_DATA observed rows (to skip them), but must NOT see MANUAL/DEFAULT (those stay transparent and shouldn't consume lookback slots). So the query returns rows of type REALTIME/TIMEOUT/ERROR/INCIDENT/MAINTENANCE, newest first, including `type`.

- [ ] **Step 1: Write the failing verification script**

Create `verify-lookback.ts` in the repo root:

```typescript
import knexFactory from "knex";
import { MonitoringRepository } from "./src/lib/server/db/repositories/monitoring.js";

const k = knexFactory({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true });
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok:", m); }
async function ins(repo: any, ts: number, status: string, type: string, raw: string | null) {
  await repo.insertMonitoringData({ monitor_tag: "m", timestamp: ts, status, latency: 0, type, raw_status: raw });
}
async function main() {
  await k.schema.createTable("monitoring_data", (t) => {
    t.string("monitor_tag"); t.integer("timestamp"); t.text("status"); t.float("latency");
    t.text("type"); t.text("error_message"); t.text("raw_status"); t.primary(["monitor_tag", "timestamp"]);
  });
  const repo = new MonitoringRepository(k);
  await ins(repo, 1, "UP", "REALTIME", "UP");
  await ins(repo, 2, "MAINTENANCE", "MAINTENANCE", "DOWN");
  await ins(repo, 3, "UP", "MANUAL", "UP");        // transparent — must be excluded
  await ins(repo, 4, "UP", "DEFAULT", "UP");        // transparent — must be excluded
  await ins(repo, 5, "DOWN", "ERROR", "DOWN");
  const rows = await repo.getRecentSamplesForConfirmation("m", 6, 10);
  const types = rows.map((r: any) => r.type);
  assert(rows.length === 3, "returns observed + overlay rows only (got " + rows.length + ": " + types.join(",") + ")");
  assert(types.includes("MAINTENANCE") && types.includes("REALTIME") && types.includes("ERROR"), "includes overlay + observed types");
  assert(!types.includes("MANUAL") && !types.includes("DEFAULT"), "excludes MANUAL and DEFAULT");
  assert(rows[0].timestamp === 5, "newest first");
  assert(rows[0].type === "ERROR" && rows[0].raw_status === "DOWN", "returns type + raw_status");
  console.log("ALL PASSED"); process.exit(0);
}
main();
```

Run `npx vite-node verify-lookback.ts` → expect FAIL (`getRecentSamplesForConfirmation` not a function).

- [ ] **Step 2: Add the overlay-types constant**

In `src/lib/server/db/repositories/monitoring.ts`, just after the existing `OBSERVED_CHECK_TYPES` constant, add:

```typescript
/**
 * Overlay sample types that FREEZE Confirmation Threshold counting (issue #712 / ADR 0009):
 * while one is active the count does not advance, and it acts as a hard boundary the
 * pending run cannot cross. Included in the confirmation lookback (unlike MANUAL/DEFAULT,
 * which stay transparent) so the resolver can detect the boundary.
 */
const OVERLAY_TYPES = [GC.INCIDENT, GC.MAINTENANCE];
```

- [ ] **Step 3: Replace `getRecentObservedSamples` with `getRecentSamplesForConfirmation`**

Replace the entire `getRecentObservedSamples` method with:

```typescript
  /**
   * Recent samples the Confirmation Threshold resolver needs, newest first: scheduled-check
   * observations (REALTIME/TIMEOUT/ERROR) plus incident/maintenance overlays. MANUAL pushes
   * and DEFAULT fill are excluded — they stay transparent to the counter. Returns `type` so
   * the resolver can skip NO_DATA observations (neutral) and stop at overlay rows (freeze).
   */
  async getRecentSamplesForConfirmation(
    monitor_tag: string,
    beforeTs: number,
    limit: number,
  ): Promise<Array<{ timestamp: number; status: string | null; raw_status: string | null; type: string | null }>> {
    return await this.knex("monitoring_data")
      .select("timestamp", "status", "raw_status", "type")
      .where("monitor_tag", monitor_tag)
      .where("timestamp", "<", beforeTs)
      .whereIn("type", [...OBSERVED_CHECK_TYPES, ...OVERLAY_TYPES])
      .orderBy("timestamp", "desc")
      .limit(limit);
  }
```

- [ ] **Step 4: Update the db singleton delegation**

In `src/lib/server/db/dbimpl.ts`, rename both the declaration and the binding:
- Declaration: change `getRecentObservedSamples!: MonitoringRepository["getRecentObservedSamples"];` to `getRecentSamplesForConfirmation!: MonitoringRepository["getRecentSamplesForConfirmation"];`
- Binding: change `this.getRecentObservedSamples = this.monitoring.getRecentObservedSamples.bind(this.monitoring);` to `this.getRecentSamplesForConfirmation = this.monitoring.getRecentSamplesForConfirmation.bind(this.monitoring);`

(The resolver is the only caller; it's updated in Task 2. `backfillConfirmedStatus` is unchanged.)

- [ ] **Step 5: Run verification → expect pass**

`npx vite-node verify-lookback.ts` → expect `ALL PASSED`.

- [ ] **Step 6: Delete the script + type-check**

`rm verify-lookback.ts`; then `npm run check`. The check WILL report an error in `confirmationThreshold.ts` (it still calls the old `getRecentObservedSamples`) — that is expected and fixed in Task 2. Confirm there are no OTHER new errors. (If you prefer a green check here, you may proceed to Task 2 before committing; but commit boundaries are cleaner per-task — note the expected resolver error in your report.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/db/repositories/monitoring.ts src/lib/server/db/dbimpl.ts
git commit -m "feat(monitoring): widen confirmation lookback to include overlays + type (#756)"
```
(append a trailing line `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`)

---

## Task 2: Resolver — skip NO_DATA (neutral) + freeze at overlay boundary

**Files:**
- Modify: `src/lib/server/services/confirmationThreshold.ts`
- Test: throwaway `verify-resolver-hardening.ts` (repo root, deleted after)

- [ ] **Step 1: Write the failing verification script**

Create `verify-resolver-hardening.ts` in the repo root:

```typescript
import knexFactory from "knex";
import { MonitoringRepository } from "./src/lib/server/db/repositories/monitoring.js";
import { resolveConfirmedStatus } from "./src/lib/server/services/confirmationThreshold.js";

function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok:", m); }
async function fresh() {
  const k = knexFactory({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true });
  await k.schema.createTable("monitoring_data", (t) => {
    t.string("monitor_tag"); t.integer("timestamp"); t.text("status"); t.float("latency");
    t.text("type"); t.text("error_message"); t.text("raw_status"); t.primary(["monitor_tag", "timestamp"]);
  });
  return { k, repo: new MonitoringRepository(k) };
}
async function ins(repo: any, ts: number, status: string, raw: string | null, type = "REALTIME") {
  await repo.insertMonitoringData({ monitor_tag: "m", timestamp: ts, status, latency: 0, type, raw_status: raw });
}

async function main() {
  // --- NO_DATA neutrality: a NO_DATA observation mid-run neither advances nor resets the count.
  {
    const { repo } = await fresh();
    await ins(repo, 1, "UP", "UP");                     // confirmed UP
    let r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 2, rawStatus: "DOWN", threshold: 3 }, repo);
    await ins(repo, 2, r.status, "DOWN");               // pending (UP held)
    r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 3, rawStatus: "NO_DATA", threshold: 3 }, repo);
    assert(r.status === "NO_DATA" && r.pendingHold === false, "NO_DATA current obs passes through as NO_DATA");
    await ins(repo, 3, "NO_DATA", "NO_DATA");           // neutral gap row
    r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 4, rawStatus: "DOWN", threshold: 3 }, repo);
    assert(r.status === "UP" && r.pendingHold === true, "after DOWN,NO_DATA,DOWN count=2 (neutral skipped, not reset) -> still pending");
    await ins(repo, 4, r.status, "DOWN");
    r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 5, rawStatus: "DOWN", threshold: 3 }, repo);
    assert(r.status === "DOWN" && r.pendingHold === false, "3rd non-neutral DOWN confirms (NO_DATA did not reset)");
    const t3 = await (await fresh()); // placeholder to keep linter happy
  }

  // --- NO_DATA is never absorbed by a backfill.
  {
    const { k, repo } = await fresh();
    await ins(repo, 1, "UP", "UP");
    let r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 2, rawStatus: "DOWN", threshold: 3 }, repo);
    await ins(repo, 2, r.status, "DOWN");
    await ins(repo, 3, "NO_DATA", "NO_DATA");           // neutral, between pending failures
    r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 4, rawStatus: "DOWN", threshold: 3 }, repo);
    await ins(repo, 4, r.status, "DOWN");
    r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 5, rawStatus: "DOWN", threshold: 3 }, repo); // confirms, backfills
    const row3 = await k("monitoring_data").where({ monitor_tag: "m", timestamp: 3 }).first();
    assert(row3.status === "NO_DATA", "NO_DATA row never rewritten by backfill (stays grey)");
    const row2 = await k("monitoring_data").where({ monitor_tag: "m", timestamp: 2 }).first();
    assert(row2.status === "DOWN", "real pending DOWN rows are backfilled");
  }

  // --- Overlay freeze (F2): pre-overlay pending failures do NOT count toward the post-overlay run.
  {
    const { repo } = await fresh();
    await ins(repo, 1, "UP", "UP");                     // confirmed UP
    let r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 2, rawStatus: "DOWN", threshold: 3 }, repo);
    await ins(repo, 2, r.status, "DOWN");               // pending failure #1 (pre-overlay)
    r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 3, rawStatus: "DOWN", threshold: 3 }, repo);
    await ins(repo, 3, r.status, "DOWN");               // pending failure #2 (pre-overlay)
    await ins(repo, 4, "MAINTENANCE", "DOWN", "MAINTENANCE"); // overlay row (freeze boundary)
    r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 5, rawStatus: "DOWN", threshold: 3 }, repo);
    assert(r.status === "UP" && r.pendingHold === true, "first post-overlay failure does NOT confirm (count froze; fresh start)");
  }

  // --- Overlay freeze: fresh count after overlay still confirms after threshold consecutive post-overlay failures.
  {
    const { repo } = await fresh();
    await ins(repo, 1, "UP", "UP");
    await ins(repo, 2, "MAINTENANCE", "DOWN", "MAINTENANCE");
    let r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 3, rawStatus: "DOWN", threshold: 3 }, repo);
    await ins(repo, 3, r.status, "DOWN");
    r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 4, rawStatus: "DOWN", threshold: 3 }, repo);
    await ins(repo, 4, r.status, "DOWN");
    r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 5, rawStatus: "DOWN", threshold: 3 }, repo);
    assert(r.status === "DOWN" && r.pendingHold === false, "3 consecutive post-overlay failures confirm DOWN");
  }

  console.log("ALL PASSED"); process.exit(0);
}
main();
```

Run `npx vite-node verify-resolver-hardening.ts` → expect FAIL (current resolver resets on NO_DATA and ignores overlay boundary; also it still calls the renamed method).

- [ ] **Step 2: Rewrite the resolver**

Replace the body of `src/lib/server/services/confirmationThreshold.ts` from the `ConfirmationDeps` interface through the end of `resolveConfirmedStatus` with:

```typescript
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
```

NOTE: `confirmedSideStatus` returns the actual stored status of the confirmed side (e.g. `UP`, or `DOWN`/`DEGRADED` when recovering from an unhealthy stretch), so a held row displays the correct severity.

- [ ] **Step 3: Run verification → expect pass**

`npx vite-node verify-resolver-hardening.ts` → expect `ALL PASSED`. Also re-run the core behaviors to ensure no regression: cold start, simple confirm, absorbed blip, symmetric recovery (threshold=1 is skipped by the caller, but the resolver must still behave if called).

- [ ] **Step 4: Delete the script + type-check**

`rm verify-resolver-hardening.ts`; then `npm run check`. Expect 0 errors in `confirmationThreshold.ts` (the renamed dep now matches Task 1). Pre-existing Svelte warnings OK.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/services/confirmationThreshold.ts
git commit -m "feat(services): NO_DATA-neutral counting and overlay freeze in resolver (#756)"
```
(append a trailing line `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`)

---

## Task 3: Gate the resolver during an active overlay (F1)

**Files:**
- Modify: `src/lib/server/queues/monitorExecuteQueue.ts`

When an incident/maintenance overlay is active for the current minute, the overlay wins display and the count must freeze — the resolver must not run (no damping, no backfill) for that minute. Currently overlays (`incidentData`/`maintenanceData`) are computed *after* the resolver block, so the resolver runs unconditionally. Move the overlay computation above the resolver and gate on it.

- [ ] **Step 1: Move overlay computation above the realtime/resolver block**

In the worker, the lines:
```typescript
    let incidentData: MonitoringResultTS = await manualIncident(monitor);
    let maintenanceData: MonitoringResultTS = await manualMaintenance(monitor);
```
currently sit AFTER the `if (exeResult) { ... }` block. Move these two lines to immediately AFTER `const serviceClient = new Service(...)` and BEFORE `const exeResult = await serviceClient.execute(ts);` so the overlay state is known before the resolver runs. (Leave the later `let defaultData` / `let mergedData` declarations where they are; only move the two overlay lines. Remove the originals from their old position.)

- [ ] **Step 2: Gate the resolver on no active overlay**

Change the resolver gate condition. The block currently reads:
```typescript
      const threshold = Number(monitor.confirmation_threshold ?? 1);
      const isScheduledCheck = ([GC.REALTIME, GC.TIMEOUT, GC.ERROR] as string[]).indexOf(exeResult.type) !== -1;
      if (threshold > 1 && isScheduledCheck) {
```
Replace with:
```typescript
      const threshold = Number(monitor.confirmation_threshold ?? 1);
      const isScheduledCheck = ([GC.REALTIME, GC.TIMEOUT, GC.ERROR] as string[]).indexOf(exeResult.type) !== -1;
      // Confirmation Threshold freezes while an incident/maintenance overlay is active for this
      // minute: the overlay wins display and the count must neither advance nor backfill (#756).
      const overlayActive = incidentData[ts] !== undefined || maintenanceData[ts] !== undefined;
      if (threshold > 1 && isScheduledCheck && !overlayActive) {
```

(`raw_status` is still recorded on `realtimeData[ts]` regardless — that line stays above the gate. During an overlay minute the row's `status` is overridden by the merge to the overlay value, `type` becomes INCIDENT/MAINTENANCE, and `raw_status` keeps the observed check.)

- [ ] **Step 3: Type-check**

Run `npm run check`. Expect 0 errors in `monitorExecuteQueue.ts` (`incidentData`/`maintenanceData` are now declared earlier; make sure they are not re-declared at the old position — there must be exactly one `let incidentData` / `let maintenanceData`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/queues/monitorExecuteQueue.ts
git commit -m "feat(queues): freeze Confirmation Threshold during active overlays (#756)"
```
(append a trailing line `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`)

---

## Task 4: Cleanup deferral comments + verify DEGRADED / MANUAL / DEFAULT coverage

**Files:**
- Modify: `src/lib/server/services/confirmationThreshold.ts` (only if any "#756"/"deferred" comment remains)
- Test: throwaway `verify-756-acceptance.ts` (repo root, deleted after)

- [ ] **Step 1: Remove stale deferral comments**

Search the changed files for the string `#756` and the word `deferred`/`hardening slice`. Any comment that said a behavior is "deferred to #756" / "full neutrality is hardening slice #756" is now implemented — update or remove it so comments reflect reality. (Comments that simply *cite* `#756`/`ADR 0009` as the reason for the implemented behavior are fine to keep.)

- [ ] **Step 2: Write an acceptance verification script covering the remaining ACs**

Create `verify-756-acceptance.ts` in the repo root that wires `MonitoringRepository` + `resolveConfirmedStatus` (same harness as Task 2) and asserts:

```typescript
// AC: DEGRADED counts as not-UP; mixed DOWN/DEGRADED run confirms unhealthy.
//   confirmed UP; observe DEGRADED, DOWN with threshold 2 -> 2nd not-UP confirms; ts of the
//   first (DEGRADED) backfills to DEGRADED (its own severity), current commits DOWN.
// AC: DOWN<->DEGRADED within a confirmed-unhealthy stretch commits immediately (same side, no hold).
//   confirmed DOWN; observe DEGRADED -> resolver returns {status: "DEGRADED", pendingHold: false}.
// AC: MANUAL and DEFAULT rows are transparent — a MANUAL/DEFAULT row interleaved in the pending
//   window neither advances nor resets the count (they are excluded from the lookback).
//   confirmed UP; DOWN(pending); insert a MANUAL row and a DEFAULT row; DOWN; DOWN -> confirms at the
//   3rd REAL failure (threshold 3), MANUAL/DEFAULT ignored.
```

Implement those three scenarios with explicit `assert`s mirroring the comments (fresh in-memory db per scenario; insert MANUAL/DEFAULT rows via `ins(repo, ts, status, raw, "MANUAL")` / `"DEFAULT"`). Print `ALL PASSED` / exit 0.

Run `npx vite-node verify-756-acceptance.ts` → expect `ALL PASSED`. (These should pass with the Task 1–2 code; if the MANUAL/DEFAULT scenario fails, the lookback type filter is wrong — fix Task 1.)

- [ ] **Step 3: Delete the script**

`rm verify-756-acceptance.ts`

- [ ] **Step 4: Type-check + commit**

`npm run check` (0 errors). Then:
```bash
git add -A
git commit -m "chore(confirmation-threshold): refresh comments to reflect #756 hardening"
```
(append a trailing line `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`)

(If Step 1 found no comment changes and `git status` is clean after deleting the script, skip the commit and note it.)

---

## Task 5: End-to-end verification + group/heartbeat confirmation

**Files:** none (verification only)

- [ ] **Step 1: Full type check**

`npm run check` → 0 errors (4 pre-existing Svelte warnings OK).

- [ ] **Step 2: Consolidated end-to-end behavior (in-memory)**

Write a throwaway `verify-756-e2e.ts` simulating the per-minute write loop (resolver gated by overlay-active, then insert), asserting the full timeline for:
1. NO_DATA mid-outage does not reset (DOWN, NO_DATA, DOWN, DOWN with threshold 3 confirms; NO_DATA row stays grey, never backfilled).
2. Overlay freeze: pre-overlay pending failures + overlay + post-overlay failures → does not confirm until `threshold` consecutive POST-overlay failures; overlay-minute rows keep overlay status with raw_status recorded; resolver did NOT backfill during the overlay.
3. Mixed DOWN/DEGRADED run confirms unhealthy; backfilled rows keep their own severity.
4. Regression: the five #755 scenarios still pass (absorbed blip, real outage backfill, symmetric recovery, threshold=1 off, DEGRADED).

For the overlay-active simulation, mimic the worker gate: when the minute is an overlay minute, do NOT call the resolver — insert the overlay row directly (status=overlay, type=MAINTENANCE/INCIDENT, raw_status=observed). Otherwise run the resolver then insert.

Run it, confirm `ALL PASSED`, then `rm verify-756-e2e.ts`.

- [ ] **Step 3: Confirm group + heartbeat need no code change**

Read `src/lib/server/services/groupCall.ts` and `heartbeatCall.ts` and confirm in your report:
- Group: scores on members' cached `status` (the confirmed/damped side) → member grace propagates with no special-casing; the bounded group-history lag is the accepted divergence (ADR 0009). No code change.
- Heartbeat: produces `REALTIME` samples through the same pipeline → Confirmation Threshold applies uniformly with no per-type branching. No code change.

- [ ] **Step 4: Confirm clean tree**

`git status --porcelain` → clean (no `verify-*.ts`). `git log --oneline` shows the #756 commits.

---

## Self-Review notes (already applied)

- **AC coverage:** DEGRADED not-UP + instant severity (Task 4 + resolver `sideOf`), overlay freeze display+count (Task 3 F1 + Task 2 F2), MANUAL/DEFAULT transparent (Task 1 SQL filter + Task 4 test), NO_DATA neutral + never-backfilled (Task 2), group/heartbeat uniform (Task 5 verification). Every #756 acceptance criterion maps to a task.
- **Naming consistency:** `getRecentSamplesForConfirmation`, `OVERLAY_TYPES`, `OBSERVED_CHECK_TYPES`, `confirmedSideStatus`, `LOOKBACK_BUFFER` consistent across repo + resolver; `OVERLAY_TYPES` defined in both files must list the same `GC.INCIDENT`/`GC.MAINTENANCE`.
- **Placeholder scan:** all code steps contain concrete code; the one intentional flag (the wrong ternary in Task 2 Step 2) is explicitly corrected in Task 2 Step 3.
- **Regression guard:** Task 5 re-runs the #755 scenarios; the resolver rewrite preserves cold-start/same-side/confirm/recover semantics.

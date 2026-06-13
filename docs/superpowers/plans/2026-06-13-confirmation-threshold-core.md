# Confirmation Threshold (core: write-time damping + backfill) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-monitor `confirmation_threshold` ("grace period") that damps transient flapping on the recorded timeline at write time, with retroactive backfill on confirmation. Implements the core slice of GitHub issue #755 (parent #712).

**Architecture:** Damping happens once in the scheduled-check write path (`monitorExecuteQueue`). A new `monitoring_data.raw_status` column records what each check observed; `status` holds the confirmed side. A pure-ish resolver (`confirmationThreshold.ts`) reads recent observations and decides whether to commit the observed status, hold the confirmed side (pending), or confirm a flip and backfill the pending window. Everything downstream (uptime %, day bars, badges, alert evaluation, group scoring) inherits the damped `status` for free. See `docs/adr/0009-confirmation-threshold-write-time-backfill.md` and the "Confirmation Threshold" entry in `CONTEXT.md`.

**Tech Stack:** SvelteKit 2 / Svelte 5, Node, Knex (SQLite/Postgres/MySQL), BullMQ. TypeScript-first. No test runner exists — backend logic is verified with throwaway `vite-node` scripts against an in-memory `better-sqlite3` knex (see Task 4/5).

**Scope (this plan = #755 only):** plain `UP`/`DOWN`/`DEGRADED` scheduled checks. The following are deliberately deferred to the hardening slice #756 and must NOT be built here: overlay-freeze of the counter, `NO_DATA` neutrality, `MANUAL`/`DEFAULT` transparency nuances beyond "not counted", group-history concerns. The core resolver already passes `NO_DATA` through untouched and only counts `REALTIME`/`TIMEOUT`/`ERROR` rows, which is sufficient for #755.

---

## File Structure

**Create:**
- `migrations/20260613120000_add_confirmation_threshold_and_raw_status.ts` — adds `monitors.confirmation_threshold` (int, default 1) and `monitoring_data.raw_status` (text, nullable).
- `src/lib/server/services/confirmationThreshold.ts` — the resolver + `sideOf` helper.

**Modify:**
- `src/lib/server/types/db.ts` — add fields to `MonitorRecord`, `MonitorRecordTyped`, `MonitorRecordInsert`, `MonitoringData`, `MonitoringDataInsert`.
- `src/lib/server/types/monitor.ts` — add `raw_status?` to `MonitoringResult`.
- `src/lib/server/db/repositories/monitors.ts` — persist `confirmation_threshold` in insert/update.
- `src/lib/server/db/repositories/monitoring.ts` — write `raw_status`; add `getRecentObservedSamples` + `backfillConfirmedStatus`.
- `src/lib/server/db/dbimpl.ts` — declare + bind the two new monitoring methods.
- `src/lib/server/controllers/monitorsController.ts` — `InsertMonitoringData` forwards `raw_status`; field-copy sites (Duplicate ~265, group create ~422) include `confirmation_threshold`.
- `src/lib/server/queues/monitorExecuteQueue.ts` — call the resolver; carry `raw_status` through the merge.
- `src/lib/server/queues/monitorResponseQueue.ts` — carry `raw_status` to `InsertMonitoringData`.
- `src/routes/(api)/api/v4/monitors/+server.ts` — validate + persist `confirmation_threshold` on POST.
- `src/routes/(api)/api/v4/monitors/[monitor_tag]/+server.ts` — persist on PATCH.
- `src/lib/types/api.ts` — add `confirmation_threshold` to the monitor request/response shapes.
- `src/routes/(manage)/manage/app/monitors/[tag]/components/GeneralSettingsCard.svelte` — number input.
- `src/routes/(manage)/manage/app/monitors/[tag]/+page.svelte` — default state + load mapping.

---

## Task 1: Migration — add both columns

**Files:**
- Create: `migrations/20260613120000_add_confirmation_threshold_and_raw_status.ts`

- [ ] **Step 1: Write the migration**

```typescript
import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn("monitors", "confirmation_threshold"))) {
    await knex.schema.alterTable("monitors", (table) => {
      table.integer("confirmation_threshold").defaultTo(1);
    });
  }
  if (!(await knex.schema.hasColumn("monitoring_data", "raw_status"))) {
    await knex.schema.alterTable("monitoring_data", (table) => {
      table.text("raw_status").nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasColumn("monitors", "confirmation_threshold")) {
    await knex.schema.alterTable("monitors", (table) => {
      table.dropColumn("confirmation_threshold");
    });
  }
  if (await knex.schema.hasColumn("monitoring_data", "raw_status")) {
    await knex.schema.alterTable("monitoring_data", (table) => {
      table.dropColumn("raw_status");
    });
  }
}
```

- [ ] **Step 2: Run the migration**

Run: `npm run migrate`
Expected: completes without error; output names the new migration batch. (Local `.env` points at Postgres; that's fine for a real migration — only *verification scripts* must use in-memory sqlite.)

- [ ] **Step 3: Commit**

```bash
git add migrations/20260613120000_add_confirmation_threshold_and_raw_status.ts
git commit -m "feat(db): add confirmation_threshold and raw_status columns (#755)"
```

---

## Task 2: Type definitions

**Files:**
- Modify: `src/lib/server/types/db.ts`
- Modify: `src/lib/server/types/monitor.ts`

- [ ] **Step 1: Add `raw_status` to the monitoring data types**

In `src/lib/server/types/db.ts`, add `raw_status?: string | null;` to both `MonitoringData` (after `error_message`) and `MonitoringDataInsert` (after `error_message`):

```typescript
export interface MonitoringData {
  monitor_tag: string;
  timestamp: number;
  status: string | null;
  latency: number | null;
  type: string | null;
  error_message?: string | null;
  raw_status?: string | null;
}

export interface MonitoringDataInsert {
  monitor_tag: string;
  timestamp: number;
  status: string;
  latency: number;
  type: string;
  error_message?: string | null;
  raw_status?: string | null;
}
```

- [ ] **Step 2: Add `confirmation_threshold` to the three monitor record types**

In `src/lib/server/types/db.ts`, add `confirmation_threshold?: number | null;` to `MonitorRecord` (near `day_down_minimum_count`), `MonitorRecordTyped` (near `day_down_minimum_count`), and `MonitorRecordInsert` (near `day_down_minimum_count`). Example for `MonitorRecord`:

```typescript
  day_degraded_minimum_count?: number | null;
  day_down_minimum_count?: number | null;
  confirmation_threshold?: number | null;
  include_degraded_in_downtime?: string;
```

Repeat the identical `confirmation_threshold?: number | null;` line in `MonitorRecordTyped` and `MonitorRecordInsert` in the same relative position.

- [ ] **Step 3: Add `raw_status` to `MonitoringResult`**

In `src/lib/server/types/monitor.ts`:

```typescript
export interface MonitoringResult {
  status: string;
  latency: number;
  type: string;
  error_message?: string;
  raw_status?: string;
}
```

- [ ] **Step 4: Type-check**

Run: `npm run check`
Expected: no NEW errors referencing these files. (Note any pre-existing unrelated errors but do not fix them here.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/types/db.ts src/lib/server/types/monitor.ts
git commit -m "feat(types): add confirmation_threshold and raw_status to monitor/monitoring types (#755)"
```

---

## Task 3: Persist `confirmation_threshold` through the monitors repository + controllers

**Files:**
- Modify: `src/lib/server/db/repositories/monitors.ts`
- Modify: `src/lib/server/controllers/monitorsController.ts:265` (DuplicateMonitor insert), `:422` (group create insert)

- [ ] **Step 1: Add the column to `insertMonitor`**

In `src/lib/server/db/repositories/monitors.ts`, inside `insertMonitor`'s `.insert({...})`, add after `day_down_minimum_count: data.day_down_minimum_count,`:

```typescript
      confirmation_threshold: data.confirmation_threshold ?? 1,
```

- [ ] **Step 2: Add the column to `updateMonitor`**

In the same file, inside `updateMonitor`'s `.update({...})`, add after `day_down_minimum_count: data.day_down_minimum_count,`:

```typescript
      confirmation_threshold: data.confirmation_threshold ?? 1,
```

- [ ] **Step 3: Carry the field through the duplicate + group-create copy sites**

In `src/lib/server/controllers/monitorsController.ts`, both the `DuplicateMonitor` insert (the `db.insertMonitor({...})` block that lists `day_down_minimum_count: source.day_down_minimum_count,`) and the group-create insert (the block listing `day_down_minimum_count: group.day_down_minimum_count,`) must include the field. Add after each `day_down_minimum_count` line respectively:

```typescript
    confirmation_threshold: source.confirmation_threshold,
```

and

```typescript
      confirmation_threshold: group.confirmation_threshold,
```

(`GetMonitorsParsed` already spreads all columns, so reads need no change — the value reaches the API and the manage form automatically.)

- [ ] **Step 4: Type-check**

Run: `npm run check`
Expected: no new errors in `monitors.ts` / `monitorsController.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/db/repositories/monitors.ts src/lib/server/controllers/monitorsController.ts
git commit -m "feat(monitors): persist confirmation_threshold on create/update/duplicate/group (#755)"
```

---

## Task 4: Monitoring repository — write `raw_status` + add lookback & backfill

**Files:**
- Modify: `src/lib/server/db/repositories/monitoring.ts`
- Modify: `src/lib/server/db/dbimpl.ts:49-66` (declares) and `:409-427` (binds)
- Test: throwaway `verify-monitoring-repo.ts` (repo root, deleted after)

- [ ] **Step 1: Write the failing verification script**

Create `verify-monitoring-repo.ts` in the repo root:

```typescript
import knexFactory from "knex";
import { MonitoringRepository } from "./src/lib/server/db/repositories/monitoring.js";

const k = knexFactory({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true });

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error("FAIL:", msg); process.exit(1); }
  console.log("ok:", msg);
}

async function main() {
  await k.schema.createTable("monitoring_data", (t) => {
    t.string("monitor_tag");
    t.integer("timestamp");
    t.text("status");
    t.float("latency");
    t.text("type");
    t.text("error_message");
    t.text("raw_status");
    t.primary(["monitor_tag", "timestamp"]);
  });

  const repo = new MonitoringRepository(k);

  // insert writes raw_status
  await repo.insertMonitoringData({ monitor_tag: "m", timestamp: 100, status: "UP", latency: 1, type: "REALTIME", raw_status: "DOWN" });
  const row = await k("monitoring_data").where({ monitor_tag: "m", timestamp: 100 }).first();
  assert(row.raw_status === "DOWN", "insertMonitoringData persists raw_status");

  // getRecentObservedSamples filters to scheduled-check types, newest first, before ts
  await repo.insertMonitoringData({ monitor_tag: "m", timestamp: 101, status: "UP", latency: 0, type: "TIMEOUT", raw_status: "DOWN" });
  await repo.insertMonitoringData({ monitor_tag: "m", timestamp: 102, status: "UP", latency: 0, type: "MAINTENANCE", raw_status: null });
  await repo.insertMonitoringData({ monitor_tag: "m", timestamp: 103, status: "UP", latency: 0, type: "REALTIME", raw_status: "UP" });
  const recent = await repo.getRecentObservedSamples("m", 104, 5);
  assert(recent.length === 3, "getRecentObservedSamples excludes overlay rows (got " + recent.length + ")");
  assert(recent[0].timestamp === 103, "newest first");
  assert(recent.every((r: any) => r.timestamp < 104), "respects beforeTs");

  // backfillConfirmedStatus sets status = raw_status, with message for non-UP rows
  await repo.backfillConfirmedStatus("m", [100, 101], "Down confirmed after 3 consecutive checks");
  const r100 = await k("monitoring_data").where({ monitor_tag: "m", timestamp: 100 }).first();
  assert(r100.status === "DOWN", "backfill sets status from raw_status");
  assert(r100.error_message === "Down confirmed after 3 consecutive checks", "backfill applies message");

  console.log("ALL PASSED");
  process.exit(0);
}
main();
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vite-node verify-monitoring-repo.ts`
Expected: FAIL — `getRecentObservedSamples`/`backfillConfirmedStatus` are not functions (not implemented yet). If you hit `ERR_DLOPEN_FAILED`/NODE_MODULE_VERSION, run `npm rebuild better-sqlite3` first.

- [ ] **Step 3: Write `raw_status` into `insertMonitoringData`**

In `src/lib/server/db/repositories/monitoring.ts`, update `insertMonitoringData` to destructure and persist `raw_status`:

```typescript
  async insertMonitoringData(data: MonitoringDataInsert): Promise<MonitoringData | null> {
    const { monitor_tag, timestamp, status, latency, type, error_message, raw_status } = data;

    await this.knex("monitoring_data")
      .insert({ monitor_tag, timestamp, status, latency, type, error_message, raw_status })
      .onConflict(["monitor_tag", "timestamp"])
      .merge({ status, latency, type, error_message, raw_status });

    const record = await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .where("timestamp", timestamp)
      .first();

    return record as MonitoringData | null;
  }
```

- [ ] **Step 4: Add the two new methods**

In the same file, add after `consecutivelyLatencyLessThan` (the `ALERT_VISIBLE_TYPES` const at the top of the file already exists; the new lookback uses its own narrower set):

```typescript
  /**
   * Most recent scheduled-check observations before `beforeTs`, newest first.
   * Only REALTIME/TIMEOUT/ERROR rows — overlays, MANUAL, and DEFAULT are excluded so they
   * stay transparent to Confirmation Threshold counting (issue #712 / ADR 0009).
   */
  async getRecentObservedSamples(
    monitor_tag: string,
    beforeTs: number,
    limit: number,
  ): Promise<Array<{ timestamp: number; status: string | null; raw_status: string | null }>> {
    return await this.knex("monitoring_data")
      .select("timestamp", "status", "raw_status")
      .where("monitor_tag", monitor_tag)
      .where("timestamp", "<", beforeTs)
      .whereIn("type", [GC.REALTIME, GC.TIMEOUT, GC.ERROR])
      .orderBy("timestamp", "desc")
      .limit(limit);
  }

  /**
   * Backfill a confirmed status flip: set each row's committed status to its observed
   * raw_status. `message` is applied to error_message (use a generic string for confirmed
   * outages, null for confirmed recoveries).
   */
  async backfillConfirmedStatus(
    monitor_tag: string,
    timestamps: number[],
    message: string | null,
  ): Promise<number> {
    if (timestamps.length === 0) return 0;
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .whereIn("timestamp", timestamps)
      .update({
        status: this.knex.ref("raw_status"),
        error_message: message,
      });
  }
```

- [ ] **Step 5: Declare + bind the methods on the db singleton**

In `src/lib/server/db/dbimpl.ts`, add to the declarations block (after `consecutivelyLatencyLessThan!`):

```typescript
  getRecentObservedSamples!: MonitoringRepository["getRecentObservedSamples"];
  backfillConfirmedStatus!: MonitoringRepository["backfillConfirmedStatus"];
```

And in the constructor binding block (after the `consecutivelyLatencyLessThan` bind):

```typescript
    this.getRecentObservedSamples = this.monitoring.getRecentObservedSamples.bind(this.monitoring);
    this.backfillConfirmedStatus = this.monitoring.backfillConfirmedStatus.bind(this.monitoring);
```

- [ ] **Step 6: Run the verification script — expect pass**

Run: `npx vite-node verify-monitoring-repo.ts`
Expected: `ALL PASSED`.

- [ ] **Step 7: Delete the throwaway script**

Run: `rm verify-monitoring-repo.ts`

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/db/repositories/monitoring.ts src/lib/server/db/dbimpl.ts
git commit -m "feat(monitoring): persist raw_status; add observed-sample lookback and confirmed-status backfill (#755)"
```

---

## Task 5: The Confirmation Threshold resolver

**Files:**
- Create: `src/lib/server/services/confirmationThreshold.ts`
- Test: throwaway `verify-confirmation.ts` (repo root, deleted after)

The resolver takes a dependency object (defaulting to the `db` singleton) so it can be verified against an in-memory `MonitoringRepository`.

- [ ] **Step 1: Write the failing verification script**

Create `verify-confirmation.ts` in the repo root:

```typescript
import knexFactory from "knex";
import { MonitoringRepository } from "./src/lib/server/db/repositories/monitoring.js";
import { resolveConfirmedStatus, sideOf } from "./src/lib/server/services/confirmationThreshold.js";

const k = knexFactory({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true });

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error("FAIL:", msg); process.exit(1); }
  console.log("ok:", msg);
}

async function insert(repo: any, ts: number, status: string, raw: string, type = "REALTIME") {
  await repo.insertMonitoringData({ monitor_tag: "m", timestamp: ts, status, latency: 0, type, raw_status: raw });
}

async function main() {
  await k.schema.createTable("monitoring_data", (t) => {
    t.string("monitor_tag"); t.integer("timestamp"); t.text("status"); t.float("latency");
    t.text("type"); t.text("error_message"); t.text("raw_status"); t.primary(["monitor_tag", "timestamp"]);
  });
  const repo = new MonitoringRepository(k);

  assert(sideOf("UP") === "UP" && sideOf("DOWN") === "DOWN" && sideOf("DEGRADED") === "DOWN" && sideOf("NO_DATA") === null, "sideOf binary mapping");

  // Cold start: first observation bootstraps immediately.
  let r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 100, rawStatus: "DOWN", threshold: 3 }, repo);
  assert(r.status === "DOWN" && r.clean === false, "cold start bootstraps observed side");
  await insert(repo, 100, "DOWN", "DOWN");

  // Confirmed DOWN, healthy blip shorter than threshold stays... start fresh scenario:
  // Confirmed UP, then failing blips hold UP (pending) until threshold.
  const k2 = knexFactory({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true });
  await k2.schema.createTable("monitoring_data", (t) => {
    t.string("monitor_tag"); t.integer("timestamp"); t.text("status"); t.float("latency");
    t.text("type"); t.text("error_message"); t.text("raw_status"); t.primary(["monitor_tag", "timestamp"]);
  });
  const repo2 = new MonitoringRepository(k2);
  await insert(repo2, 1, "UP", "UP"); // confirmed UP

  r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 2, rawStatus: "DOWN", threshold: 3 }, repo2);
  assert(r.status === "UP" && r.clean === true, "1st failure pending -> holds UP clean");
  await insert(repo2, 2, "UP", "DOWN"); // pending row: displayed UP, observed DOWN

  r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 3, rawStatus: "DOWN", threshold: 3 }, repo2);
  assert(r.status === "UP" && r.clean === true, "2nd failure pending -> still UP");
  await insert(repo2, 3, "UP", "DOWN");

  r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 4, rawStatus: "DOWN", threshold: 3 }, repo2);
  assert(r.status === "DOWN" && r.clean === false, "3rd consecutive failure confirms DOWN");
  const bf2 = await k2("monitoring_data").where("monitor_tag", "m").andWhere("timestamp", 2).first();
  const bf3 = await k2("monitoring_data").where("monitor_tag", "m").andWhere("timestamp", 3).first();
  assert(bf2.status === "DOWN" && bf3.status === "DOWN", "pending window backfilled to DOWN (outage starts at first failure)");

  // Blip that recovers before threshold leaves history UP.
  const k3 = knexFactory({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true });
  await k3.schema.createTable("monitoring_data", (t) => {
    t.string("monitor_tag"); t.integer("timestamp"); t.text("status"); t.float("latency");
    t.text("type"); t.text("error_message"); t.text("raw_status"); t.primary(["monitor_tag", "timestamp"]);
  });
  const repo3 = new MonitoringRepository(k3);
  await insert(repo3, 1, "UP", "UP");
  r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 2, rawStatus: "DOWN", threshold: 3 }, repo3);
  await insert(repo3, 2, r.status, "DOWN"); // holds UP
  r = await resolveConfirmedStatus({ monitor_tag: "m", ts: 3, rawStatus: "UP", threshold: 3 }, repo3);
  assert(r.status === "UP" && r.clean === false, "recovery before threshold -> blip absorbed, stays UP");
  const blip = await k3("monitoring_data").where("monitor_tag", "m").andWhere("timestamp", 2).first();
  assert(blip.status === "UP" && blip.raw_status === "DOWN", "absorbed blip: status UP, raw_status retained for forensics");

  console.log("ALL PASSED");
  process.exit(0);
}
main();
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vite-node verify-confirmation.ts`
Expected: FAIL — module `confirmationThreshold.js` not found.

- [ ] **Step 3: Implement the resolver**

Create `src/lib/server/services/confirmationThreshold.ts`:

```typescript
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
  threshold: number; // always >= 2 when this is called
}

export interface ResolveResult {
  /** Effective status to commit for this minute. */
  status: string;
  /** True when displaying the held confirmed side (pending) — caller should blank latency/error. */
  clean: boolean;
}

/** Minimal data access this resolver needs; defaults to the db singleton, injectable for tests. */
export interface ConfirmationDeps {
  getRecentObservedSamples: typeof db.getRecentObservedSamples;
  backfillConfirmedStatus: typeof db.backfillConfirmedStatus;
}

export async function resolveConfirmedStatus(
  input: ResolveInput,
  deps: ConfirmationDeps = db,
): Promise<ResolveResult> {
  const { monitor_tag, ts, rawStatus, threshold } = input;
  const observedSide = sideOf(rawStatus);

  // Neutral observation (NO_DATA): pass through untouched (full neutrality is hardening slice #756).
  if (observedSide === null) {
    return { status: rawStatus, clean: false };
  }

  const recent = await deps.getRecentObservedSamples(monitor_tag, ts, threshold);

  // Cold start: no prior observation to anchor against -> commit immediately.
  if (recent.length === 0) {
    return { status: rawStatus, clean: false };
  }

  const confirmedStatus = recent[0].status ?? rawStatus;
  const confirmedSide = sideOf(confirmedStatus);

  // Same side, or anchor is neutral: no flip — commit the observed status (and its severity).
  if (confirmedSide === null || observedSide === confirmedSide) {
    return { status: rawStatus, clean: false };
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
    const message = observedSide === "DOWN" ? `Down confirmed after ${threshold} consecutive checks` : null;
    await deps.backfillConfirmedStatus(monitor_tag, pendingTimestamps, message);
    return { status: rawStatus, clean: false };
  }

  // Still pending: hold the confirmed side, display clean.
  return { status: confirmedStatus, clean: true };
}
```

- [ ] **Step 4: Run the verification script — expect pass**

Run: `npx vite-node verify-confirmation.ts`
Expected: `ALL PASSED`.

- [ ] **Step 5: Delete the throwaway script**

Run: `rm verify-confirmation.ts`

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/services/confirmationThreshold.ts
git commit -m "feat(services): add Confirmation Threshold resolver with retroactive backfill (#755)"
```

---

## Task 6: Wire the resolver into the write path + plumb `raw_status`

**Files:**
- Modify: `src/lib/server/queues/monitorExecuteQueue.ts`
- Modify: `src/lib/server/queues/monitorResponseQueue.ts`
- Modify: `src/lib/server/controllers/monitorsController.ts:102-116` (`InsertMonitoringData`)

- [ ] **Step 1: Import the resolver in the execute queue**

In `src/lib/server/queues/monitorExecuteQueue.ts`, add to imports:

```typescript
import { resolveConfirmedStatus } from "../services/confirmationThreshold.js";
```

- [ ] **Step 2: Apply grace + record raw_status after the check runs**

In the worker, replace the block:

```typescript
    const exeResult = await serviceClient.execute(ts);

    let realtimeData: MonitoringResultTS = {};
    if (exeResult) {
      realtimeData[ts] = exeResult;
    }
```

with:

```typescript
    const exeResult = await serviceClient.execute(ts);

    let realtimeData: MonitoringResultTS = {};
    if (exeResult) {
      realtimeData[ts] = exeResult;
      // Always record what the check actually observed (forensics + grace counting).
      realtimeData[ts].raw_status = exeResult.status;

      // Confirmation Threshold damping (#712 / ADR 0009): scheduled checks only.
      const threshold = Number(monitor.confirmation_threshold ?? 1);
      const isScheduledCheck = ([GC.REALTIME, GC.TIMEOUT, GC.ERROR] as string[]).indexOf(exeResult.type) !== -1;
      if (threshold > 1 && isScheduledCheck) {
        const resolved = await resolveConfirmedStatus({
          monitor_tag: monitor.tag,
          ts,
          rawStatus: exeResult.status,
          threshold,
        });
        realtimeData[ts].status = resolved.status;
        if (resolved.clean) {
          realtimeData[ts].latency = 0;
          delete realtimeData[ts].error_message;
        }
      }
    }
```

- [ ] **Step 3: Carry `raw_status` across the merge**

In the same worker, after the existing "Preserve latency from realtime monitoring" loop and before the `monitorResponseQueue.push` loop, add:

```typescript
    // Preserve raw_status from realtime monitoring (overlays replace the merged object wholesale,
    // so re-attach the observed value the resolver recorded).
    for (const timestamp in mergedData) {
      const ts = parseInt(timestamp);
      if (realtimeData[ts]?.raw_status !== undefined) {
        mergedData[ts].raw_status = realtimeData[ts].raw_status;
      }
    }
```

- [ ] **Step 4: Forward `raw_status` through the response queue**

In `src/lib/server/queues/monitorResponseQueue.ts`, add `raw_status` to `JobData`:

```typescript
interface JobData {
  status: string;
  latency: number;
  type: string;
  monitorTag: string;
  ts: number;
  error_message?: string | null;
  raw_status?: string | null;
}
```

In the worker, destructure and forward it:

```typescript
    const { monitorTag, ts, status, latency, type, error_message, raw_status } = job.data as JobData;

    const dbRes = await InsertMonitoringData({
      monitor_tag: monitorTag,
      timestamp: ts,
      status: status,
      latency: latency,
      type: type,
      error_message: error_message,
      raw_status: raw_status,
    });
```

(The `push` function already spreads `...result` into the job payload, so `raw_status` rides along — no change needed there.)

- [ ] **Step 5: Accept + forward `raw_status` in `InsertMonitoringData`**

In `src/lib/server/controllers/monitorsController.ts`, add `raw_status?: string | null;` to the `MonitoringDataInput` interface, and forward it in the `db.insertMonitoringData({...})` call:

```typescript
interface MonitoringDataInput {
  monitor_tag: string;
  timestamp: number;
  status: string;
  latency?: number;
  type: string;
  error_message?: string | null;
  raw_status?: string | null;
}
```

```typescript
  return await db.insertMonitoringData({
    monitor_tag: data.monitor_tag,
    timestamp: data.timestamp,
    status: data.status,
    latency: data.latency || 0,
    type: data.type,
    error_message: data.error_message,
    raw_status: data.raw_status,
  });
```

- [ ] **Step 6: Type-check**

Run: `npm run check`
Expected: no new errors in the touched files.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/queues/monitorExecuteQueue.ts src/lib/server/queues/monitorResponseQueue.ts src/lib/server/controllers/monitorsController.ts
git commit -m "feat(queues): apply Confirmation Threshold in write path and persist raw_status (#755)"
```

---

## Task 7: v4 API — accept `confirmation_threshold`

**Files:**
- Modify: `src/routes/(api)/api/v4/monitors/+server.ts` (POST)
- Modify: `src/routes/(api)/api/v4/monitors/[monitor_tag]/+server.ts` (PATCH)
- Modify: `src/lib/types/api.ts`

- [ ] **Step 1: Add the field to the API request/response types**

In `src/lib/types/api.ts`, add `confirmation_threshold?: number | null;` to the create-monitor request type (`CreateMonitorRequest`) and the update/patch request type, alongside fields like `include_degraded_in_downtime`. If the monitor response type is a re-export of `MonitorRecordTyped`, no response change is needed (it already includes the field from Task 2); otherwise add `confirmation_threshold?: number | null;` to it too.

- [ ] **Step 2: Validate + persist on POST**

In `src/routes/(api)/api/v4/monitors/+server.ts`, before the `const monitorData = {...}` block, add validation:

```typescript
  let confirmationThreshold = 1;
  if (body.confirmation_threshold !== undefined && body.confirmation_threshold !== null) {
    const ct = Number(body.confirmation_threshold);
    if (!Number.isInteger(ct) || ct < 1 || ct > 60) {
      const errorResponse: BadRequestResponse = {
        error: { code: "BAD_REQUEST", message: "confirmation_threshold must be an integer between 1 and 60" },
      };
      return json(errorResponse, { status: 400 });
    }
    confirmationThreshold = ct;
  }
```

Then add to the `monitorData` object:

```typescript
    confirmation_threshold: confirmationThreshold,
```

- [ ] **Step 3: Validate + persist on PATCH**

In `src/routes/(api)/api/v4/monitors/[monitor_tag]/+server.ts`, alongside the other `updateData.X = body.X !== undefined ? ... : existingMonitor.X` lines, add:

```typescript
  if (body.confirmation_threshold !== undefined && body.confirmation_threshold !== null) {
    const ct = Number(body.confirmation_threshold);
    if (!Number.isInteger(ct) || ct < 1 || ct > 60) {
      const errorResponse: BadRequestResponse = {
        error: { code: "BAD_REQUEST", message: "confirmation_threshold must be an integer between 1 and 60" },
      };
      return json(errorResponse, { status: 400 });
    }
    updateData.confirmation_threshold = ct;
  } else {
    updateData.confirmation_threshold = existingMonitor.confirmation_threshold ?? 1;
  }
```

- [ ] **Step 4: Type-check**

Run: `npm run check`
Expected: no new errors in the API files.

- [ ] **Step 5: Commit**

```bash
git add "src/routes/(api)/api/v4/monitors/+server.ts" "src/routes/(api)/api/v4/monitors/[monitor_tag]/+server.ts" src/lib/types/api.ts
git commit -m "feat(api): accept confirmation_threshold on v4 monitor create/update (#755)"
```

---

## Task 8: Manage UI — "Grace period" input

**Files:**
- Modify: `src/routes/(manage)/manage/app/monitors/[tag]/components/GeneralSettingsCard.svelte`
- Modify: `src/routes/(manage)/manage/app/monitors/[tag]/+page.svelte`

- [ ] **Step 1: Default the field for new monitors**

In `src/routes/(manage)/manage/app/monitors/[tag]/+page.svelte`, in the `let monitor = $state<MonitorRecord>({...})` default object, add after `is_hidden: "NO",`:

```typescript
    confirmation_threshold: 1,
```

- [ ] **Step 2: Map it when loading an existing monitor**

In the `fetchMonitor` success branch, in the `monitor = {...}` mapping object, add after `is_hidden: m.is_hidden || "NO",`:

```typescript
          confirmation_threshold: m.confirmation_threshold ?? 1,
```

- [ ] **Step 3: Add the input to the settings card**

In `src/routes/(manage)/manage/app/monitors/[tag]/components/GeneralSettingsCard.svelte`, inside the `<div class="grid grid-cols-2 gap-4">` block that holds Default Status + Hidden, add a third field (a new `<div class="flex flex-col gap-2">`) after the Hidden block's closing `</div>`:

```svelte
      <div class="flex flex-col gap-2">
        <Label for="monitor-confirmation-threshold">Grace period</Label>
        <Input
          id="monitor-confirmation-threshold"
          type="number"
          min="1"
          max="60"
          value={monitor.confirmation_threshold ?? 1}
          oninput={(e) => {
            const v = parseInt((e.currentTarget as HTMLInputElement).value, 10);
            monitor.confirmation_threshold = Number.isNaN(v) ? 1 : Math.min(60, Math.max(1, v));
          }}
        />
        <p class="text-muted-foreground text-xs">
          Require this many consecutive checks before a status change is recorded. 1 = off (record every check immediately).
        </p>
      </div>
```

(`saveGeneralSettings` already posts `...monitor`, so the value is sent automatically.)

- [ ] **Step 4: Validate the component**

Run: `npm run check`
Expected: no new errors in the two files.

- [ ] **Step 5: Commit**

```bash
git add "src/routes/(manage)/manage/app/monitors/[tag]/components/GeneralSettingsCard.svelte" "src/routes/(manage)/manage/app/monitors/[tag]/+page.svelte"
git commit -m "feat(ui): add Grace period input to monitor general settings (#755)"
```

---

## Task 9: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full type check**

Run: `npm run check`
Expected: no new errors introduced by this work.

- [ ] **Step 2: Live smoke test (round-trip + damping)**

Restart the dev app so the cron/queue process picks up new code (per the verification recipe, `vite-node startup.ts` does NOT hot-reload): stop and re-run `npm run dev`.

Then:
1. Create or edit a PING monitor via the manage UI; set **Grace period = 3**, save. Reload the page and confirm it persists as 3.
2. Confirm round-trip via API: `GET /api/v4/monitors/<tag>` (Bearer key) returns `confirmation_threshold: 3`.
3. Point the monitor at a reachable target; let it record a few `UP` minutes.
4. Break the target (e.g. wrong host) for 2 check intervals → status page should still show **UP** (pending), bars stay green.
5. Leave it broken for a 3rd consecutive check → status flips to **DOWN**, and the 2 prior pending minutes backfill to DOWN (outage reads from the first failure). Verify the rows via `GET /api/v4/monitors/<tag>/data` or the manage data view.
6. Restore the target → after 3 consecutive `UP` checks the monitor flips back to UP with the recovery window backfilled.
7. Set Grace period back to **1** on another monitor and confirm behavior is unchanged from today (every check committed immediately, `raw_status` mirrors `status`).

- [ ] **Step 3: Confirm no throwaway scripts remain**

Run: `git status --porcelain`
Expected: clean (no `verify-*.ts` files left untracked).

---

## Self-Review notes (already applied)

- **Spec coverage:** config persistence (Tasks 1–3, 7, 8), `raw_status` write + lookback + backfill (Task 4), symmetric resolver with bootstrap (Task 5), write-path wiring + plumbing + clean pending display (Task 6), alert composition (alerts read damped `status` after backfill via the existing `monitorResponseQueue` → `alertingQueue` order — backfill in Task 6 Step 2 runs before the push loop), default-off behavior (threshold≤1 short-circuit in Task 6 Step 2). Deferred items (overlay freeze, full NO_DATA neutrality, group/heartbeat edges) are explicitly out of scope → slice #756.
- **Type consistency:** `getRecentObservedSamples` / `backfillConfirmedStatus` / `resolveConfirmedStatus` / `sideOf` names match across Tasks 4–6; `raw_status` field name consistent across types, repo, queues, controller, migration.
- **Placeholder scan:** every code step contains concrete code; verification steps give exact commands + expected output.

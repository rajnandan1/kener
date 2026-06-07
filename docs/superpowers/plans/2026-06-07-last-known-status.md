# Last Known Status (fix #721) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `LAST_KNOWN` Default Status choice for NONE-type (Manual) monitors: each scheduler tick without new data writes a `CARRIED` sample repeating the most recent alert-visible sample (status + latency), so push-driven monitors keep their status between pushes.

**Architecture:** The carry fill slots into the existing `defaultData` branch of the monitor-execute worker (`monitorExecuteQueue.ts`), sourcing from a new repository query for the latest alert-visible sample. A single normalization helper in `monitorsController.ts` enforces the closed `default_status` value set (`NONE|UP|DOWN|DEGRADED|LAST_KNOWN`) and the "LAST_KNOWN only on NONE-type, auto-reset to UP otherwise" rule across all three monitor write paths (manage UI action, v4 POST, v4 PATCH). A migration normalizes legacy values (`MAINTENANCE`/unknown/NULL → `NONE`).

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), Knex migrations, BullMQ workers, shadcn-svelte UI.

**Design authority:** `docs/adr/0006-last-known-status-fill.md` and the `Default Status` / `Last Known Status` / `Alert-Visible Sample` entries in `CONTEXT.md`. If a step seems to contradict those, the docs win.

**Verification approach:** This repo has NO test infrastructure (no test script, no tests/ dir). Backend logic is verified with throwaway `vite-node` scripts driving repository classes against in-memory better-sqlite3 (delete the scripts before committing), plus a live end-to-end pass against the dev server. `npm run check` gates every commit.

---

### Task 1: Constants + alert-visible whitelist

**Files:**
- Modify: `src/lib/global-constants.ts:43`
- Modify: `src/lib/server/db/repositories/monitoring.ts:13-20`

- [ ] **Step 1: Add the two constants**

In `src/lib/global-constants.ts`, the default export object currently has (line 43):

```typescript
  DEFAULT_STATUS: "DEFAULT",
```

Add two lines directly after it:

```typescript
  DEFAULT_STATUS: "DEFAULT",
  CARRIED: "CARRIED",
  LAST_KNOWN: "LAST_KNOWN",
```

(`CARRIED` is a **sample type** written by last-known-status fill; `LAST_KNOWN` is a **default_status value** stored on the monitor. They are different namespaces that happen to live in the same constants object — keep both names exactly as above.)

- [ ] **Step 2: Add CARRIED to the alert-visible whitelist**

In `src/lib/server/db/repositories/monitoring.ts`, replace lines 13-20:

```typescript
/**
 * Sample types alert evaluation can see (see docs/adr/0005-alerts-evaluate-alert-visible-samples.md).
 * Exactly the types written by flows that enqueue alert evaluation: scheduler checks
 * (REALTIME/ERROR/TIMEOUT), default-status fill (DEFAULT_STATUS), and data-API pushes (MANUAL).
 * SIGNAL rows (raw heartbeat receipts) and INCIDENT/MAINTENANCE overlays stay invisible, so the
 * alert window freezes during manual overlays instead of triggering or resolving on them.
 */
const ALERT_VISIBLE_TYPES = [GC.REALTIME, GC.ERROR, GC.TIMEOUT, GC.MANUAL, GC.DEFAULT_STATUS];
```

with:

```typescript
/**
 * Sample types alert evaluation can see (see docs/adr/0005-alerts-evaluate-alert-visible-samples.md
 * and docs/adr/0006-last-known-status-fill.md).
 * Exactly the types written by flows that enqueue alert evaluation: scheduler checks
 * (REALTIME/ERROR/TIMEOUT), default-status fill (DEFAULT_STATUS), last-known-status fill (CARRIED),
 * and data-API pushes (MANUAL).
 * SIGNAL rows (raw heartbeat receipts) and INCIDENT/MAINTENANCE overlays stay invisible, so the
 * alert window freezes during manual overlays instead of triggering or resolving on them.
 */
const ALERT_VISIBLE_TYPES = [GC.REALTIME, GC.ERROR, GC.TIMEOUT, GC.MANUAL, GC.DEFAULT_STATUS, GC.CARRIED];
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: 0 errors (same error/warning count as before the change — run it on a clean tree first if unsure).

- [ ] **Step 4: Commit**

```bash
git add src/lib/global-constants.ts src/lib/server/db/repositories/monitoring.ts
git commit -m "feat(constants): add CARRIED sample type and LAST_KNOWN default status"
```

---

### Task 2: Repository — latest alert-visible sample query

**Files:**
- Modify: `src/lib/server/db/repositories/monitoring.ts` (after `getLatestMonitoringData`, line 79)
- Modify: `src/lib/server/db/dbimpl.ts:52-53` (declaration) and `:412` (binding)

- [ ] **Step 1: Add the repository method**

In `src/lib/server/db/repositories/monitoring.ts`, directly after the `getLatestMonitoringData` method (ends line 79), add:

```typescript
  /**
   * Latest sample the alert evaluator (and last-known-status fill) can see.
   * Carry source for Default Status = LAST_KNOWN (docs/adr/0006): overlays
   * (INCIDENT/MAINTENANCE) and raw heartbeat receipts (SIGNAL) are excluded,
   * so they can never become sticky.
   */
  async getLatestAlertVisibleData(monitor_tag: string): Promise<MonitoringData | undefined> {
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .whereIn("type", ALERT_VISIBLE_TYPES)
      .orderBy("timestamp", "desc")
      .limit(1)
      .first();
  }
```

- [ ] **Step 2: Expose it on the db singleton**

In `src/lib/server/db/dbimpl.ts`, after line 52 (`getLatestMonitoringData!: ...`), add the declaration:

```typescript
  getLatestAlertVisibleData!: MonitoringRepository["getLatestAlertVisibleData"];
```

and after line 412 (`this.getLatestMonitoringData = ...bind(this.monitoring);`), add the binding:

```typescript
    this.getLatestAlertVisibleData = this.monitoring.getLatestAlertVisibleData.bind(this.monitoring);
```

- [ ] **Step 3: Write the throwaway verification script**

Create `scripts/tmp-verify-carry-source.ts` (will be deleted, never committed):

```typescript
import Knex from "knex";
import { MonitoringRepository } from "../src/lib/server/db/repositories/monitoring";

const knex = Knex({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true });

await knex.schema.createTable("monitoring_data", (t) => {
  t.string("monitor_tag");
  t.integer("timestamp");
  t.string("status");
  t.float("latency");
  t.string("type");
  t.text("error_message");
  t.primary(["monitor_tag", "timestamp"]);
});

const repo = new MonitoringRepository(knex);

// Timeline: MANUAL DOWN, then a CARRIED copy, then an INCIDENT overlay, then a SIGNAL receipt.
await knex("monitoring_data").insert([
  { monitor_tag: "t", timestamp: 100, status: "DOWN", latency: 42, type: "MANUAL" },
  { monitor_tag: "t", timestamp: 160, status: "DOWN", latency: 42, type: "CARRIED" },
  { monitor_tag: "t", timestamp: 220, status: "UP", latency: 0, type: "INCIDENT" },
  { monitor_tag: "t", timestamp: 280, status: "UP", latency: 0, type: "SIGNAL" },
]);

const latest = await repo.getLatestAlertVisibleData("t");
console.log("latest:", latest);
if (!latest || latest.timestamp !== 160 || latest.type !== "CARRIED" || latest.status !== "DOWN") {
  throw new Error("FAIL: expected the CARRIED row at ts=160 (INCIDENT/SIGNAL must be skipped)");
}

const none = await repo.getLatestAlertVisibleData("missing");
if (none !== undefined) throw new Error("FAIL: expected undefined for unknown tag");

console.log("PASS");
await knex.destroy();
```

- [ ] **Step 4: Run it**

Run: `npx vite-node scripts/tmp-verify-carry-source.ts`
Expected: prints the ts=160 CARRIED row, then `PASS`.

- [ ] **Step 5: Delete the script, type-check, commit**

```bash
rm scripts/tmp-verify-carry-source.ts
npm run check
git add src/lib/server/db/repositories/monitoring.ts src/lib/server/db/dbimpl.ts
git commit -m "feat(db): add getLatestAlertVisibleData query for last-known-status carry source"
```

---

### Task 3: Engine — carry fill in the execute worker

**Files:**
- Modify: `src/lib/server/queues/monitorExecuteQueue.ts:125-156`

- [ ] **Step 1: Extend the defaultData branch**

In `src/lib/server/queues/monitorExecuteQueue.ts`, replace lines 125-139:

```typescript
    let defaultData: MonitoringResultTS = {};
    let mergedData: MonitoringResultTS = {};

    if (monitor.default_status !== undefined && monitor.default_status !== null) {
      if (([GC.UP, GC.DOWN, GC.DEGRADED] as string[]).indexOf(monitor.default_status) !== -1) {
        defaultData[ts] = {
          status: monitor.default_status,
          latency: 0,
          type: GC.DEFAULT_STATUS,
        };
        if (monitor.default_status !== GC.UP) {
          defaultData[ts].error_message = "Default status applied";
        }
      }
    }
```

with:

```typescript
    let defaultData: MonitoringResultTS = {};
    let mergedData: MonitoringResultTS = {};

    if (monitor.default_status !== undefined && monitor.default_status !== null) {
      if (([GC.UP, GC.DOWN, GC.DEGRADED] as string[]).indexOf(monitor.default_status) !== -1) {
        defaultData[ts] = {
          status: monitor.default_status,
          latency: 0,
          type: GC.DEFAULT_STATUS,
        };
        if (monitor.default_status !== GC.UP) {
          defaultData[ts].error_message = "Default status applied";
        }
      } else if (monitor.default_status === GC.LAST_KNOWN) {
        // Last Known Status fill (docs/adr/0006): repeat the most recent alert-visible
        // sample — status and latency alike. No sample yet → nothing to carry → no fill.
        const lastKnown = await db.getLatestAlertVisibleData(monitor.tag);
        if (lastKnown && lastKnown.status) {
          defaultData[ts] = {
            status: lastKnown.status,
            latency: lastKnown.latency ?? 0,
            type: GC.CARRIED,
          };
          if (lastKnown.status !== GC.UP) {
            defaultData[ts].error_message = "Last known status applied";
          }
        }
      }
    }
```

- [ ] **Step 2: Fix the NO_DATA-preference block to preserve the fill's type**

Still in the same file, the block at (previously) lines 141-156 hardcodes `type: GC.DEFAULT_STATUS` when realtime returns NO_DATA but a fill exists. A heartbeat monitor with `LAST_KNOWN` would mislabel its carried rows. Replace:

```typescript
    const defaultStatus = defaultData[ts]?.status;
    const realtimeStatus = realtimeData[ts]?.status;
    let realtimeDataForMerge = realtimeData;
    if (defaultStatus && realtimeStatus === GC.NO_DATA) {
      // Apply the preference *before* merging so incident/maintenance can still override later.
      // Also avoid carrying over realtime NO_DATA error_message.
      realtimeDataForMerge = { ...realtimeData };
      realtimeDataForMerge[ts] = {
        ...realtimeDataForMerge[ts],
        status: defaultStatus,
        type: GC.DEFAULT_STATUS,
      };
      delete realtimeDataForMerge[ts].error_message;
    }
```

with:

```typescript
    const defaultStatus = defaultData[ts]?.status;
    const realtimeStatus = realtimeData[ts]?.status;
    let realtimeDataForMerge = realtimeData;
    if (defaultStatus && realtimeStatus === GC.NO_DATA) {
      // Apply the preference *before* merging so incident/maintenance can still override later.
      // Also avoid carrying over realtime NO_DATA error_message.
      // Keep the fill's own type: DEFAULT for fixed fill, CARRIED for last-known fill.
      realtimeDataForMerge = { ...realtimeData };
      realtimeDataForMerge[ts] = {
        ...realtimeDataForMerge[ts],
        status: defaultStatus,
        type: defaultData[ts].type,
      };
      delete realtimeDataForMerge[ts].error_message;
    }
```

Note: `latency` in this branch intentionally stays whatever realtime reported — unchanged from today for fixed fill; for LAST_KNOWN-on-heartbeat the carried latency was already placed in `defaultData[ts]` and `mergedData` spread order (`{ ...defaultData, ...realtimeDataForMerge, ... }`) means the realtime object wins the spread; this matches existing fixed-fill behavior, do not "improve" it here.

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: 0 new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/queues/monitorExecuteQueue.ts
git commit -m "feat(scheduler): write CARRIED samples for LAST_KNOWN default status fixes #721"
```

(Live behavior is verified end-to-end in Task 8 — the worker needs Redis + the cron loop, so there is no isolated script for this task.)

---

### Task 4: Normalization chokepoint for all monitor writes

**Files:**
- Modify: `src/lib/server/controllers/monitorsController.ts` (near `CreateUpdateMonitor`, line 193)
- Modify: `src/routes/(api)/api/v4/monitors/+server.ts:104-121`
- Modify: `src/routes/(api)/api/v4/monitors/[monitor_tag]/+server.ts:72-78`

- [ ] **Step 1: Add the helper to monitorsController.ts**

Directly above `CreateUpdateMonitor` (line 193), add:

```typescript
const VALID_DEFAULT_STATUSES = ["NONE", GC.UP, GC.DOWN, GC.DEGRADED, GC.LAST_KNOWN] as const;

/**
 * Enforce the closed default_status value set and the LAST_KNOWN scope rule
 * (docs/adr/0006): LAST_KNOWN is only meaningful on NONE-type (Manual) monitors;
 * on any other type it silently resets to UP so the invalid combination never persists.
 * Throws on values outside the closed set.
 */
export const NormalizeDefaultStatus = (
  monitorType: string | null | undefined,
  defaultStatus: string | null | undefined,
): string => {
  const value = defaultStatus ?? "NONE";
  if (!(VALID_DEFAULT_STATUSES as readonly string[]).includes(value)) {
    throw new Error(`default_status must be one of: ${VALID_DEFAULT_STATUSES.join(", ")}`);
  }
  if (value === GC.LAST_KNOWN && monitorType !== "NONE") {
    return GC.UP;
  }
  return value;
};
```

(`monitorsController.ts` already imports `GC` at line 25 — no import change needed.)

- [ ] **Step 2: Apply it in the manage-UI path**

Replace `CreateUpdateMonitor` (lines 193-201):

```typescript
export const CreateUpdateMonitor = async (monitor: MonitorInput): Promise<number | number[]> => {
  let monitorData = { ...monitor };
  if (monitorData.id) {
    return await db.updateMonitor(monitorData as MonitorRecord);
  } else {
    validateMonitorTag(monitorData.tag);
    return await db.insertMonitor(monitorData);
  }
};
```

with:

```typescript
export const CreateUpdateMonitor = async (monitor: MonitorInput): Promise<number | number[]> => {
  let monitorData = { ...monitor };
  monitorData.default_status = NormalizeDefaultStatus(monitorData.monitor_type, monitorData.default_status);
  if (monitorData.id) {
    return await db.updateMonitor(monitorData as MonitorRecord);
  } else {
    validateMonitorTag(monitorData.tag);
    return await db.insertMonitor(monitorData);
  }
};
```

(The manage API route at `src/routes/(manage)/manage/api/+server.ts` wraps the action switch in try/catch (line 660) and surfaces thrown `Error.message` — no route change needed.)

- [ ] **Step 3: Apply it in v4 POST**

In `src/routes/(api)/api/v4/monitors/+server.ts`, add to the imports from the monitors controller (`GetMonitorsParsed` is already imported — extend that import):

```typescript
import { GetMonitorsParsed, NormalizeDefaultStatus } from "$lib/server/controllers/monitorsController";
```

(match the existing import line's exact shape — if `GetMonitorsParsed` is imported from a different specifier, add `NormalizeDefaultStatus` to that same line).

Then replace line 111:

```typescript
    default_status: body.default_status ?? "UP",
```

with a pre-validated variable. Above the `const monitorData = {` block (line 104), insert:

```typescript
  let defaultStatus: string;
  try {
    defaultStatus = NormalizeDefaultStatus(body.monitor_type ?? "API", body.default_status ?? "UP");
  } catch (e) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "Invalid default_status",
      },
    };
    return json(errorResponse, { status: 400 });
  }
```

and in `monitorData` use:

```typescript
    default_status: defaultStatus,
```

- [ ] **Step 4: Apply it in v4 PATCH**

In `src/routes/(api)/api/v4/monitors/[monitor_tag]/+server.ts`, the handler resolves `updateData.monitor_type` at line 78 *after* `updateData.default_status` at line 75 — the normalization must run after BOTH are resolved. Replace line 75:

```typescript
  updateData.default_status = body.default_status !== undefined ? body.default_status : existingMonitor.default_status;
```

with (keep it in place so field ordering stays readable, but move the value through the helper after line 78):

```typescript
  updateData.default_status = body.default_status !== undefined ? body.default_status : existingMonitor.default_status;
```

…and after line 78 (`updateData.monitor_type = ...`), insert:

```typescript
  // Closed-set validation + LAST_KNOWN scope rule (docs/adr/0006). Runs after monitor_type
  // is resolved so a type change away from NONE auto-resets LAST_KNOWN to UP.
  try {
    updateData.default_status = NormalizeDefaultStatus(
      updateData.monitor_type as string,
      updateData.default_status as string | null,
    );
  } catch (e) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "Invalid default_status",
      },
    };
    return json(errorResponse, { status: 400 });
  }
```

Add `NormalizeDefaultStatus` to this file's monitors-controller import the same way as in Step 3.

- [ ] **Step 5: Verify with a throwaway script**

Create `scripts/tmp-verify-normalize.ts`:

```typescript
import { NormalizeDefaultStatus } from "../src/lib/server/controllers/monitorsController";

const cases: Array<[string, string | null, string]> = [
  ["NONE", "LAST_KNOWN", "LAST_KNOWN"], // allowed on Manual monitors
  ["API", "LAST_KNOWN", "UP"], // auto-reset on any other type
  ["NONE", null, "NONE"], // null → NONE
  ["API", "DOWN", "DOWN"], // fixed values pass through
];
for (const [type, input, expected] of cases) {
  const got = NormalizeDefaultStatus(type, input);
  if (got !== expected) throw new Error(`FAIL: (${type}, ${input}) → ${got}, expected ${expected}`);
}
let threw = false;
try {
  NormalizeDefaultStatus("API", "MAINTENANCE");
} catch {
  threw = true;
}
if (!threw) throw new Error("FAIL: MAINTENANCE must be rejected");
console.log("PASS");
```

Run: `npx vite-node scripts/tmp-verify-normalize.ts`
Expected: `PASS`. (Importing monitorsController transitively pulls in the db singleton; vite-node loads the repo `.env` automatically, so the configured `DATABASE_URL`/`REDIS_URL` satisfy it. If module side-effects still fail outside the dev process, inline the `NormalizeDefaultStatus` cases into a temporary copy instead — the function is pure.)

- [ ] **Step 6: Delete script, type-check, commit**

```bash
rm scripts/tmp-verify-normalize.ts
npm run check
git add src/lib/server/controllers/monitorsController.ts "src/routes/(api)/api/v4/monitors/+server.ts" "src/routes/(api)/api/v4/monitors/[monitor_tag]/+server.ts"
git commit -m "feat(api): enforce closed default_status set with LAST_KNOWN scope rule"
```

---

### Task 5: Migration — normalize legacy default_status values

**Files:**
- Create: `migrations/20260607150000_normalize_default_status.ts`

- [ ] **Step 1: Write the migration**

```typescript
import type { Knex } from "knex";

// Closed default_status set as of docs/adr/0006. MAINTENANCE was offered by the old
// UI but never honored by the fill engine — it behaved exactly like "no fill", so it
// (and any other unknown value, and NULL) normalizes to NONE, preserving behavior.
const VALID = ["NONE", "UP", "DOWN", "DEGRADED", "LAST_KNOWN"];

export async function up(knex: Knex): Promise<void> {
  await knex("monitors").whereNull("default_status").update({ default_status: "NONE" });
  await knex("monitors").whereNotIn("default_status", VALID).update({ default_status: "NONE" });
}

export async function down(): Promise<void> {
  // Irreversible by design: the values rewritten to NONE were dead (never honored
  // by the fill engine), so there is nothing meaningful to restore.
}
```

- [ ] **Step 2: Run it against the dev database**

Run: `npm run migrate`
Expected: `Batch N run: 1 migrations` with no errors.

- [ ] **Step 3: Spot-check via the dev API**

With the dev server running (`npm run dev` if not already):

```bash
curl -s 'http://localhost:3000/api/v4/monitors' -H 'Authorization: Bearer <API_KEY>' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);const bad=(r.monitors||r.data||[]).filter(m=>!['NONE','UP','DOWN','DEGRADED','LAST_KNOWN'].includes(m.default_status));console.log('invalid default_status rows:',bad.length)})"
```

Expected: `invalid default_status rows: 0`.

- [ ] **Step 4: Commit**

```bash
git add migrations/20260607150000_normalize_default_status.ts
git commit -m "feat(db): migrate default_status to closed value set"
```

---

### Task 6: Manage UI — dropdown options + callout + auto-reset

**Files:**
- Modify: `src/routes/(manage)/manage/app/monitors/[tag]/components/GeneralSettingsCard.svelte:230-247`

**REQUIRED SUB-SKILL for this task: `svelte-code-writer` (per CLAUDE.md, mandatory for all .svelte edits).**

- [ ] **Step 1: Add imports and labels**

In the `<script lang="ts">` block (GC is already imported at line 20), add to the imports:

```typescript
  import * as Alert from "$lib/components/ui/alert/index.js";
  import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
```

and below the props destructuring add:

```typescript
  const defaultStatusLabels: Record<string, string> = {
    NONE: "None (show gaps as no data)",
    UP: "UP",
    DOWN: "DOWN",
    DEGRADED: "DEGRADED",
    LAST_KNOWN: "Last known status",
  };

  // LAST_KNOWN is only valid on Manual (NONE-type) monitors; the server enforces the
  // same rule (NormalizeDefaultStatus), this effect just keeps the UI honest live.
  $effect(() => {
    if (monitor.monitor_type !== "NONE" && monitor.default_status === GC.LAST_KNOWN) {
      monitor.default_status = GC.UP;
      toast.info("Default status was reset to UP — Last known status is only available for Manual monitors.");
    }
  });
```

(`toast` is already imported from `svelte-sonner` at line 16.)

- [ ] **Step 2: Replace the Default Status select**

Replace lines 230-247:

```svelte
        <Label for="monitor-default-status">Default Status</Label>
        <Select.Root
          type="single"
          value={monitor.default_status}
          onValueChange={(v) => {
            if (v) monitor.default_status = v;
          }}
        >
          <Select.Trigger id="monitor-default-status" class="w-full">
            {monitor.default_status}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="UP">UP</Select.Item>
            <Select.Item value="DOWN">DOWN</Select.Item>
            <Select.Item value="DEGRADED">DEGRADED</Select.Item>
            <Select.Item value="MAINTENANCE">MAINTENANCE</Select.Item>
          </Select.Content>
        </Select.Root>
```

with:

```svelte
        <Label for="monitor-default-status">Default Status</Label>
        <Select.Root
          type="single"
          value={monitor.default_status ?? "NONE"}
          onValueChange={(v) => {
            if (v) monitor.default_status = v;
          }}
        >
          <Select.Trigger id="monitor-default-status" class="w-full">
            {defaultStatusLabels[monitor.default_status ?? "NONE"] ?? monitor.default_status}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="NONE">None (show gaps as no data)</Select.Item>
            <Select.Item value="UP">UP</Select.Item>
            <Select.Item value="DOWN">DOWN</Select.Item>
            <Select.Item value="DEGRADED">DEGRADED</Select.Item>
            {#if monitor.monitor_type === "NONE"}
              <Select.Item value="LAST_KNOWN">Last known status</Select.Item>
            {/if}
          </Select.Content>
        </Select.Root>
        {#if monitor.default_status === GC.LAST_KNOWN}
          <Alert.Root>
            <TriangleAlertIcon />
            <Alert.Title>Last known status</Alert.Title>
            <Alert.Description>
              <p>
                Kener will repeat the most recent status and latency every minute until your integration sends new
                data.
              </p>
              <ul class="list-disc pl-4">
                <li>
                  If your integration stops sending, the page keeps showing the last status indefinitely — Kener
                  cannot tell "still up" from "stopped reporting". Use a Heartbeat monitor to catch a silent
                  integration.
                </li>
                <li>
                  Carried minutes count toward alert thresholds: a single DOWN push will trigger alerts after your
                  failure threshold, and they stay triggered until you push a recovery.
                </li>
              </ul>
            </Alert.Description>
          </Alert.Root>
        {/if}
```

- [ ] **Step 3: Run the svelte autofixer / check**

Run: `npm run check`
Expected: 0 new errors or warnings for `GeneralSettingsCard.svelte`. Also run the svelte MCP autofixer on the component if the svelte-code-writer skill instructs it.

- [ ] **Step 4: Visual verification**

With `npm run dev` running, screenshot the editor for the seeded NONE-type monitor (`earth`):

```bash
npx playwright screenshot --channel chrome --color-scheme light --viewport-size "1440,900" --full-page --wait-for-timeout 3000 http://localhost:3000/manage/app/monitors/earth /tmp/lk-ui.png
```

(Authed page — if it renders the login screen, follow the storage-state cookie recipe in the project memory `kener-ui-verification-recipe`, or verify manually in the browser.)
Expected: dropdown shows the five options ("Last known status" present because earth is Manual/NONE type, "MAINTENANCE" gone); selecting "Last known status" reveals the callout.

- [ ] **Step 5: Commit**

```bash
git add "src/routes/(manage)/manage/app/monitors/[tag]/components/GeneralSettingsCard.svelte"
git commit -m "feat(manage): Last known status option with callout in Default Status dropdown"
```

---

### Task 7: Docs — ADR cross-link + user documentation

**Files:**
- Modify: `docs/adr/0005-alerts-evaluate-alert-visible-samples.md` (append one sentence)
- Modify: `src/routes/(docs)/docs/content/v4/monitors/overview.md` (Default Status section)

**REQUIRED SUB-SKILL for the `src/routes/(docs)/docs/content/` edit: `documentation-writer` (per CLAUDE.md, mandatory for docs content).**

- [ ] **Step 1: Amend ADR 0005**

Append this sentence to the end of the first paragraph of `docs/adr/0005-alerts-evaluate-alert-visible-samples.md` (after "...remain invisible to alerting."):

```
Amended by ADR 0006: last-known-status fill (`CARRIED`) later joined the alert-visible set under the same invariant.
```

- [ ] **Step 2: Document Last Known Status in the monitor docs**

`src/routes/(docs)/docs/content/v4/monitors/overview.md` does not mention `default_status` today (verified) — add a new "Default Status" section to it. Following the documentation-writer skill's conventions, document:

- The five values: `NONE`, `UP`, `DOWN`, `DEGRADED`, `LAST_KNOWN`.
- `LAST_KNOWN` is only accepted for Manual (`NONE`-type) monitors; on any other type the API resets it to `UP`.
- Behavior: every minute without new data, Kener writes a `CARRIED` sample repeating the most recent alert-visible sample (status and latency). Carry never expires and starts at the next tick after the setting is saved (no backfill).
- The two warnings from the UI callout (stale-forever if the integration goes silent → use a Heartbeat monitor; carried minutes count toward alert thresholds and alerts only resolve on a pushed recovery).
- A curl example mirroring #721's flow:

```bash
curl -X PATCH 'https://status.example.com/api/v4/monitors/my-service/data/{current_unix_minute}' \
  -H 'Authorization: Bearer <api-key>' \
  -H 'Content-Type: application/json' \
  --data '{"status": "DOWN", "latency": 100}'
# With Default Status = Last known status, the monitor stays DOWN until you push UP.
```

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0005-alerts-evaluate-alert-visible-samples.md "src/routes/(docs)/docs/content/v4/monitors/overview.md"
git commit -m "docs: document Last known status default and amend ADR 0005"
```

---

### Task 8: End-to-end verification against the dev server

**Files:** none (verification only; uses the running `npm run dev` with Redis + Postgres up)

- [ ] **Step 1: Create a throwaway NONE monitor with LAST_KNOWN**

```bash
curl -s -X POST 'http://localhost:3000/api/v4/monitors' \
  -H 'Authorization: Bearer <API_KEY>' -H 'Content-Type: application/json' \
  --data '{"tag":"lk-e2e","name":"LK E2E","monitor_type":"NONE","default_status":"LAST_KNOWN","cron":"* * * * *"}'
```

Expected: 201, monitor JSON with `"default_status":"LAST_KNOWN"`.

- [ ] **Step 2: Confirm no fill before any push**

Wait ~70 seconds (one scheduler tick), then:

```bash
NOW=$(date -u +%s); curl -s "http://localhost:3000/api/v4/monitors/lk-e2e/data?start_ts=$((NOW-300))&end_ts=$NOW" -H 'Authorization: Bearer <API_KEY>'
```

Expected: `{"data":[]}` — nothing to carry yet (never-pushed monitors stay no-data).

- [ ] **Step 3: Push DOWN once, watch CARRIED rows appear**

```bash
NOW=$(date -u +%s)
curl -s -X PATCH "http://localhost:3000/api/v4/monitors/lk-e2e/data/$NOW" \
  -H 'Authorization: Bearer <API_KEY>' -H 'Content-Type: application/json' \
  --data '{"status":"DOWN","latency":2201}'
```

Wait ~130 seconds (two ticks), then re-run the Step 2 range query.
Expected: one `"type":"MANUAL"` DOWN row at the pushed minute, followed by `"type":"CARRIED"` rows with `"status":"DOWN","latency":2201` for each subsequent minute.

- [ ] **Step 4: Push recovery, confirm carry follows**

Repeat Step 3's PATCH with `{"status":"UP","latency":5}`. Wait ~70s.
Expected: subsequent CARRIED rows are `UP` with latency 5. The status page (`http://localhost:3000`) shows the monitor UP with the red DOWN window in today's bar.

- [ ] **Step 5: Verify the type-change auto-reset**

```bash
curl -s -X PATCH 'http://localhost:3000/api/v4/monitors/lk-e2e' \
  -H 'Authorization: Bearer <API_KEY>' -H 'Content-Type: application/json' \
  --data '{"monitor_type":"API","type_data":{"url":"https://example.com","timeout":5000}}'
```

Expected: 200 with `"default_status":"UP"` in the response (LAST_KNOWN auto-reset because the type left NONE). Then verify rejection:

```bash
curl -s -X PATCH 'http://localhost:3000/api/v4/monitors/lk-e2e' \
  -H 'Authorization: Bearer <API_KEY>' -H 'Content-Type: application/json' \
  --data '{"default_status":"MAINTENANCE"}'
```

Expected: 400 with `default_status must be one of: NONE, UP, DOWN, DEGRADED, LAST_KNOWN`.

- [ ] **Step 6: Clean up the test monitor**

The v4 monitor route has no DELETE handler (only GET/PATCH), so delete via the manage API action the dashboard uses, or from the UI at `http://localhost:3000/manage/app/monitors/lk-e2e` (Danger Zone → Delete). Verify it is gone from `http://localhost:3000/`.

- [ ] **Step 7: Final gate**

Run: `npm run check && npm run prettify`
Expected: clean check; prettify produces no diff beyond the files already touched (re-commit formatting if it does).

---

## Self-review notes

- **Spec coverage:** Q1 dropdown (Task 6), Q2 MAINTENANCE migration + closed set (Tasks 4, 5, 6), Q3 carry source (Task 2), Q4 CARRIED type + whitelist (Task 1), Q5 status+latency payload (Task 3), Q6/Q7 NONE-only + auto-reset (Tasks 4, 6), Q8 no expiry (no code — absence is the feature; documented in Task 7), Q9 tick-forward/no-backfill (no code — the engine only writes at `ts`; verified in Task 8 Step 2-3), Q10 alert consequences (Task 1 whitelist + existing evaluator, no further code), Q11 callout copy (Task 6).
- **Known non-goals:** no staleness cap, no backfill, no purge on disable, no change to `CloneMonitor` (it copies `monitor_type` + `default_status` together from an already-normalized source, so the pair stays valid).
- **Pre-existing race left untouched (deliberate):** a same-minute tick can overwrite a just-pushed MANUAL row's type via the response-queue upsert; this exists today for DEFAULT fill and is orthogonal to this change.

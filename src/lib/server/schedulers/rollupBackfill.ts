import db from "$lib/server/db/db";
import { rebuildAllBucketsForTag } from "../db/repositories/monitoringBuckets.js";

/**
 * One-time backfill of monitoring_data_bucket from the existing raw history.
 *
 * Kept out of the Knex migration on purpose. Migrations run while the app is
 * starting, and on a large install this walks millions of rows, so doing it in
 * a migration would hold up the boot and, on Postgres, hold a lock while it
 * did. Here it runs after startup, one monitor at a time, and records progress
 * so a restart continues instead of beginning again.
 *
 * Nothing reads the rollup yet. This only fills it so it can be checked against
 * the raw data before any read path is switched over.
 */
const STATE_KEY = "monitoringRollupBackfill";

interface BackfillState {
  done: boolean;
  completedTags: string[];
}

const readState = async (): Promise<BackfillState> => {
  const row = await db.getSiteDataByKey(STATE_KEY);
  if (!row?.value) return { done: false, completedTags: [] };
  try {
    const parsed = JSON.parse(row.value) as Partial<BackfillState>;
    return { done: parsed.done === true, completedTags: parsed.completedTags ?? [] };
  } catch {
    return { done: false, completedTags: [] };
  }
};

const writeState = async (state: BackfillState): Promise<void> => {
  await db.insertOrUpdateSiteData(STATE_KEY, JSON.stringify(state), "object");
};

/** How long to wait before another attempt when some monitors failed. */
const RETRY_DELAY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function runRollupBackfill(): Promise<{ built: number; skipped: number; failed: number }> {
  const state = await readState();
  if (state.done) return { built: 0, skipped: 0, failed: 0 };

  const monitors = await db.getMonitors({});
  const completed = new Set(state.completedTags);
  let built = 0;
  let skipped = 0;
  let failed = 0;

  for (const monitor of monitors) {
    if (completed.has(monitor.tag)) {
      skipped++;
      continue;
    }
    try {
      // One transaction per monitor, so a failure part way through leaves the
      // finished monitors intact and only retries the one that failed.
      const count = await db.rebuildAllBucketsForTag(monitor.tag);
      built += count;
      completed.add(monitor.tag);
      await writeState({ done: false, completedTags: [...completed] });
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Rollup backfill failed for ${monitor.tag}: ${message}`);
    }
  }

  const allDone = monitors.every((m) => completed.has(m.tag));
  await writeState({ done: allDone, completedTags: [...completed] });
  if (allDone) {
    console.log(`Rollup backfill complete: ${built} buckets built, ${skipped} monitors already done.`);
  }

  return { built, skipped, failed };
}

/**
 * Runs the backfill and tries again if any monitor failed.
 *
 * A failure is usually transient, for example a busy database. Without a retry
 * the monitors that failed would stay without a rollup until the next restart,
 * because the backfill only ran at startup.
 */
export async function runRollupBackfillWithRetry(attempt = 1): Promise<void> {
  try {
    const { failed } = await runRollupBackfill();
    if (failed === 0 || attempt >= MAX_ATTEMPTS) {
      if (failed > 0) {
        console.log(`Rollup backfill gave up after ${attempt} attempts with ${failed} monitor(s) incomplete.`);
      }
      return;
    }
    console.log(`Rollup backfill has ${failed} monitor(s) left, trying again in ${RETRY_DELAY_MS / 60000} minutes.`);
  } catch (error) {
    if (attempt >= MAX_ATTEMPTS) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Rollup backfill gave up after ${attempt} attempts: ${message}`);
      return;
    }
  }

  const timer = setTimeout(() => {
    void runRollupBackfillWithRetry(attempt + 1);
  }, RETRY_DELAY_MS);
  // Do not hold the process open just for a retry.
  if (typeof timer.unref === "function") timer.unref();
}

export default { runRollupBackfill, runRollupBackfillWithRetry };

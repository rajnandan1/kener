import type { Knex } from "knex";

/**
 * Bucket width for the monitoring_data rollup, in seconds.
 *
 * 15 minutes, because the status page asks for days that begin at midnight in
 * the VIEWER's timezone, not at UTC midnight. Every current IANA offset is a
 * whole number of 15 minute steps (including the :30 and :45 ones, such as
 * India and Chatham), so any viewer's day is an exact whole number of buckets.
 * A daily rollup would put outages on the wrong day for anyone off UTC.
 */
export const BUCKET_SECONDS = 900;

/** Start of the bucket that contains `ts`. */
export const bucketStart = (ts: number): number => Math.floor(ts / BUCKET_SECONDS) * BUCKET_SECONDS;

/**
 * The bucket-start expression, per dialect.
 *
 * MySQL has no INTEGER cast target, so a plain CAST(... AS INTEGER) is a syntax
 * error there. SQLite has no FLOOR. This mirrors the split already used by
 * getStatusCountsByIntervalGroupedByMonitor.
 */
export function bucketExpression(knex: Knex | Knex.Transaction): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (knex as any).client?.config?.client;
  const isSQLite = client === "better-sqlite3" || client === "sqlite3";
  return isSQLite ? `CAST(timestamp / ? AS INT) * ?` : `FLOOR(timestamp / ?) * ?`;
}

/** True when the connection cannot take row locks, which is SQLite. */
export function isSingleWriter(knex: Knex | Knex.Transaction): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (knex as any).client?.config?.client;
  return client === "better-sqlite3" || client === "sqlite3";
}

export interface BucketRow {
  monitor_tag: string;
  bucket_ts: number;
  count_of_up: number;
  count_of_down: number;
  count_of_degraded: number;
  count_of_maintenance: number;
  latency_sum: number;
  latency_count: number;
  max_latency: number | null;
  min_latency: number | null;
}

/**
 * Aggregates raw rows into bucket rows for one monitor over [fromTs, toTs).
 *
 * Deliberately does NOT filter on `type`, and takes latency over every row in
 * the bucket regardless of status. That matches what the live query does today,
 * so switching a read over to the rollup cannot change a published number.
 * Latency is kept as a sum and a count so buckets can be added together.
 */
export async function aggregateRawIntoBuckets(
  knex: Knex | Knex.Transaction,
  monitorTag: string,
  fromTs: number,
  toTs: number,
): Promise<BucketRow[]> {
  const bucketExpr = bucketExpression(knex);
  const rows = await knex("monitoring_data")
    .select(
      knex.raw(`${bucketExpr} as bucket_ts`, [BUCKET_SECONDS, BUCKET_SECONDS]),
      knex.raw("SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END) as count_of_up"),
      knex.raw("SUM(CASE WHEN status = 'DOWN' THEN 1 ELSE 0 END) as count_of_down"),
      knex.raw("SUM(CASE WHEN status = 'DEGRADED' THEN 1 ELSE 0 END) as count_of_degraded"),
      knex.raw("SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) as count_of_maintenance"),
      knex.raw("SUM(latency) as latency_sum"),
      knex.raw("COUNT(latency) as latency_count"),
      knex.raw("MAX(latency) as max_latency"),
      knex.raw("MIN(latency) as min_latency"),
    )
    .where("monitor_tag", monitorTag)
    .where("timestamp", ">=", fromTs)
    .where("timestamp", "<", toTs)
    .groupByRaw(bucketExpr, [BUCKET_SECONDS, BUCKET_SECONDS]);

  return (rows as Array<Record<string, unknown>>).map((r) => ({
    monitor_tag: monitorTag,
    bucket_ts: Number(r.bucket_ts),
    count_of_up: Number(r.count_of_up ?? 0),
    count_of_down: Number(r.count_of_down ?? 0),
    count_of_degraded: Number(r.count_of_degraded ?? 0),
    count_of_maintenance: Number(r.count_of_maintenance ?? 0),
    latency_sum: Number(r.latency_sum ?? 0),
    latency_count: Number(r.latency_count ?? 0),
    max_latency: r.max_latency === null || r.max_latency === undefined ? null : Number(r.max_latency),
    min_latency: r.min_latency === null || r.min_latency === undefined ? null : Number(r.min_latency),
  }));
}

/**
 * Rebuilds every bucket overlapping [fromTs, toTs] for one monitor.
 *
 * Always a full recompute from the raw rows, never a delta. The raw table is
 * written with upsert-and-merge, and overlays and the grace period rewrite rows
 * that already exist, so adding or subtracting a delta would drift. A recompute
 * is also idempotent, so a retry cannot corrupt a bucket.
 *
 * Buckets left with no raw rows are deleted rather than kept at zero, so that
 * "no data" and "all checks failed" stay distinguishable.
 */
export async function rebuildBuckets(
  trx: Knex.Transaction,
  monitorTag: string,
  fromTs: number,
  toTs: number,
): Promise<number> {
  const rangeStart = bucketStart(fromTs);
  const rangeEnd = bucketStart(toTs) + BUCKET_SECONDS;

  // Serialise rebuilds for this monitor. Several response workers can write
  // different timestamps for the same monitor at once, and the backfill can
  // overlap them. Without this, two transactions each read a snapshot that is
  // missing the other's row and the later write replaces the bucket with counts
  // that are short. Taking the monitor row first makes them queue instead.
  // SQLite takes a database-wide write lock already, so it needs nothing here.
  if (!isSingleWriter(trx)) {
    await trx("monitors").where("tag", monitorTag).forUpdate().first();
  }

  const fresh = await aggregateRawIntoBuckets(trx, monitorTag, rangeStart, rangeEnd);

  // Clear the window first so buckets whose raw rows were deleted disappear
  // instead of lingering with stale counts.
  await trx("monitoring_data_bucket")
    .where("monitor_tag", monitorTag)
    .where("bucket_ts", ">=", rangeStart)
    .where("bucket_ts", "<", rangeEnd)
    .del();

  if (fresh.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < fresh.length; i += batchSize) {
      await trx("monitoring_data_bucket").insert(fresh.slice(i, i + batchSize));
    }
  }

  return fresh.length;
}

/** Rebuilds every bucket for a monitor, used by the backfill. */
export async function rebuildAllBucketsForTag(trx: Knex.Transaction, monitorTag: string): Promise<number> {
  const bounds = (await trx("monitoring_data")
    .where("monitor_tag", monitorTag)
    .min({ lo: "timestamp" })
    .max({ hi: "timestamp" })
    .first()) as { lo: number | null; hi: number | null } | undefined;

  if (!bounds || bounds.lo === null || bounds.hi === null) {
    await trx("monitoring_data_bucket").where("monitor_tag", monitorTag).del();
    return 0;
  }

  return await rebuildBuckets(trx, monitorTag, bounds.lo, bounds.hi);
}

/** Drops buckets that fall entirely before `cutoff`, mirroring retention deletes. */
export async function deleteBucketsBefore(knex: Knex | Knex.Transaction, cutoff: number): Promise<number> {
  return await knex("monitoring_data_bucket").where("bucket_ts", "<", bucketStart(cutoff)).del();
}

export interface BucketDivergence {
  monitor_tag: string;
  bucket_ts: number;
  field: string;
  raw: number | null;
  rollup: number | null;
}

/**
 * Compares the rollup against the raw rows for one monitor and reports any
 * difference. Used by the verify job so the rollup can be proven correct in
 * production before anything reads from it.
 */
export async function verifyBucketsForTag(
  knex: Knex,
  monitorTag: string,
  fromTs: number,
  toTs: number,
): Promise<BucketDivergence[]> {
  const expected = await aggregateRawIntoBuckets(
    knex,
    monitorTag,
    bucketStart(fromTs),
    bucketStart(toTs) + BUCKET_SECONDS,
  );
  const storedRows = (await knex("monitoring_data_bucket")
    .where("monitor_tag", monitorTag)
    .where("bucket_ts", ">=", bucketStart(fromTs))
    .where("bucket_ts", "<", bucketStart(toTs) + BUCKET_SECONDS)) as BucketRow[];

  const stored = new Map(storedRows.map((r) => [r.bucket_ts, r]));
  const out: BucketDivergence[] = [];
  const fields: Array<keyof BucketRow> = [
    "count_of_up",
    "count_of_down",
    "count_of_degraded",
    "count_of_maintenance",
    "latency_sum",
    "latency_count",
    "max_latency",
    "min_latency",
  ];

  for (const want of expected) {
    const got = stored.get(want.bucket_ts);
    if (!got) {
      out.push({ monitor_tag: monitorTag, bucket_ts: want.bucket_ts, field: "*", raw: 1, rollup: null });
      continue;
    }
    for (const f of fields) {
      const a = want[f] as number | null;
      const b = got[f] as number | null;
      // Latency sums are floats, so compare them with a tolerance.
      const same = a === null || b === null ? a === b : Math.abs(Number(a) - Number(b)) < 0.001;
      if (!same) {
        out.push({ monitor_tag: monitorTag, bucket_ts: want.bucket_ts, field: f, raw: a, rollup: b });
      }
    }
    stored.delete(want.bucket_ts);
  }

  // Anything left in the rollup has no raw rows behind it.
  for (const [ts] of stored) {
    out.push({ monitor_tag: monitorTag, bucket_ts: ts, field: "*", raw: null, rollup: 1 });
  }

  return out;
}

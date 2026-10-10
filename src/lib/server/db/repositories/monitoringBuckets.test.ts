import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Knex from "knex";
import type { Knex as KnexType } from "knex";
import {
  BUCKET_SECONDS,
  bucketExpression,
  isSingleWriter,
  aggregateRawIntoBuckets,
  bucketStart,
  deleteBucketsBefore,
  rebuildAllBucketsForTag,
  rebuildBuckets,
  verifyBucketsForTag,
} from "./monitoringBuckets";

let knex: KnexType;

const DAY = 86400;
// A fixed UTC midnight, so the fixtures do not move with the wall clock.
const T0 = 1767225600; // 2026-01-01T00:00:00Z

beforeEach(async () => {
  knex = Knex({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true });
  await knex.schema.createTable("monitoring_data", (t) => {
    t.string("monitor_tag", 255).notNullable();
    t.integer("timestamp").notNullable();
    t.text("status");
    t.float("latency");
    t.text("type");
    t.text("raw_status");
    t.text("error_message");
    t.primary(["monitor_tag", "timestamp"]);
  });
  await knex.schema.createTable("monitoring_data_bucket", (t) => {
    t.string("monitor_tag", 255).notNullable();
    t.integer("bucket_ts").notNullable();
    t.integer("count_of_up").notNullable().defaultTo(0);
    t.integer("count_of_down").notNullable().defaultTo(0);
    t.integer("count_of_degraded").notNullable().defaultTo(0);
    t.integer("count_of_maintenance").notNullable().defaultTo(0);
    t.float("latency_sum").notNullable().defaultTo(0);
    t.integer("latency_count").notNullable().defaultTo(0);
    t.float("max_latency");
    t.float("min_latency");
    t.primary(["monitor_tag", "bucket_ts"]);
  });
});

afterEach(async () => {
  await knex.destroy();
});

/** Writes one row per minute over `minutes`, cycling through the given statuses. */
async function seed(tag: string, from: number, minutes: number, statuses: string[] = ["UP"]) {
  const rows = Array.from({ length: minutes }, (_, i) => ({
    monitor_tag: tag,
    timestamp: from + i * 60,
    status: statuses[i % statuses.length],
    latency: 100 + (i % 50),
    type: "REALTIME",
  }));
  for (let i = 0; i < rows.length; i += 400) await knex("monitoring_data").insert(rows.slice(i, i + 400));
}

const rebuildAll = (tag: string) => knex.transaction((trx) => rebuildAllBucketsForTag(trx, tag));

/** The live aggregation the status page does today, straight from raw rows. */
async function rawDayCounts(tag: string, dayStart: number) {
  const r = (await knex("monitoring_data")
    .where("monitor_tag", tag)
    .where("timestamp", ">=", dayStart)
    .where("timestamp", "<", dayStart + DAY)
    .select(
      knex.raw("SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END) as up"),
      knex.raw("SUM(CASE WHEN status = 'DOWN' THEN 1 ELSE 0 END) as down"),
      knex.raw("AVG(latency) as avg_latency"),
      knex.raw("MAX(latency) as max_latency"),
      knex.raw("MIN(latency) as min_latency"),
    )
    .first()) as Record<string, number | null>;
  return r;
}

/** The same day, assembled by summing rollup buckets. */
async function bucketDayCounts(tag: string, dayStart: number) {
  const r = (await knex("monitoring_data_bucket")
    .where("monitor_tag", tag)
    .where("bucket_ts", ">=", dayStart)
    .where("bucket_ts", "<", dayStart + DAY)
    .select(
      knex.raw("SUM(count_of_up) as up"),
      knex.raw("SUM(count_of_down) as down"),
      knex.raw("SUM(latency_sum) as latency_sum"),
      knex.raw("SUM(latency_count) as latency_count"),
      knex.raw("MAX(max_latency) as max_latency"),
      knex.raw("MIN(min_latency) as min_latency"),
    )
    .first()) as Record<string, number | null>;
  return {
    up: r.up,
    down: r.down,
    avg_latency: r.latency_count ? Number(r.latency_sum) / Number(r.latency_count) : null,
    max_latency: r.max_latency,
    min_latency: r.min_latency,
  };
}

describe("bucket boundaries", () => {
  it("uses 15 minute buckets", () => {
    expect(BUCKET_SECONDS).toBe(900);
  });

  it("snaps a timestamp down to its bucket", () => {
    expect(bucketStart(T0)).toBe(T0);
    expect(bucketStart(T0 + 899)).toBe(T0);
    expect(bucketStart(T0 + 900)).toBe(T0 + 900);
  });
});

// The bucket expression has to be written differently per dialect. MySQL has no
// INTEGER cast target and SQLite has no FLOOR, so a single expression cannot
// serve both. These tests only ever run against SQLite, so the other dialects
// need checking here rather than through a query.
describe("dialect handling", () => {
  const fake = (client: string) => ({ client: { config: { client } } }) as never;

  it("uses a CAST on SQLite", () => {
    expect(bucketExpression(fake("better-sqlite3"))).toContain("CAST");
    expect(bucketExpression(fake("sqlite3"))).toContain("CAST");
  });

  it.each(["pg", "mysql", "mysql2"])("uses FLOOR on %s, because INTEGER is not a valid cast target", (client) => {
    const expr = bucketExpression(fake(client));
    expect(expr).toContain("FLOOR");
    expect(expr).not.toContain("CAST");
  });

  it("treats only SQLite as a single writer, so the others take a row lock", () => {
    expect(isSingleWriter(fake("better-sqlite3"))).toBe(true);
    expect(isSingleWriter(fake("sqlite3"))).toBe(true);
    for (const client of ["pg", "mysql", "mysql2"]) expect(isSingleWriter(fake(client))).toBe(false);
  });
});

describe("aggregation matches the raw data", () => {
  it("counts each status and totals latency", async () => {
    await seed("a", T0, 60, ["UP", "UP", "DOWN", "DEGRADED", "MAINTENANCE"]);
    await rebuildAll("a");

    const raw = await rawDayCounts("a", T0);
    const rolled = await bucketDayCounts("a", T0);

    expect(Number(rolled.up)).toBe(Number(raw.up));
    expect(Number(rolled.down)).toBe(Number(raw.down));
    expect(rolled.avg_latency).toBeCloseTo(Number(raw.avg_latency), 6);
    expect(Number(rolled.max_latency)).toBe(Number(raw.max_latency));
    expect(Number(rolled.min_latency)).toBe(Number(raw.min_latency));
  });

  it("stores latency as a sum and a count, so buckets stay addable", async () => {
    // Two buckets with different sample counts. An unweighted mean of the two
    // bucket averages would not equal the true average.
    await seed("a", T0, 15);
    await seed("a", T0 + BUCKET_SECONDS, 3);
    await rebuildAll("a");

    const raw = await rawDayCounts("a", T0);
    const rolled = await bucketDayCounts("a", T0);
    expect(rolled.avg_latency).toBeCloseTo(Number(raw.avg_latency), 6);

    const buckets = await knex("monitoring_data_bucket").where("monitor_tag", "a").orderBy("bucket_ts");
    const unweighted = buckets.reduce((acc, b) => acc + b.latency_sum / b.latency_count, 0) / buckets.length;
    expect(unweighted).not.toBeCloseTo(Number(raw.avg_latency), 6);
  });
});

// The reason buckets are 15 minutes rather than a day: the status page asks for
// days that start at midnight in the VIEWER's timezone.
describe("viewer timezone alignment", () => {
  const OFFSETS: Array<[string, number]> = [
    ["UTC", 0],
    ["UTC+5:30 India", 5.5 * 3600],
    ["UTC-4 New York", -4 * 3600],
    ["UTC+12:45 Chatham", 12.75 * 3600],
    ["UTC-9:30 Marquesas", -9.5 * 3600],
  ];

  it.each(OFFSETS)("a day starting at %s midnight sums exactly", async (_label, offset) => {
    await seed("a", T0, 3 * 1440, ["UP", "UP", "UP", "DOWN"]);
    await rebuildAll("a");

    // Viewer midnight, expressed as a UTC timestamp.
    const dayStart = T0 + DAY - offset;
    const raw = await rawDayCounts("a", dayStart);
    const rolled = await bucketDayCounts("a", dayStart);

    expect(Number(rolled.up)).toBe(Number(raw.up));
    expect(Number(rolled.down)).toBe(Number(raw.down));
    expect(rolled.avg_latency).toBeCloseTo(Number(raw.avg_latency), 6);
  });

  it("every offset lands on a bucket boundary", () => {
    // Math.abs because a negative offset gives -0, which is not Object.is(+0).
    for (const [, offset] of OFFSETS) expect(Math.abs(offset % BUCKET_SECONDS)).toBe(0);
  });
});

describe("rebuilds stay correct as raw data changes", () => {
  it("is idempotent", async () => {
    await seed("a", T0, 30);
    await rebuildAll("a");
    const first = await knex("monitoring_data_bucket").where("monitor_tag", "a").orderBy("bucket_ts");
    await rebuildAll("a");
    const second = await knex("monitoring_data_bucket").where("monitor_tag", "a").orderBy("bucket_ts");
    expect(second).toEqual(first);
  });

  it("does not double count when a row is overwritten", async () => {
    await seed("a", T0, 15, ["UP"]);
    await rebuildAll("a");
    expect((await bucketDayCounts("a", T0)).up).toBe(15);

    // The raw table is written with upsert-and-merge, so this REPLACES a row.
    await knex("monitoring_data")
      .insert({ monitor_tag: "a", timestamp: T0, status: "DOWN", latency: 10, type: "REALTIME" })
      .onConflict(["monitor_tag", "timestamp"])
      .merge();
    await knex.transaction((trx) => rebuildBuckets(trx, "a", T0, T0));

    const after = await bucketDayCounts("a", T0);
    expect(Number(after.up)).toBe(14);
    expect(Number(after.down)).toBe(1);
  });

  it("drops buckets whose raw rows were deleted", async () => {
    await seed("a", T0, 60);
    await rebuildAll("a");
    expect(await knex("monitoring_data_bucket").where("monitor_tag", "a").count({ c: "*" }).first()).toEqual({ c: 4 });

    await knex("monitoring_data")
      .where("monitor_tag", "a")
      .where("timestamp", "<", T0 + 1800)
      .del();
    await knex.transaction((trx) => rebuildBuckets(trx, "a", T0, T0 + 1800));

    const left = (await knex("monitoring_data_bucket").where("monitor_tag", "a").orderBy("bucket_ts")) as Array<{
      bucket_ts: number;
    }>;
    expect(left.map((b) => b.bucket_ts)).toEqual([T0 + 1800, T0 + 2700]);
  });

  it("keeps a bucket that still has rows after a partial delete", async () => {
    await seed("a", T0, 15);
    await rebuildAll("a");
    await knex("monitoring_data")
      .where("monitor_tag", "a")
      .where("timestamp", "<", T0 + 300)
      .del();
    await knex.transaction((trx) => rebuildBuckets(trx, "a", T0, T0 + 300));
    expect(Number((await bucketDayCounts("a", T0)).up)).toBe(10);
  });

  it("recomputes min and max after the extreme row is removed", async () => {
    await seed("a", T0, 15);
    await knex("monitoring_data").insert({
      monitor_tag: "a",
      timestamp: T0 + 900,
      status: "UP",
      latency: 9999,
      type: "REALTIME",
    });
    await rebuildAll("a");
    expect(Number((await bucketDayCounts("a", T0)).max_latency)).toBe(9999);

    await knex("monitoring_data")
      .where({ monitor_tag: "a", timestamp: T0 + 900 })
      .del();
    await knex.transaction((trx) => rebuildBuckets(trx, "a", T0 + 900, T0 + 900));
    expect(Number((await bucketDayCounts("a", T0)).max_latency)).toBeLessThan(9999);
  });

  it("isolates monitors from each other", async () => {
    await seed("a", T0, 15);
    await seed("b", T0, 15);
    await rebuildAll("a");
    await rebuildAll("b");
    await knex("monitoring_data").where("monitor_tag", "a").del();
    await knex.transaction((trx) => rebuildAllBucketsForTag(trx, "a"));

    expect(await knex("monitoring_data_bucket").where("monitor_tag", "a").count({ c: "*" }).first()).toEqual({ c: 0 });
    expect(await knex("monitoring_data_bucket").where("monitor_tag", "b").count({ c: "*" }).first()).toEqual({ c: 1 });
  });
});

describe("retention", () => {
  it("drops whole buckets before the cutoff and leaves the straddling one", async () => {
    await seed("a", T0, 60);
    await rebuildAll("a");
    // Cutoff inside the second bucket.
    const cutoff = T0 + 1200;
    await knex("monitoring_data").where("timestamp", "<", cutoff).del();
    await deleteBucketsBefore(knex, cutoff);
    await knex.transaction((trx) => rebuildBuckets(trx, "a", cutoff, cutoff));

    const left = (await knex("monitoring_data_bucket").orderBy("bucket_ts")) as Array<{
      bucket_ts: number;
      count_of_up: number;
    }>;
    expect(left[0].bucket_ts).toBe(T0 + 900);
    // The straddling bucket spans minutes 15 to 29 and the cutoff is minute 20,
    // so the 10 rows from minute 20 onward survive.
    expect(left[0].count_of_up).toBe(10);
  });
});

describe("verify", () => {
  it("reports nothing when the rollup matches", async () => {
    await seed("a", T0, 60);
    await rebuildAll("a");
    expect(await verifyBucketsForTag(knex, "a", T0, T0 + DAY)).toEqual([]);
  });

  it("reports a bucket that drifted", async () => {
    await seed("a", T0, 60);
    await rebuildAll("a");
    await knex("monitoring_data_bucket").where({ monitor_tag: "a", bucket_ts: T0 }).update({ count_of_up: 999 });

    const d = await verifyBucketsForTag(knex, "a", T0, T0 + DAY);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ bucket_ts: T0, field: "count_of_up", raw: 15, rollup: 999 });
  });

  it("reports a bucket with no raw rows behind it", async () => {
    await seed("a", T0, 15);
    await rebuildAll("a");
    await knex("monitoring_data_bucket").insert({ monitor_tag: "a", bucket_ts: T0 + 900, count_of_up: 5 });

    const d = await verifyBucketsForTag(knex, "a", T0, T0 + DAY);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ bucket_ts: T0 + 900, field: "*", raw: null, rollup: 1 });
  });

  it("reports a bucket that is missing entirely", async () => {
    await seed("a", T0, 30);
    await rebuildAll("a");
    await knex("monitoring_data_bucket").where({ monitor_tag: "a", bucket_ts: T0 }).del();

    const d = await verifyBucketsForTag(knex, "a", T0, T0 + DAY);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ bucket_ts: T0, field: "*", rollup: null });
  });
});

describe("aggregateRawIntoBuckets", () => {
  it("returns nothing for a monitor with no rows", async () => {
    expect(await aggregateRawIntoBuckets(knex, "nobody", T0, T0 + DAY)).toEqual([]);
  });
});

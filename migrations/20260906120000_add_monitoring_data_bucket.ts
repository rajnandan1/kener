import type { Knex } from "knex";

/**
 * Rollup of monitoring_data into fixed 15 minute buckets.
 *
 * The status page groups raw per-minute rows into days on every request, which
 * means scanning millions of rows per page load. This table holds the same
 * counts pre-aggregated, so a page reads thousands of rows instead.
 *
 * Buckets are 15 minutes, not days, because the day boundary is not fixed: the
 * status page asks for days that start at midnight in the VIEWER's timezone.
 * Every current IANA offset is a whole number of 15 minute steps, including the
 * :30 and :45 ones, so any viewer's day is an exact whole number of buckets.
 *
 * Latency is stored as a sum and a count, not an average, so that buckets can
 * be added together without the error that averaging averages would introduce.
 */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("monitoring_data_bucket")) return;

  await knex.schema.createTable("monitoring_data_bucket", (table) => {
    table.string("monitor_tag", 255).notNullable();
    // Start of the bucket, UTC seconds, always a multiple of 900.
    table.integer("bucket_ts").notNullable();
    table.integer("count_of_up").notNullable().defaultTo(0);
    table.integer("count_of_down").notNullable().defaultTo(0);
    table.integer("count_of_degraded").notNullable().defaultTo(0);
    table.integer("count_of_maintenance").notNullable().defaultTo(0);
    // Totals rather than an average, so buckets stay addable. Double, not float:
    // knex float maps to a 4 byte real on Postgres, which holds about 7
    // significant digits, and this column accumulates a sum.
    table.double("latency_sum").notNullable().defaultTo(0);
    table.integer("latency_count").notNullable().defaultTo(0);
    table.double("max_latency");
    table.double("min_latency");
    table.primary(["monitor_tag", "bucket_ts"]);
    // Retention deletes by bucket_ts alone. The primary key leads with
    // monitor_tag, so it gives no useful path for that, and the nightly cleanup
    // would scan the whole table as the monitor count grows.
    table.index(["bucket_ts"], "idx_monitoring_data_bucket_ts");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("monitoring_data_bucket");
}

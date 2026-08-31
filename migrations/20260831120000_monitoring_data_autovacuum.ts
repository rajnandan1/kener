import type { Knex } from "knex";

// The nightly retention cleanup deletes roughly one day of monitoring_data at
// a time. Postgres' default autovacuum thresholds (20% of the table dead for
// vacuum, 10% changed for analyze) are far too lazy for that churn on a large
// table: dead tuples and cleared visibility-map bits accumulate for days,
// every read gets slower, and page loads can exhaust the connection pool.
// Lowering them (vacuum at 1% dead rows, analyze at 0.5% changed rows) makes
// the table eligible for asynchronous autovacuum soon after a nightly delete
// instead of days later. MySQL (InnoDB purge) and SQLite reclaim deleted rows
// on their own.
export async function up(knex: Knex): Promise<void> {
  if (knex.client.config.client !== "pg") return;
  if (!(await knex.schema.hasTable("monitoring_data"))) return;
  await knex.raw(
    "ALTER TABLE monitoring_data SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_analyze_scale_factor = 0.005)",
  );
  // Refresh planner statistics now instead of waiting for the first
  // autoanalyze. Existing installs with an already-bloated table should also
  // run `VACUUM (ANALYZE) monitoring_data;` once — see the database-setup docs.
  await knex.raw("ANALYZE monitoring_data");
}

export async function down(knex: Knex): Promise<void> {
  if (knex.client.config.client !== "pg") return;
  if (!(await knex.schema.hasTable("monitoring_data"))) return;
  await knex.raw("ALTER TABLE monitoring_data RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor)");
}

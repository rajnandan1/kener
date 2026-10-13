import type { Knex } from "knex";

function dbClient(knex: Knex): string {
  return knex.client.config.client as string;
}

function isSqlite(client: string): boolean {
  return client === "sqlite3" || client === "better-sqlite3";
}

/**
 * SSL monitors store remaining certificate lifetime in `latency` (milliseconds).
 * The original float(8, 2) MySQL limit (~9.999e6) cannot hold multi-day remaining
 * ms values. Widen to DOUBLE / double precision so inserts are not rejected/clamped.
 * SQLite already uses REAL affinity — no change required.
 */
export async function up(knex: Knex): Promise<void> {
  const client = dbClient(knex);

  if (isSqlite(client)) {
    return;
  }

  if (client === "mysql" || client === "mysql2") {
    await knex.schema.raw("ALTER TABLE monitoring_data MODIFY latency DOUBLE NULL");
    return;
  }

  if (client === "pg" || client === "postgres" || client === "postgresql") {
    await knex.schema.raw(
      "ALTER TABLE monitoring_data ALTER COLUMN latency TYPE DOUBLE PRECISION USING latency::double precision",
    );
  }
}

/**
 * SQLite: no-op (up did not change the schema).
 * MySQL/Postgres: reject — narrowing latency would clamp or reject SSL remaining-ms values.
 */
export async function down(knex: Knex): Promise<void> {
  if (isSqlite(dbClient(knex))) {
    return;
  }

  throw new Error(
    "Cannot rollback 20261013120000_widen_monitoring_data_latency: narrowing latency would clamp or reject SSL remaining-ms values. Restore from backup if needed.",
  );
}

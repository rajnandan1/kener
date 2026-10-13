import type { Knex } from "knex";

/**
 * SSL monitors store remaining certificate lifetime in `latency` (milliseconds).
 * The original float(8, 2) MySQL limit (~9.999e6) cannot hold multi-day remaining
 * ms values. Widen to DOUBLE / double precision so inserts are not rejected/clamped.
 * SQLite already uses REAL affinity — no change required.
 */
export async function up(knex: Knex): Promise<void> {
  const client = knex.client.config.client as string;

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

export async function down(knex: Knex): Promise<void> {
  const client = knex.client.config.client as string;

  if (client === "mysql" || client === "mysql2") {
    await knex.schema.raw("ALTER TABLE monitoring_data MODIFY latency FLOAT(8, 2) NULL");
    return;
  }

  if (client === "pg" || client === "postgres" || client === "postgresql") {
    await knex.schema.raw(
      "ALTER TABLE monitoring_data ALTER COLUMN latency TYPE REAL USING latency::real",
    );
  }
}

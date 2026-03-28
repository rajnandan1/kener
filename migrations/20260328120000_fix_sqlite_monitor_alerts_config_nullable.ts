/**
 * Migration: Fix SQLite monitor_alerts_config.monitor_tag NOT NULL constraint
 *
 * The earlier migration 20260325120000_multi_monitor_alerts nulled out data in
 * monitor_alerts_config.monitor_tag for SQLite but could not alter the column
 * constraint (SQLite doesn't support ALTER COLUMN). This migration recreates
 * the table with monitor_tag as nullable, preserving all data, indexes, and
 * foreign keys.
 *
 * Only runs on SQLite/better-sqlite3; other databases already had the column
 * altered in the previous migration.
 */
import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const dbClient = knex.client.config.client;
  if (dbClient !== "sqlite3" && dbClient !== "better-sqlite3") {
    return; // Already handled by 20260325120000_multi_monitor_alerts
  }

  // Disable foreign keys during the rebuild
  await knex.raw("PRAGMA foreign_keys = OFF");

  try {
    await knex.transaction(async (trx) => {
      // 1. Create temp table with the corrected schema (monitor_tag nullable)
      await trx.raw(`
				CREATE TABLE monitor_alerts_config_new (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					monitor_tag VARCHAR(255),
					alert_for VARCHAR(50) NOT NULL,
					alert_value VARCHAR(255) NOT NULL,
					failure_threshold INTEGER NOT NULL DEFAULT 1,
					success_threshold INTEGER NOT NULL DEFAULT 1,
					alert_description TEXT,
					create_incident VARCHAR(10) NOT NULL DEFAULT 'NO',
					is_active VARCHAR(10) NOT NULL DEFAULT 'YES',
					severity VARCHAR(50) NOT NULL DEFAULT 'WARNING',
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
				)
			`);

      // 2. Copy all data
      await trx.raw(`
				INSERT INTO monitor_alerts_config_new
					(id, monitor_tag, alert_for, alert_value, failure_threshold,
					 success_threshold, alert_description, create_incident,
					 is_active, severity, created_at, updated_at)
				SELECT
					id, monitor_tag, alert_for, alert_value, failure_threshold,
					success_threshold, alert_description, create_incident,
					is_active, severity, created_at, updated_at
				FROM monitor_alerts_config
			`);

      // 3. Drop old table
      await trx.raw("DROP TABLE monitor_alerts_config");

      // 4. Rename new table
      await trx.raw("ALTER TABLE monitor_alerts_config_new RENAME TO monitor_alerts_config");

      // 5. Recreate indexes
      try {
        await trx.raw("CREATE INDEX idx_monitor_alerts_config_monitor_tag ON monitor_alerts_config (monitor_tag)");
      } catch (_e) {
        /* index may already exist */
      }
      try {
        await trx.raw("CREATE INDEX idx_monitor_alerts_config_is_active ON monitor_alerts_config (is_active)");
      } catch (_e) {
        /* index may already exist */
      }
    });
  } finally {
    // Re-enable foreign keys
    await knex.raw("PRAGMA foreign_keys = ON");
  }
}

export async function down(knex: Knex): Promise<void> {
  const dbClient = knex.client.config.client;
  if (dbClient !== "sqlite3" && dbClient !== "better-sqlite3") {
    return;
  }

  // Revert: make monitor_tag NOT NULL again via table rebuild
  await knex.raw("PRAGMA foreign_keys = OFF");

  try {
    await knex.transaction(async (trx) => {
      await trx.raw(`
				CREATE TABLE monitor_alerts_config_old (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					monitor_tag VARCHAR(255) NOT NULL,
					alert_for VARCHAR(50) NOT NULL,
					alert_value VARCHAR(255) NOT NULL,
					failure_threshold INTEGER NOT NULL DEFAULT 1,
					success_threshold INTEGER NOT NULL DEFAULT 1,
					alert_description TEXT,
					create_incident VARCHAR(10) NOT NULL DEFAULT 'NO',
					is_active VARCHAR(10) NOT NULL DEFAULT 'YES',
					severity VARCHAR(50) NOT NULL DEFAULT 'WARNING',
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
				)
			`);

      // Only copy rows that have a non-null monitor_tag
      await trx.raw(`
				INSERT INTO monitor_alerts_config_old
					(id, monitor_tag, alert_for, alert_value, failure_threshold,
					 success_threshold, alert_description, create_incident,
					 is_active, severity, created_at, updated_at)
				SELECT
					id, monitor_tag, alert_for, alert_value, failure_threshold,
					success_threshold, alert_description, create_incident,
					is_active, severity, created_at, updated_at
				FROM monitor_alerts_config
				WHERE monitor_tag IS NOT NULL
			`);

      await trx.raw("DROP TABLE monitor_alerts_config");
      await trx.raw("ALTER TABLE monitor_alerts_config_old RENAME TO monitor_alerts_config");

      try {
        await trx.raw("CREATE INDEX idx_monitor_alerts_config_monitor_tag ON monitor_alerts_config (monitor_tag)");
      } catch (_e) {
        /* index may already exist */
      }
      try {
        await trx.raw("CREATE INDEX idx_monitor_alerts_config_is_active ON monitor_alerts_config (is_active)");
      } catch (_e) {
        /* index may already exist */
      }
    });
  } finally {
    await knex.raw("PRAGMA foreign_keys = ON");
  }
}

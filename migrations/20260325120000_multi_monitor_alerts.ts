/**
 * Migration: Multi-Monitor Alerts
 *
 * This migration refactors the monitor alerting system to support many-to-many
 * relationships between alert configurations and monitors. Previously, each
 * `monitor_alerts_config` row was tied to exactly one monitor via a `monitor_tag`
 * foreign key column. This migration:
 *
 * 1. Creates a new `monitor_alerts_config_monitors` junction table that links
 *    `monitor_alerts_config` rows to one or more `monitors` rows, enabling a
 *    single alert configuration to fire across multiple monitors.
 *
 * 2. Adds a `monitor_tag` column to `monitor_alerts_v2` so that each firing
 *    alert record knows which specific monitor triggered it (important when one
 *    config covers many monitors).
 *
 * 3. Migrates existing data: copies every `monitor_alerts_config.monitor_tag`
 *    value into the new junction table and backfills `monitor_alerts_v2.monitor_tag`
 *    from the same source, preserving all historical alert records.
 *
 * 4. Removes the one-to-one constraint on `monitor_alerts_config.monitor_tag` by
 *    dropping its foreign key and setting the column nullable (SQLite workaround:
 *    nulls the column directly since SQLite cannot drop foreign key constraints
 *    inline).
 *
 * 5. Adds a composite index on `monitor_alerts_v2 (config_id, monitor_tag,
 *    alert_status)` for fast per-monitor alert status lookups.
 *
 * The `down` migration reverses these steps: restores the first junction-table
 * entry back onto `monitor_alerts_config.monitor_tag`, re-adds the foreign key
 * (non-SQLite), removes the `monitor_tag` column from `monitor_alerts_v2`
 * (non-SQLite), and drops the junction table.
 */
import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Step 1: Create monitor_alerts_config_monitors junction table
  if (!(await knex.schema.hasTable("monitor_alerts_config_monitors"))) {
    await knex.schema.createTable("monitor_alerts_config_monitors", (table) => {
      table.integer("monitor_alerts_id").unsigned().notNullable();
      table.string("monitor_tag", 255).notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());

      // Composite primary key
      table.primary(["monitor_alerts_id", "monitor_tag"]);

      // Foreign keys
      table.foreign("monitor_alerts_id").references("id").inTable("monitor_alerts_config").onDelete("CASCADE");
      table.foreign("monitor_tag").references("tag").inTable("monitors").onDelete("CASCADE");
    });
  }

  // Step 2: Add monitor_tag column to monitor_alerts_v2 for per-monitor alert tracking
  const hasV2Column = await knex.schema.hasColumn("monitor_alerts_v2", "monitor_tag");
  if (!hasV2Column) {
    await knex.schema.alterTable("monitor_alerts_v2", (table) => {
      table.string("monitor_tag", 255).nullable();
      table.foreign("monitor_tag").references("tag").inTable("monitors").onDelete("CASCADE");
    });
  }

  // Step 3: Migrate existing data from monitor_alerts_config.monitor_tag to junction table
  // and backfill monitor_alerts_v2.monitor_tag from the same source
  const existingConfigs = await knex("monitor_alerts_config").whereNotNull("monitor_tag").select("id", "monitor_tag");

  if (existingConfigs.length > 0) {
    // Build a config_id -> monitor_tag map for backfilling alerts
    const configTagMap = new Map<number, string>();
    const inserts = existingConfigs.map((config: { id: number; monitor_tag: string }) => {
      configTagMap.set(config.id, config.monitor_tag);
      return {
        monitor_alerts_id: config.id,
        monitor_tag: config.monitor_tag,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      };
    });

    // Batch insert into junction table
    const chunkSize = 100;
    for (let i = 0; i < inserts.length; i += chunkSize) {
      await knex("monitor_alerts_config_monitors").insert(inserts.slice(i, i + chunkSize));
    }

    // Backfill monitor_tag on existing monitor_alerts_v2 rows
    const existingAlerts = await knex("monitor_alerts_v2").whereNull("monitor_tag").select("id", "config_id");
    for (const alert of existingAlerts) {
      const tag = configTagMap.get(alert.config_id);
      if (tag) {
        await knex("monitor_alerts_v2").where({ id: alert.id }).update({ monitor_tag: tag });
      }
    }
  }

  // Step 4: Drop foreign key and make monitor_tag nullable on monitor_alerts_config
  const dbClient = knex.client.config.client;

  if (dbClient === "sqlite3" || dbClient === "better-sqlite3") {
    await knex("monitor_alerts_config").update({ monitor_tag: null });
  } else {
    try {
      await knex.schema.alterTable("monitor_alerts_config", (table) => {
        table.dropForeign(["monitor_tag"]);
      });
    } catch (_e) {
      // Foreign key may not exist or already dropped
    }

    await knex.schema.alterTable("monitor_alerts_config", (table) => {
      table.string("monitor_tag", 255).nullable().alter();
    });

    await knex("monitor_alerts_config").update({ monitor_tag: null });
  }

  // Step 5: Add composite index on monitor_alerts_v2 for fast lookups
  try {
    await knex.raw(
      "CREATE INDEX idx_monitor_alerts_v2_config_tag_status ON monitor_alerts_v2 (config_id, monitor_tag, alert_status)",
    );
  } catch (_e) {
    /* index already exists */
  }
}

export async function down(knex: Knex): Promise<void> {
  // Step 1: Drop the composite index on monitor_alerts_v2
  try {
    await knex.raw("DROP INDEX IF EXISTS idx_monitor_alerts_v2_config_tag_status");
  } catch (_e) {
    /* index may not exist */
  }

  // Step 2: Copy first monitor_tag from junction table back to monitor_alerts_config
  const configs = await knex("monitor_alerts_config").select("id");

  for (const config of configs) {
    const firstMonitor = await knex("monitor_alerts_config_monitors").where({ monitor_alerts_id: config.id }).first();

    if (firstMonitor) {
      await knex("monitor_alerts_config").where({ id: config.id }).update({ monitor_tag: firstMonitor.monitor_tag });
    }
  }

  // Step 3: Delete configs that have no monitors (can't satisfy NOT NULL)
  await knex("monitor_alerts_config").whereNull("monitor_tag").del();

  // Step 4: Re-add foreign key constraint on monitor_alerts_config (non-SQLite only)
  const dbClient = knex.client.config.client;
  if (dbClient !== "sqlite3" && dbClient !== "better-sqlite3") {
    await knex.schema.alterTable("monitor_alerts_config", (table) => {
      table.string("monitor_tag", 255).notNullable().alter();
      table.foreign("monitor_tag").references("tag").inTable("monitors").onDelete("CASCADE");
    });
  }

  // Step 5: Drop monitor_tag column from monitor_alerts_v2 (non-SQLite only)
  const hasV2Column = await knex.schema.hasColumn("monitor_alerts_v2", "monitor_tag");
  if (hasV2Column) {
    if (dbClient !== "sqlite3" && dbClient !== "better-sqlite3") {
      await knex.schema.alterTable("monitor_alerts_v2", (table) => {
        table.dropForeign(["monitor_tag"]);
        table.dropColumn("monitor_tag");
      });
    }
  }

  // Step 6: Drop junction table
  await knex.schema.dropTableIfExists("monitor_alerts_config_monitors");
}

import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("monitor_alerts_v2"))) {
    await knex.schema.createTable("monitor_alerts_v2", (table) => {
      table.increments("id").primary();
      table.integer("config_id").unsigned().notNullable();
      table.integer("incident_id").unsigned().nullable();
      table.string("alert_status", 255).notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());

      // Add index for faster queries on config_id and alert_status
      table.index(["config_id", "alert_status"]);
    });
  }

  // Ensure config_id is unsigned (fix for MySQL users who had signed int from a prior failed run)
  try {
    await knex.schema.alterTable("monitor_alerts_v2", (table) => {
      table.integer("config_id").unsigned().notNullable().alter();
    });
  } catch (_e) {
    /* column may already be correct */
  }

  // Ensure incident_id is unsigned
  try {
    await knex.schema.alterTable("monitor_alerts_v2", (table) => {
      table.integer("incident_id").unsigned().nullable().alter();
    });
  } catch (_e) {
    /* column may already be correct */
  }

  // Add foreign key constraints (skip if they already exist)
  try {
    await knex.schema.alterTable("monitor_alerts_v2", (table) => {
      table.foreign("config_id").references("id").inTable("monitor_alerts_config").onDelete("CASCADE");
    });
  } catch (_e) {
    /* foreign key may already exist */
  }

  try {
    await knex.schema.alterTable("monitor_alerts_v2", (table) => {
      table.foreign("incident_id").references("id").inTable("incidents").onDelete("SET NULL");
    });
  } catch (_e) {
    /* foreign key may already exist */
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("monitor_alerts_v2");
}

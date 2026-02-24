import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create monitor_alerts_config table
  if (!(await knex.schema.hasTable("monitor_alerts_config"))) {
    await knex.schema.createTable("monitor_alerts_config", (table) => {
      table.increments("id").primary();
      table.string("monitor_tag", 255).notNullable();
      table.string("alert_for", 50).notNullable(); // STATUS, LATENCY, UPTIME
      table.string("alert_value", 255).notNullable(); // DOWN, DEGRADED, or numeric value like "1000" or "99"
      table.integer("failure_threshold").notNullable().defaultTo(1);
      table.integer("success_threshold").notNullable().defaultTo(1);
      table.text("alert_description");
      table.string("create_incident", 10).notNullable().defaultTo("NO"); // YES or NO
      table.string("is_active", 10).notNullable().defaultTo("YES"); // YES or NO
      table.string("severity", 50).notNullable().defaultTo("WARNING"); // CRITICAL or WARNING
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());

      // Foreign key to monitors table
      table.foreign("monitor_tag").references("tag").inTable("monitors").onDelete("CASCADE");
    });
  }

  // Create indexes (safe to fail if they already exist)
  try {
    await knex.raw("CREATE INDEX idx_monitor_alerts_config_monitor_tag ON monitor_alerts_config (monitor_tag)");
  } catch (_e) {
    /* index already exists */
  }
  try {
    await knex.raw("CREATE INDEX idx_monitor_alerts_config_is_active ON monitor_alerts_config (is_active)");
  } catch (_e) {
    /* index already exists */
  }

  // Create monitor_alerts_config_triggers junction table
  if (!(await knex.schema.hasTable("monitor_alerts_config_triggers"))) {
    await knex.schema.createTable("monitor_alerts_config_triggers", (table) => {
      table.integer("monitor_alerts_id").unsigned().notNullable();
      table.integer("trigger_id").unsigned().notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());

      // Composite primary key
      table.primary(["monitor_alerts_id", "trigger_id"]);

      // Foreign keys
      table.foreign("monitor_alerts_id").references("id").inTable("monitor_alerts_config").onDelete("CASCADE");
      table.foreign("trigger_id").references("id").inTable("triggers").onDelete("CASCADE");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop junction table first due to foreign key constraints
  await knex.schema.dropTableIfExists("monitor_alerts_config_triggers");
  await knex.schema.dropTableIfExists("monitor_alerts_config");
}

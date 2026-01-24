import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("monitor_alerts_v2", (table) => {
    table.increments("id").primary();
    table.integer("config_id").references("id").inTable("monitor_alerts_config").notNullable().onDelete("CASCADE");
    table.integer("incident_id").references("id").inTable("incidents").nullable().onDelete("SET NULL");
    table.string("alert_status", 255).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Add index for faster queries on config_id and alert_status
    table.index(["config_id", "alert_status"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("monitor_alerts_v2");
}

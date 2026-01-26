import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create subscription_config table for admin settings
  await knex.schema.createTable("subscription_config", (table) => {
    table.increments("id").primary();
    // JSON string with enabled events: { incidentUpdatesAll: boolean, maintenanceUpdatesAll: boolean, monitorUpdatesAll: boolean }
    table.text("events_enabled").notNullable().defaultTo("{}");
    // JSON string with enabled methods: { email: boolean, webhook: boolean, slack: boolean, discord: boolean }
    table.text("methods_enabled").notNullable().defaultTo("{}");
    // JSON string mapping method to trigger_id: { email: number | null, webhook: number | null, slack: number | null, discord: number | null }
    table.text("method_triggers").notNullable().defaultTo("{}");
    table.datetime("created_at").defaultTo(knex.fn.now());
    table.datetime("updated_at").defaultTo(knex.fn.now());
  });

  // Insert default config row
  await knex("subscription_config").insert({
    events_enabled: JSON.stringify({
      incidentUpdatesAll: false,
      maintenanceUpdatesAll: false,
      monitorUpdatesAll: false,
    }),
    methods_enabled: JSON.stringify({
      email: false,
      webhook: false,
      slack: false,
      discord: false,
    }),
    method_triggers: JSON.stringify({
      email: null,
      webhook: null,
      slack: null,
      discord: null,
    }),
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("subscription_config");
}

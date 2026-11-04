import type { Knex } from "knex";

// One row per (subscriber method, monitor): the monitors a subscriber hears about. Replaces the
// incidents/maintenances rows in user_subscriptions_v2, which stay in place but are no longer read.
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("subscriber_monitors"))) {
    await knex.schema.createTable("subscriber_monitors", (table) => {
      table.increments("id").primary();
      table.integer("subscriber_user_id").unsigned().notNullable();
      table.integer("subscriber_method_id").unsigned().notNullable();
      table.string("monitor_tag", 255).notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.unique(["subscriber_method_id", "monitor_tag"], { indexName: "sub_monitors_method_tag_unique" });
      table.index(["monitor_tag"], "sub_monitors_monitor_tag_index");
      table.foreign("subscriber_user_id").references("id").inTable("subscriber_users").onDelete("CASCADE");
      table.foreign("subscriber_method_id").references("id").inTable("subscriber_methods").onDelete("CASCADE");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("subscriber_monitors");
}

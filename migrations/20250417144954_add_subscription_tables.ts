import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("subscribers"))) {
    await knex.schema.createTable("subscribers", (table) => {
      table.increments("id").primary();
      table.string("subscriber_send").notNullable();
      table.text("subscriber_meta").nullable();
      table.string("subscriber_type").notNullable();
      table.string("subscriber_status").notNullable();
      table.datetime("created_at").defaultTo(knex.fn.now());
      table.datetime("updated_at").defaultTo(knex.fn.now());

      // Add unique constraint on subscriber_send and subscriber_type
      table.unique(["subscriber_send", "subscriber_type"]);

      // Add index on subscriber_send for better query performance
      table.index(["subscriber_send"]);
    });
  }

  if (!(await knex.schema.hasTable("subscriptions"))) {
    await knex.schema.createTable("subscriptions", (table) => {
      table.increments("id").primary();
      table.integer("subscriber_id").unsigned().notNullable();
      table.string("subscriptions_status").notNullable();
      table.string("subscriptions_monitors").notNullable();
      table.text("subscriptions_meta").nullable();
      table.datetime("created_at").defaultTo(knex.fn.now());
      table.datetime("updated_at").defaultTo(knex.fn.now());

      // Add unique constraint on subscriber_id and subscriptions_monitors
      // This constraint also creates an index that will be used for queries
      table.unique(["subscriber_id", "subscriptions_monitors"]);

      // Add index to optimize queries filtering by status and monitors
      table.index(["subscriptions_status", "subscriptions_monitors"]);
    });
  }

  if (!(await knex.schema.hasTable("subscription_triggers"))) {
    await knex.schema.createTable("subscription_triggers", (table) => {
      table.increments("id").primary();
      table.string("subscription_trigger_type").notNullable().unique();
      table.string("subscription_trigger_status").notNullable();
      table.text("config").nullable();
      table.datetime("created_at").defaultTo(knex.fn.now());
      table.datetime("updated_at").defaultTo(knex.fn.now());
    });
  }
}
export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .dropTableIfExists("subscription_triggers")
    .dropTableIfExists("subscriptions")
    .dropTableIfExists("subscribers");
}

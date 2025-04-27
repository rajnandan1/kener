export function up(knex) {
  return knex.schema
    .createTable("subscribers", (table) => {
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
    })
    .createTable("subscriptions", (table) => {
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
    })
    .createTable("subscription_triggers", (table) => {
      table.increments("id").primary();
      table.string("subscription_trigger_type").notNullable().unique();
      table.string("subscription_trigger_status").notNullable();
      table.text("config").nullable();
      table.datetime("created_at").defaultTo(knex.fn.now());
      table.datetime("updated_at").defaultTo(knex.fn.now());
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists("subscription_triggers")
    .dropTableIfExists("subscriptions")
    .dropTableIfExists("subscribers");
}

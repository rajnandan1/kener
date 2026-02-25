import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Create subscriber_users table - the actual user identity
  if (!(await knex.schema.hasTable("subscriber_users"))) {
    await knex.schema.createTable("subscriber_users", (table) => {
      table.increments("id").primary();
      table.string("email", 255).notNullable().unique();
      table.string("status", 20).notNullable().defaultTo("PENDING");
      table.string("verification_code", 10).nullable();
      table.timestamp("verification_expires_at").nullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.index(["status"]);
      table.index(["email"]);
    });
  }

  // 2. Create subscriber_methods table
  if (!(await knex.schema.hasTable("subscriber_methods"))) {
    await knex.schema.createTable("subscriber_methods", (table) => {
      table.increments("id").primary();
      table.integer("subscriber_user_id").unsigned().notNullable();
      table.string("method_type", 50).notNullable();
      table.string("method_value", 500).notNullable();
      table.string("status", 20).notNullable().defaultTo("ACTIVE");
      table.text("meta").nullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // Add indexes, unique constraints, and foreign keys for subscriber_methods (idempotent)
  try {
    await knex.schema.alterTable("subscriber_methods", (table) => {
      table.index(["subscriber_user_id"]);
    });
  } catch (_e) {
    /* index already exists */
  }
  try {
    await knex.schema.alterTable("subscriber_methods", (table) => {
      table.index(["method_type"]);
    });
  } catch (_e) {
    /* index already exists */
  }
  try {
    await knex.schema.alterTable("subscriber_methods", (table) => {
      table.index(["status"]);
    });
  } catch (_e) {
    /* index already exists */
  }
  try {
    await knex.schema.alterTable("subscriber_methods", (table) => {
      table.unique(["subscriber_user_id", "method_type", "method_value"], {
        indexName: "sub_methods_user_type_value_unique",
      });
    });
  } catch (_e) {
    /* unique constraint already exists */
  }
  try {
    await knex.schema.alterTable("subscriber_methods", (table) => {
      table.foreign("subscriber_user_id").references("id").inTable("subscriber_users").onDelete("CASCADE");
    });
  } catch (_e) {
    /* foreign key already exists */
  }

  // 3. Create user_subscriptions_v2 table
  if (!(await knex.schema.hasTable("user_subscriptions_v2"))) {
    await knex.schema.createTable("user_subscriptions_v2", (table) => {
      table.increments("id").primary();
      table.integer("subscriber_user_id").unsigned().notNullable();
      table.integer("subscriber_method_id").unsigned().notNullable();
      table.string("event_type", 50).notNullable();
      table.string("status", 20).notNullable().defaultTo("ACTIVE");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // Add indexes, unique constraints, and foreign keys for user_subscriptions_v2 (idempotent)
  try {
    await knex.schema.alterTable("user_subscriptions_v2", (table) => {
      table.index(["subscriber_user_id"]);
    });
  } catch (_e) {
    /* index already exists */
  }
  try {
    await knex.schema.alterTable("user_subscriptions_v2", (table) => {
      table.index(["subscriber_method_id"]);
    });
  } catch (_e) {
    /* index already exists */
  }
  try {
    await knex.schema.alterTable("user_subscriptions_v2", (table) => {
      table.index(["event_type"]);
    });
  } catch (_e) {
    /* index already exists */
  }
  try {
    await knex.schema.alterTable("user_subscriptions_v2", (table) => {
      table.index(["status"]);
    });
  } catch (_e) {
    /* index already exists */
  }
  try {
    await knex.schema.alterTable("user_subscriptions_v2", (table) => {
      table.unique(["subscriber_user_id", "subscriber_method_id", "event_type"], {
        indexName: "sub_v2_user_method_event_unique",
      });
    });
  } catch (_e) {
    /* unique constraint already exists */
  }
  try {
    await knex.schema.alterTable("user_subscriptions_v2", (table) => {
      table.foreign("subscriber_user_id").references("id").inTable("subscriber_users").onDelete("CASCADE");
    });
  } catch (_e) {
    /* foreign key already exists */
  }
  try {
    await knex.schema.alterTable("user_subscriptions_v2", (table) => {
      table.foreign("subscriber_method_id").references("id").inTable("subscriber_methods").onDelete("CASCADE");
    });
  } catch (_e) {
    /* foreign key already exists */
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("user_subscriptions_v2");
  await knex.schema.dropTableIfExists("subscriber_methods");
  await knex.schema.dropTableIfExists("subscriber_users");
}

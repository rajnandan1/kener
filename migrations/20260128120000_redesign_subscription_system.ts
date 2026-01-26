import type { Knex } from "knex";

/**
 * Redesign subscription system for better UX:
 *
 * OLD APPROACH:
 * - subscribers table mixed identity with subscription method
 * - Same user with email vs webhook = 2 different subscriber records
 * - Confusing for users who want multiple notification methods
 *
 * NEW APPROACH:
 * - subscriber_users: Core user identity (email-based, with verification)
 * - subscriber_methods: Methods a user has configured (email, webhook URL, slack, discord)
 * - user_subscriptions: What events/entities a user subscribes to, via which method
 *
 * Flow:
 * 1. User enters email -> verification code sent -> verified -> subscriber_user created
 * 2. User adds methods (their email is auto-added, can add webhook/slack/discord)
 * 3. User subscribes to events choosing which methods to use
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Create subscriber_users table - the actual user identity
  await knex.schema.createTable("subscriber_users", (table) => {
    table.increments("id").primary();

    // Email is the primary identifier for users
    table.string("email", 255).notNullable().unique();

    // User status: PENDING (awaiting verification), ACTIVE, INACTIVE
    table.string("status", 20).notNullable().defaultTo("PENDING");

    // Verification code for email verification (6 digit)
    table.string("verification_code", 10).nullable();
    table.datetime("verification_expires_at").nullable();

    table.datetime("created_at").defaultTo(knex.fn.now());
    table.datetime("updated_at").defaultTo(knex.fn.now());

    // Indexes
    table.index(["status"]);
    table.index(["email"]);
  });

  // 2. Create subscriber_methods table - methods a user has configured
  await knex.schema.createTable("subscriber_methods", (table) => {
    table.increments("id").primary();

    // Link to subscriber_user
    table.integer("subscriber_user_id").unsigned().notNullable();

    // Method type: email, webhook, slack, discord
    table.string("method_type", 50).notNullable();

    // Method value: email address, webhook URL, slack webhook, discord webhook
    table.string("method_value", 500).notNullable();

    // Status: ACTIVE, INACTIVE
    table.string("status", 20).notNullable().defaultTo("ACTIVE");

    // For webhook methods, we might want to store additional config
    table.text("meta").nullable(); // JSON for extra config like headers

    table.datetime("created_at").defaultTo(knex.fn.now());
    table.datetime("updated_at").defaultTo(knex.fn.now());

    // Indexes
    table.index(["subscriber_user_id"]);
    table.index(["method_type"]);
    table.index(["status"]);

    // Unique: one method type per value per user (can't have same webhook twice)
    table.unique(["subscriber_user_id", "method_type", "method_value"]);

    // Foreign key
    table.foreign("subscriber_user_id").references("id").inTable("subscriber_users").onDelete("CASCADE");
  });

  // 3. Create user_subscriptions_v2 table - what a user subscribes to
  await knex.schema.createTable("user_subscriptions_v2", (table) => {
    table.increments("id").primary();

    // Link to subscriber_user
    table.integer("subscriber_user_id").unsigned().notNullable();

    // Link to subscriber_method (which method to use for this subscription)
    table.integer("subscriber_method_id").unsigned().notNullable();

    // What event type: incidentUpdatesAll, maintenanceUpdatesAll, monitorUpdatesAll
    table.string("event_type", 50).notNullable();

    // Reference to specific entity (optional - null means "all")
    table.string("entity_type", 50).nullable(); // 'monitor', 'incident', 'maintenance', or null
    table.string("entity_id").nullable(); // The specific ID/tag

    // Status: ACTIVE, INACTIVE
    table.string("status", 20).notNullable().defaultTo("ACTIVE");

    table.datetime("created_at").defaultTo(knex.fn.now());
    table.datetime("updated_at").defaultTo(knex.fn.now());

    // Indexes
    table.index(["subscriber_user_id"]);
    table.index(["subscriber_method_id"]);
    table.index(["event_type"]);
    table.index(["entity_type", "entity_id"]);
    table.index(["status"]);

    // Unique: one subscription per user-method-event-entity
    table.unique(["subscriber_user_id", "subscriber_method_id", "event_type", "entity_type", "entity_id"]);

    // Foreign keys
    table.foreign("subscriber_user_id").references("id").inTable("subscriber_users").onDelete("CASCADE");
    table.foreign("subscriber_method_id").references("id").inTable("subscriber_methods").onDelete("CASCADE");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("user_subscriptions_v2");
  await knex.schema.dropTableIfExists("subscriber_methods");
  await knex.schema.dropTableIfExists("subscriber_users");
}

import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("invitations", (table) => {
    // Primary key
    table.increments("id").primary();

    // Core invitation fields
    table.string("invitation_token").unique().notNullable();
    table.string("invitation_type").notNullable();
    table.integer("invited_user_id").nullable();
    table.integer("invited_by_user_id").notNullable();

    // Additional data fields
    table.text("invitation_meta").nullable(); // For storing JSON or other metadata
    table.timestamp("invitation_expiry").notNullable();
    table.string("invitation_status").notNullable().defaultTo("PENDING");

    // Timestamps
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Indexes
    table.index("invitation_status");
    table.index("invitation_expiry");
    table.index(["invited_by_user_id", "invitation_status"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("invitations");
}

import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create vault table for storing encrypted secrets
  await knex.schema.createTable("vault", (table) => {
    table.increments("id").primary();
    table.string("secret_name", 255).notNullable().unique();
    table.text("secret_value").notNullable(); // Encrypted value
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("vault");
}

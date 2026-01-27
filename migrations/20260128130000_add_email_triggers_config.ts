import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create email_templates_config table
  await knex.schema.createTable("email_templates_config", (table) => {
    table.increments("id").primary();
    table.string("email_type", 50).notNullable().unique(); // email_code, forgot_password, verify_email
    table.integer("email_template_id").unsigned().nullable();
    table.string("is_active", 3).notNullable().defaultTo("NO"); // YES or NO
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Foreign key to templates table
    table.foreign("email_template_id").references("id").inTable("templates").onDelete("SET NULL");
  });

  // Pre-fill with default email types
  await knex("email_templates_config").insert([
    { email_type: "email_code", email_template_id: null, is_active: "NO" },
    { email_type: "forgot_password", email_template_id: null, is_active: "NO" },
    { email_type: "verify_email", email_template_id: null, is_active: "NO" },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("email_templates_config");
}

import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("templates", (table) => {
    table.increments("id").primary();
    table.string("template_name", 255).notNullable();
    table.string("template_type", 50).notNullable(); // EMAIL, WEBHOOK, SLACK, DISCORD
    table.string("template_usage", 50).notNullable(); // ALERT, SUBSCRIPTION
    table.text("template_json").notNullable(); // JSON string for template content
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Add index for faster queries
    table.index(["template_type", "template_usage"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("templates");
}

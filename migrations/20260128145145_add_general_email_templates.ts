import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("general_email_templates", (table) => {
    table.string("template_id").primary();
    table.string("template_subject");
    table.text("template_html_body");
    table.text("template_text_body");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("general_email_templates");
}

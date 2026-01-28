import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create email_templates_config table
  await knex.schema.createTable("email_templates_config", (table) => {
    table.string("email_type", 50).notNullable().primary(); // email_code, forgot_password, verify_email
    //template_subject
    table.text("template_subject").notNullable();
    //template_html_body
    table.text("template_html_body").notNullable();
    //template_text_body
    table.text("template_text_body").notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("email_templates_config");
}

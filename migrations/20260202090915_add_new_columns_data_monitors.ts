import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("monitors", (table) => {
    table.text("external_url").nullable();
  });
  await knex.schema.alterTable("monitoring_data", (table) => {
    table.text("error_message").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("monitors", (table) => {
    table.dropColumn("external_url");
  });
  await knex.schema.alterTable("monitoring_data", (table) => {
    table.dropColumn("error_message");
  });
}

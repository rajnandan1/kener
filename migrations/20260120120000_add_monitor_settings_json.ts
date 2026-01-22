import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("monitors", (table) => {
    table.text("monitor_settings_json").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("monitors", (table) => {
    table.dropColumn("monitor_settings_json");
  });
}

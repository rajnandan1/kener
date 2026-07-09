import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn("monitors", "confirmation_threshold"))) {
    await knex.schema.alterTable("monitors", (table) => {
      table.integer("confirmation_threshold").unsigned().notNullable().defaultTo(1);
    });
  }
  if (!(await knex.schema.hasColumn("monitoring_data", "raw_status"))) {
    await knex.schema.alterTable("monitoring_data", (table) => {
      table.text("raw_status").nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasColumn("monitors", "confirmation_threshold")) {
    await knex.schema.alterTable("monitors", (table) => {
      table.dropColumn("confirmation_threshold");
    });
  }
  if (await knex.schema.hasColumn("monitoring_data", "raw_status")) {
    await knex.schema.alterTable("monitoring_data", (table) => {
      table.dropColumn("raw_status");
    });
  }
}

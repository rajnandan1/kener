import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn("maintenances", "timezone"))) {
    await knex.schema.alterTable("maintenances", (table) => {
      table.string("timezone", 64).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasColumn("maintenances", "timezone")) {
    await knex.schema.alterTable("maintenances", (table) => {
      table.dropColumn("timezone");
    });
  }
}

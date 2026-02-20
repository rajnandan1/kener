import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table("incidents", (table) => {
    table.string("is_global", 15).notNullable().defaultTo("YES");
  });
  await knex.schema.table("maintenances", (table) => {
    table.string("is_global", 15).notNullable().defaultTo("YES");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table("incidents", (table) => {
    table.dropColumn("is_global");
  });
  await knex.schema.table("maintenances", (table) => {
    table.dropColumn("is_global");
  });
}

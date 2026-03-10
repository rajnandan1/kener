import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("pages", (table) => {
    table.text("page_subheader").alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("pages", (table) => {
    table.string("page_subheader", 255).alter();
  });
}

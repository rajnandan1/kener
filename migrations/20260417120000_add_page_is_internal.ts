import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("pages", "page_is_internal");
  if (!hasColumn) {
    await knex.schema.table("pages", (table) => {
      table.integer("page_is_internal").notNullable().defaultTo(0);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("pages", "page_is_internal");
  if (hasColumn) {
    await knex.schema.table("pages", (table) => {
      table.dropColumn("page_is_internal");
    });
  }
}

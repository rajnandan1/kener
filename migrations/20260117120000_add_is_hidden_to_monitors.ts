import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasCol = await knex.schema.hasColumn("monitors", "is_hidden");
  if (!hasCol) {
    await knex.schema.alterTable("monitors", (table) => {
      table.string("is_hidden").defaultTo("NO").notNullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("monitors", (table) => {
    table.dropColumn("is_hidden");
  });
}

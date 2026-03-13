import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("pages_monitors", "position");
  if (!hasColumn) {
    await knex.schema.alterTable("pages_monitors", (table) => {
      table.integer("position").unsigned().notNullable().defaultTo(0);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("pages_monitors", "position");
  if (hasColumn) {
    await knex.schema.alterTable("pages_monitors", (table) => {
      table.dropColumn("position");
    });
  }
}

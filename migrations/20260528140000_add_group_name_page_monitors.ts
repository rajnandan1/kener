import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("pages_monitors", "group_name");
  if (!hasColumn) {
    await knex.schema.alterTable("pages_monitors", (table) => {
      table.string("group_name").nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("pages_monitors", "group_name");
  if (hasColumn) {
    await knex.schema.alterTable("pages_monitors", (table) => {
      table.dropColumn("group_name");
    });
  }
}

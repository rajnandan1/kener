import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("triggers", (table) => {
    table.integer("template_id").unsigned().nullable();
    table.foreign("template_id").references("id").inTable("templates").onDelete("SET NULL");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("triggers", (table) => {
    table.dropForeign(["template_id"]);
    table.dropColumn("template_id");
  });
}

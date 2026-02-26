import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasCol = await knex.schema.hasColumn("users", "is_owner");
  if (!hasCol) {
    await knex.schema.alterTable("users", (table) => {
      table.string("is_owner").defaultTo("NO").notNullable();
    });
  }

  // Set the first user (by id) as owner, if any users exist
  const firstUser = await knex("users").orderBy("id", "asc").first();
  if (firstUser) {
    await knex("users").where("id", firstUser.id).update({ is_owner: "YES" });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCol = await knex.schema.hasColumn("users", "is_owner");
  if (hasCol) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("is_owner");
    });
  }
}

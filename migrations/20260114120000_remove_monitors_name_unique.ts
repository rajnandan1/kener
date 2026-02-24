import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Remove unique constraint from monitors.name (safe to fail if already dropped)
  try {
    await knex.schema.alterTable("monitors", (table) => {
      table.dropUnique(["name"]);
    });
  } catch (_e) {
    // Constraint already removed
  }
}

export async function down(knex: Knex): Promise<void> {
  // Re-add unique constraint to monitors.name
  await knex.schema.alterTable("monitors", (table) => {
    table.unique(["name"]);
  });
}

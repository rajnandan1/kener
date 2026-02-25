import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("maintenance_monitors"))) return;
  const hasCol = await knex.schema.hasColumn("maintenance_monitors", "monitor_impact");
  if (!hasCol) {
    await knex.schema.alterTable("maintenance_monitors", (table) => {
      table.string("monitor_impact").defaultTo("MAINTENANCE").notNullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("maintenance_monitors"))) return;
  await knex.schema.alterTable("maintenance_monitors", (table) => {
    table.dropColumn("monitor_impact");
  });
}

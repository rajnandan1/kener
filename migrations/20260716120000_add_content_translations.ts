import type { Knex } from "knex";

const TABLES = ["monitors", "incidents", "incident_comments", "maintenances"] as const;

export async function up(knex: Knex): Promise<void> {
  for (const tableName of TABLES) {
    const hasCol = await knex.schema.hasColumn(tableName, "translations");
    if (!hasCol) {
      await knex.schema.alterTable(tableName, (table) => {
        table.text("translations").nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const tableName of TABLES) {
    const hasCol = await knex.schema.hasColumn(tableName, "translations");
    if (hasCol) {
      await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn("translations");
      });
    }
  }
}

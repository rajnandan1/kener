import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  try {
    await knex.schema.alterTable("monitoring_data", (table) => {
      table.index(["timestamp"], "idx_monitoring_data_timestamp");
    });
  } catch (_e) {
    /* index already exists */
  }
  try {
    await knex.schema.alterTable("monitoring_data", (table) => {
      table.index(["monitor_tag", "type", "timestamp"], "idx_monitoring_data_monitor_tag_type_timestamp");
    });
  } catch (_e) {
    /* index already exists */
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("monitoring_data", (table) => {
    table.dropIndex(["timestamp"], "idx_monitoring_data_timestamp");
    table.dropIndex(["monitor_tag", "type", "timestamp"], "idx_monitoring_data_monitor_tag_type_timestamp");
  });
}

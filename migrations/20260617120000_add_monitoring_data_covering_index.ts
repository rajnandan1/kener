import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Covering index for the grouped status-count aggregation used by the
  // monitor-bars dashboard endpoint. The query filters by
  // (monitor_tag, timestamp range) and reads status + latency for every row.
  // Including status and latency in the index lets the database satisfy the
  // query from the index alone, avoiding a heap lookup per matched row.
  try {
    await knex.schema.alterTable("monitoring_data", (table) => {
      table.index(
        ["monitor_tag", "timestamp", "status", "latency"],
        "idx_monitoring_data_monitor_tag_timestamp_status_latency",
      );
    });
  } catch (_e) {
    /* index already exists */
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("monitoring_data", (table) => {
    table.dropIndex(
      ["monitor_tag", "timestamp", "status", "latency"],
      "idx_monitoring_data_monitor_tag_timestamp_status_latency",
    );
  });
}

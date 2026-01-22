import monitorSeed from "../src/lib/server/db/seedMonitorData.ts";
import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Check if the table is empty
  const count = await knex("monitors").count("id as CNT").first();
  if (count && count.CNT == 0) {
    // Deletes ALL existing entries
    for (const monitor of monitorSeed) {
      await knex("monitors").insert({
        tag: monitor.tag,
        name: monitor.name,
        description: monitor.description,
        image: monitor.image,
        cron: monitor.cron,
        default_status: monitor.default_status,
        status: monitor.status,
        category_name: monitor.category_name,
        monitor_type: monitor.monitor_type,
        type_data: monitor.type_data,
        day_degraded_minimum_count: monitor.day_degraded_minimum_count,
        day_down_minimum_count: monitor.day_down_minimum_count,
        include_degraded_in_downtime: monitor.include_degraded_in_downtime,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      });
    }
  }
}

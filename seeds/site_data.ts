import seedSiteData from "../src/lib/server/db/seedSiteData.ts";
import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Check if the table is empty
  const count = await knex("site_data").count("id as CNT").first();

  const seedDataRecord = seedSiteData as Record<string, unknown>;
  for (const key in seedDataRecord) {
    if (Object.prototype.hasOwnProperty.call(seedDataRecord, key)) {
      let value = seedDataRecord[key];
      let data_type = typeof value;
      if (data_type === "object") {
        value = JSON.stringify(value);
      }
      const existingEntry = await knex("site_data").where({ key: key }).first();
      if (!existingEntry) {
        await knex("site_data").insert([{ key: key, value: value, data_type: data_type }]);
      }
    }
  }
}

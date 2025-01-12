import seedSiteData from "../src/lib/server/db/seedSiteData.js";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
	// Check if the table is empty
	const count = await knex("site_data").count("id as CNT").first();

	for (const key in seedSiteData) {
		if (Object.prototype.hasOwnProperty.call(seedSiteData, key)) {
			let value = seedSiteData[key];
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

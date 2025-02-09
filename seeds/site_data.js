import seedSiteData from "../src/lib/server/db/seedSiteData.js";
import { config } from "dotenv";
config(); // Load .env variables
const isWhiteLabeled = process.env.WHITE_LABEL === 'true';

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

			// Remove attribution from metaTags for initial db seeding (if white-labeled)
			if (key === "metaTags" && data_type === "object" && Array.isArray(value) && isWhiteLabeled) {
				value.forEach(item => {
					if (item.key === "twitter:site" || item.key === "twitter:creator") {
						item.value = "kener";
					}
				});
			}

			// Remove Documentation & Github nav links from initial db seeding (if white-labeled)
			if (key === "nav" && data_type === "object" && Array.isArray(value) && isWhiteLabeled) {
				value = value.filter(item => item.name !== "Documentation" && item.name !== "Github");
			}

			// Remove GA tracking ID/key from initial db seeding (if white-labeled)
			if (key === "analytics" && data_type === "object" && Array.isArray(value) && isWhiteLabeled) {
				const gaObject = value.find(item => item.type === 'GA');
				if (gaObject) {
					gaObject.id = "";
				}
			}

			// Remove 'Created by' text on initial db seeding (if white-labeled)
			if (key === "footerHTML" && isWhiteLabeled) {
				// value = value.replace(/<span data-white-label>.*?<\/span>/s, ""); // Remove <span data-white-label>...</span>
				value = "";
			}

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

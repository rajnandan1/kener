import { GetSiteDataByKey } from "$lib/server/controllers/controller.js";

export async function load({ parent }) {
	let categories = await GetSiteDataByKey("categories");
	return {
		categories: categories
	};
}

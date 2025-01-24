// @ts-nocheck
import { FetchData } from "$lib/server/page";
import { GetMonitors } from "$lib/server/controllers/controller.js";

export async function load({ params, route, url, parent }) {
	let monitors = await GetMonitors({ status: "ACTIVE" });
	const parentData = await parent();
	const siteData = parentData.site;
	const monitorsActive = [];
	const query = url.searchParams;
	const theme = query.get("theme");
	for (let i = 0; i < monitors.length; i++) {
		//only return monitors that have category as home or category is not present
		if (monitors[i].tag !== params.tag) {
			continue;
		}
		delete monitors[i].api;
		delete monitors[i].default_status;
		monitors[i].embed = true;
		let data = await FetchData(
			siteData,
			monitors[i],
			parentData.localTz,
			parentData.selectedLang,
			parentData.lang
		);
		monitors[i].pageData = data;
		monitorsActive.push(monitors[i]);
	}
	return {
		monitors: monitorsActive,
		theme,
		openIncidents: []
	};
}

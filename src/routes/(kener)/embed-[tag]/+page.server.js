// @ts-nocheck
import { FetchData } from "$lib/server/page";
import monitorJSON from "$lib/server/data/monitors.json?raw";
import fs from "fs-extra";

export async function load({ params, route, url, parent }) {
	let monitors = JSON.parse(monitorJSON);
	const parentData = await parent();

	const monitorsActive = [];
	const query = url.searchParams;
	const theme = query.get("theme");
	for (let i = 0; i < monitors.length; i++) {
		//only return monitors that have category as home or category is not present
		if (monitors[i].tag !== params.tag) {
			continue;
		}
		delete monitors[i].api;
		delete monitors[i].defaultStatus;
		monitors[i].embed = true;
		let data = await FetchData(monitors[i], parentData.localTz);
		monitors[i].pageData = data;
		monitorsActive.push(monitors[i]);
	}

	return {
		monitors: monitorsActive,
		theme,
		openIncidents: []
	};
}

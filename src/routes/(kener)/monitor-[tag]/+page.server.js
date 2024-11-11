// @ts-nocheck
import { Mapper, GetOpenIncidents, FilterAndInsertMonitorInIncident } from "$lib/server/github.js";
import { FetchData } from "$lib/server/page";
import monitorJSON from "$lib/server/data/monitors.json?raw";
import fs from "fs-extra";

export async function load({ params, route, url, parent }) {
	let monitors = JSON.parse(monitorJSON);
	const parentData = await parent();
	const siteData = parentData.site;
	const github = siteData.github;
	const monitorsActive = [];
	for (let i = 0; i < monitors.length; i++) {
		//only return monitors that have category as home or category is not present
		if (monitors[i].tag !== params.tag) {
			continue;
		}
		delete monitors[i].api;
		delete monitors[i].defaultStatus;
		let data = await FetchData(monitors[i], parentData.localTz);
		monitors[i].pageData = data;
		monitorsActive.push(monitors[i]);
	}
	let openIncidents = await GetOpenIncidents(github);
	let openIncidentsReduced = openIncidents.map(Mapper);
	return {
		monitors: monitorsActive,
		openIncidents: FilterAndInsertMonitorInIncident(openIncidentsReduced, monitorsActive)
	};
}

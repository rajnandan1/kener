// @ts-nocheck
import { Mapper, GetOpenIncidents, FilterAndInsertMonitorInIncident } from "$lib/server/github.js";
import { FetchData } from "$lib/server/page";
import { GetMonitors } from "$lib/server/controllers/controller.js";

export async function load({ params, route, url, parent }) {
	let monitors = await GetMonitors({ status: "ACTIVE" });

	const parentData = await parent();
	const siteData = parentData.site;
	const github = siteData.github;
	const monitorsActive = [];
	for (let i = 0; i < monitors.length; i++) {
		if (monitors[i].hidden !== undefined && monitors[i].hidden === true) {
			continue;
		}
		if (
			monitors[i].categoryName === undefined ||
			monitors[i].categoryName !== params.category
		) {
			continue;
		}
		delete monitors[i].api;
		delete monitors[i].defaultStatus;
		let data = await FetchData(siteData, monitors[i], parentData.localTz);
		monitors[i].pageData = data;
		monitors[i].embed = false;
		monitorsActive.push(monitors[i]);
	}
	let openIncidents = await GetOpenIncidents();
	let openIncidentsReduced = openIncidents.map(Mapper);
	return {
		monitors: monitorsActive,
		openIncidents: FilterAndInsertMonitorInIncident(openIncidentsReduced, monitorsActive)
	};
}

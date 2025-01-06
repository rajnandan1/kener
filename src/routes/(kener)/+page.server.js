// @ts-nocheck
import { Mapper, GetOpenIncidents, FilterAndInsertMonitorInIncident } from "$lib/server/github.js";
import { FetchData } from "$lib/server/page";
import { GetMonitors } from "$lib/server/controllers/controller.js";

export async function load({ parent }) {
	let monitors = await GetMonitors({ status: "ACTIVE" });
	const parentData = await parent();
	const siteData = parentData.site;
	const github = siteData.github;
	const monitorsActive = [];
	for (let i = 0; i < monitors.length; i++) {
		//only return monitors that have category as home or category is not present
		if (!!monitors[i].category_name && monitors[i].category_name !== "Home") {
			continue;
		}
		delete monitors[i].api;
		delete monitors[i].default_status;

		let data = await FetchData(siteData, monitors[i], parentData.localTz);
		monitors[i].pageData = data;
		monitors[i].embed = false;

		monitors[i].activeIncidents = [];
		monitorsActive.push(monitors[i]);
	}
	let openIncidents = await GetOpenIncidents();
	let openIncidentsReduced = openIncidents.map(Mapper);

	return {
		monitors: monitorsActive,
		openIncidents: FilterAndInsertMonitorInIncident(openIncidentsReduced, monitorsActive)
	};
}

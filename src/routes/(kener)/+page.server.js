// @ts-nocheck
import { FetchData } from "$lib/server/page";
import { GetMonitors, GetIncidentsOpenHome } from "$lib/server/controllers/controller.js";

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
	let allOpenIncidents = await GetIncidentsOpenHome(siteData.homeIncidentCount);
	let resolvedIncidents = allOpenIncidents.filter((incident) => incident.state === "RESOLVED");
	let unresolvedIncidents = allOpenIncidents.filter((incident) => incident.state !== "RESOLVED");

	return {
		monitors: monitorsActive,
		resolvedIncidents: resolvedIncidents,
		unresolvedIncidents: unresolvedIncidents
	};
}

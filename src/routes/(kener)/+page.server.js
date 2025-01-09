// @ts-nocheck
import { FetchData } from "$lib/server/page";
import { GetMonitors, GetIncidentsOpenHome } from "$lib/server/controllers/controller.js";
import moment from "moment";

export async function load({ parent, url }) {
	let monitors = await GetMonitors({ status: "ACTIVE" });

	const query = url.searchParams;
	const requiredCategory = query.get("category") || "Home";
	const parentData = await parent();
	const siteData = parentData.site;
	const monitorsActive = [];
	for (let i = 0; i < monitors.length; i++) {
		//only return monitors that have category as home or category is not present
		if (
			!!!query.get("monitor") &&
			!!monitors[i].category_name &&
			monitors[i].category_name !== requiredCategory
		) {
			continue;
		}
		if (query.get("monitor") && query.get("monitor") !== monitors[i].tag) {
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
	let startWithin = moment().subtract(siteData.homeIncidentStartTimeWithin, "days").unix();
	let endWithin = moment().add(siteData.homeIncidentStartTimeWithin, "days").unix();
	let allOpenIncidents = await GetIncidentsOpenHome(
		siteData.homeIncidentCount,
		startWithin,
		endWithin
	);

	//if not home page
	let isCategoryPage = !!query.get("category") && query.get("category") !== "Home";
	let isMonitorPage = !!query.get("monitor");
	if (isCategoryPage || isMonitorPage) {
		let eligibleTags = monitorsActive.map((monitor) => monitor.tag);
		//filter incidents that have monitor_tag in monitors
		allOpenIncidents = allOpenIncidents.filter((incident) => {
			let incidentMonitors = incident.monitors;
			let monitorTags = incidentMonitors.map((monitor) => monitor.monitor_tag);
			let isPresent = false;
			monitorTags.forEach((tag) => {
				if (eligibleTags.includes(tag)) {
					isPresent = true;
				}
			});
			return isPresent;
		});
	}

	allOpenIncidents = allOpenIncidents.map((incident) => {
		let incidentMonitors = incident.monitors;
		let monitorTags = incidentMonitors.map((monitor) => monitor.monitor_tag);
		let xm = monitors.filter((monitor) => monitorTags.includes(monitor.tag));

		incident.monitors = xm.map((monitor) => {
			return {
				tag: monitor.tag,
				name: monitor.name,
				description: monitor.description,
				image: monitor.image,
				impact_type: incidentMonitors.filter((m) => m.monitor_tag === monitor.tag)[0]
					.monitor_impact
			};
		});
		return incident;
	});
	let unresolvedIncidents = allOpenIncidents.filter((incident) => incident.state !== "RESOLVED");
	return {
		monitors: monitorsActive,
		unresolvedIncidents: allOpenIncidents,
		categoryName: requiredCategory,
		isCategoryPage: isCategoryPage,
		isMonitorPage: isMonitorPage
	};
}

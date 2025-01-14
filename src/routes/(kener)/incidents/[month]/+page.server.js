// @ts-nocheck

import {
	GetMonitors,
	GetIncidentsOpenHome,
	GetIncidentsPage
} from "$lib/server/controllers/controller.js";
import { BeginningOfDay } from "$lib/server/tool.js";
import db from "$lib/server/db/db.js";
import moment from "moment";

export async function load({ parent, url, params }) {
	const parentData = await parent();
	let monitors = await GetMonitors({ status: "ACTIVE" });
	const query = url.searchParams;
	let todayStart = BeginningOfDay({ timeZone: parentData.localTz });
	let tomorrowStart = todayStart + 86400;

	let month = params.month;
	if (!!!month) {
		month = moment().format("MMMM-YYYY");
	}

	let monthStartTs = moment(month, "MMMM-YYYY").unix();

	let monthEndTs = moment(month, "MMMM-YYYY").endOf("month").unix();

	let incidents = await GetIncidentsPage(monthStartTs, monthEndTs);

	incidents = incidents.map((incident) => {
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

	return {
		incidents: incidents,
		nextMonthName: moment(month, "MMMM-YYYY").add(1, "months").format("MMMM-YYYY"),
		prevMonthName: moment(month, "MMMM-YYYY").subtract(1, "months").format("MMMM-YYYY"),
		thisMonthName: month
	};
}

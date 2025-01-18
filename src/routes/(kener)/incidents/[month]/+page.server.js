// @ts-nocheck

import {
	GetMonitors,
	GetIncidentsOpenHome,
	GetIncidentsPage,
	GetLocaleFromCookie
} from "$lib/server/controllers/controller.js";
import { BeginningOfDay } from "$lib/server/tool.js";
import db from "$lib/server/db/db.js";
import {
	format,
	addMonths,
	parse,
	subMonths,
	getUnixTime,
	startOfMonth,
	endOfMonth
} from "date-fns";
import { f } from "$lib/i18n/client";

export async function load({ parent, url, params, cookies }) {
	const parentData = await parent();

	let monitors = await GetMonitors({ status: "ACTIVE" });
	const query = url.searchParams;
	let todayStart = BeginningOfDay({ timeZone: parentData.localTz });
	let tomorrowStart = todayStart + 86400;
	let locale = GetLocaleFromCookie(parentData.site, cookies);
	let month = params.month; //January-2021
	if (!!!month) {
		month = format(new Date(), "MMMM-yyyy");
	}

	let monthStartTs = getUnixTime(startOfMonth(parse(month, "MMMM-yyyy", new Date())));

	let monthEndTs = getUnixTime(endOfMonth(parse(month, "MMMM-yyyy", new Date())));

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
		nextMonthName: f(addMonths(parse(month, "MMMM-yyyy", new Date()), 1), "MMMM-yyyy", "en"),
		prevMonthName: f(subMonths(parse(month, "MMMM-yyyy", new Date()), 1), "MMMM-yyyy", "en"),
		thisMonthName: f(parse(month, "MMMM-yyyy", new Date()), "MMMM-yyyy", "en")
	};
}

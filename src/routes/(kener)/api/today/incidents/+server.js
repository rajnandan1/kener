// @ts-nocheck
import db from "$lib/server/db/db.js";
import { json } from "@sveltejs/kit";
import { BeginningOfDay } from "$lib/server/tool.js";
export async function POST({ request }) {
	const payload = await request.json();
	let start = payload.startTs;
	let end = payload.endTs;
	let tag = payload.tag;
	let localTz = payload.localTz;

	let incidents = await db.getIncidentsByMonitorTag(tag, start, end);
	let resp = {};
	for (let i = 0; i < incidents.length; i++) {
		let incident = incidents[i];
		let timestamp = incident.start_date_time;
		let startOfThatDay = BeginningOfDay({
			date: new Date(timestamp * 1000),
			timeZone: localTz
		});
		if (!resp[startOfThatDay]) {
			resp[startOfThatDay] = {
				ids: [],
				monitor_impact: incident.monitor_impact
			};
		}
		resp[startOfThatDay].ids.push(incident.id);
		if (resp[startOfThatDay].monitor_impact !== "DOWN") {
			resp[startOfThatDay].monitor_impact = incident.monitor_impact;
		}
	}
	return json(resp);
}

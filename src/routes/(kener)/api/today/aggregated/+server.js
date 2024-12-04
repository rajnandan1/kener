// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import {
	GetMinuteStartNowTimestampUTC,
	BeginningOfDay,
	StatusObj,
	ParseUptime
} from "$lib/server/tool.js";
import db from "$lib/server/db/db.js";

export async function POST({ request }) {
	const payload = await request.json();
	const monitor = payload.monitor;
	const start = payload.startTs;
	let end = GetMinuteStartNowTimestampUTC();
	let aggregatedData = await db.getAggregatedData(monitor.tag, start, end);
	let ups = Number(aggregatedData.UP);
	let downs = Number(aggregatedData.DOWN);
	let degradeds = Number(aggregatedData.DEGRADED);

	let total = ups + downs + degradeds;
	let uptime = ParseUptime(ups + degradeds, total);
	if (monitor.includeDegradedInDowntime === true) {
		uptime = ParseUptime(ups, total);
	}

	return json({ uptime });
}

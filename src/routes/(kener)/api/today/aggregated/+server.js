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
	let aggregatedData = await db.getAggregatedMonitoringData(monitor.tag, start, end);
	let ups = Number(aggregatedData.UP || aggregatedData.up);
	let downs = Number(aggregatedData.DOWN || aggregatedData.down);
	let degradeds = Number(aggregatedData.DEGRADED || aggregatedData.degraded);

	let total = ups + downs + degradeds;
	let uptime = ParseUptime(ups + degradeds, total);
	if (monitor.include_degraded_in_downtime === "YES") {
		uptime = ParseUptime(ups, total);
	}

	return json({ uptime });
}

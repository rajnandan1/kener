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
import { GetAllSiteData } from "$lib/server/controllers/controller.js";

export async function POST({ request }) {
	const payload = await request.json();
	const monitor = payload.monitor;
	const localTz = payload.localTz;
	let _0Day = {};

	const now = GetMinuteStartNowTimestampUTC() + 60;
	const start = payload.startTs;
	let end = Math.min(payload.startTs + 24 * 60 * 60, now);

	for (let i = start; i < end; i += 60) {
		_0Day[i] = {
			timestamp: i,
			status: "NO_DATA",
			cssClass: StatusObj.NO_DATA,
			index: (i - start) / 60
		};
	}

	let dayData = await db.getMonitoringData(monitor.tag, payload.startTs, end);
	let siteData = await GetAllSiteData();

	let ups = 0;
	let downs = 0;
	let degradeds = 0;

	for (let i = 0; i < dayData.length; i++) {
		let row = dayData[i];
		let timestamp = row.timestamp;
		let status = row.status;
		let cssClass = StatusObj.UP;

		if (status == "DEGRADED") {
			cssClass = StatusObj.DEGRADED;
		}
		if (status == "DOWN") {
			cssClass = StatusObj;
		}
		if (_0Day[timestamp] !== undefined) {
			_0Day[timestamp].status = status;
			_0Day[timestamp].cssClass = StatusObj[status];
		}

		if (status == "UP") {
			ups++;
		} else if (status == "DOWN") {
			downs++;
		} else {
			degradeds++;
		}
	}

	let total = ups + downs + degradeds;
	let uptime = ParseUptime(ups + degradeds, total);
	if (monitor.include_degraded_in_downtime === "YES") {
		uptime = ParseUptime(ups, total);
	}

	return json({ _0Day, uptime });
}

export async function GET({ request }) {
	const payload = await request.json();
	const monitor = payload.monitor;
	const now = GetMinuteStartNowTimestampUTC();
	const start = payload.startTs;
	let end = Math.min(payload.startTs + 24 * 60 * 60, now);
	let aggregatedData = db.getDataGroupByMinute(monitor.tag, start, end);
	let ups = aggregatedData.UP;
	let downs = aggregatedData.DOWN;
	let degradeds = aggregatedData.DEGRADED;

	let total = ups + downs + degradeds;
	let uptime = ParseUptime(ups + degradeds, total);
	if (monitor.include_degraded_in_downtime === "YES") {
		uptime = ParseUptime(ups, total);
	}

	return json({ uptime });
}

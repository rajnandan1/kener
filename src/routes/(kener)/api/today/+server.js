// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { GetMinuteStartNowTimestampUTC, BeginningOfDay, StatusObj } from "$lib/server/tool.js";
import db from "$lib/server/db/db.js";

export async function POST({ request }) {
	const payload = await request.json();
	const monitor = payload.monitor;
	const localTz = payload.localTz;
	let _0Day = {};

	const now = GetMinuteStartNowTimestampUTC();
	const midnight = BeginningOfDay({ timeZone: localTz });

	for (let i = midnight; i <= now; i += 60) {
		_0Day[i] = {
			timestamp: i,
			status: "NO_DATA",
			cssClass: StatusObj.NO_DATA,
			index: (i - midnight) / 60
		};
	}

	let dayData = db.getData(monitor.tag, midnight, now);
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
	}

	return json(_0Day);
}

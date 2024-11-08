// @ts-nocheck
// @ts-ignore
import fs from "fs-extra";
import { json } from "@sveltejs/kit";
import { GetMinuteStartNowTimestampUTC, BeginningOfDay } from "$lib/server/tool.js";
import { StatusObj } from "$lib/helpers.js";

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

	let day0 = JSON.parse(fs.readFileSync(monitor.path0Day, "utf8"));

	for (const timestamp in day0) {
		const element = day0[timestamp];
		let status = element.status;
		//0 Day data
		if (_0Day[timestamp] !== undefined) {
			_0Day[timestamp].status = status;
			_0Day[timestamp].cssClass = StatusObj[status];
		}
	}

	return json(_0Day);
}

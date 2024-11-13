// @ts-nocheck
import fs from "fs-extra";
import { GetMinuteStartNowTimestampUTC, BeginningOfDay } from "./tool.js";
import { StatusObj, ParseUptime } from "../helpers.js";

function getDayMessage(type, numOfMinute) {
	if (numOfMinute > 59) {
		let hour = Math.floor(numOfMinute / 60);
		let minute = numOfMinute % 60;
		return `${type} for ${hour}h:${minute}m`;
	} else {
		return `${type} for ${numOfMinute} minute${numOfMinute > 1 ? "s" : ""}`;
	}
}
const NO_DATA = "No Data";

function getDayData(day0, startTime, endTime, dayDownMinimumCount, dayDegradedMinimumCount) {
	let dayData = {
		UP: 0,
		DEGRADED: 0,
		DOWN: 0,
		timestamp: startTime,
		cssClass: StatusObj.NO_DATA,
		message: NO_DATA
	};
	//loop through the ts range
	for (let i = startTime; i <= endTime; i += 60) {
		//if the ts is in the day0 then add up, down degraded data, if not initialize it
		if (day0[i] === undefined) {
			continue;
		}

		if (day0[i].status == "UP") {
			dayData.UP++;
		} else if (day0[i].status == "DEGRADED") {
			dayData.DEGRADED++;
		} else if (day0[i].status == "DOWN") {
			dayData.DOWN++;
		}
	}

	let cssClass = StatusObj.UP;
	let message = "Status OK";

	if (dayData.DEGRADED >= dayDegradedMinimumCount) {
		cssClass = StatusObj.DEGRADED;
		message = getDayMessage("DEGRADED", dayData.DEGRADED);
	}
	if (dayData.DOWN >= dayDownMinimumCount) {
		cssClass = StatusObj.DOWN;
		message = getDayMessage("DOWN", dayData.DOWN);
	}
	if (
		dayData.DEGRADED + dayData.DOWN + dayData.UP >=
		Math.min(dayDownMinimumCount, dayDegradedMinimumCount)
	) {
		dayData.message = message;
		dayData.cssClass = cssClass;
	}

	return dayData;
}

const Ninety = async (monitor) => {
	let _0Day = {};
	let _90Day = {};
	let uptime0Day = "0";
	let dailyUps = 0;
	let dailyDown = 0;
	let dailyDegraded = 0;
	let completeUps = 0;
	let completeDown = 0;
	let completeDegraded = 0;

	const secondsInDay = 24 * 60 * 60;
	const now = GetMinuteStartNowTimestampUTC();
	const midnight = BeginningOfDay({ timeZone: "GMT" });
	const midnight90DaysAgo = midnight - 90 * 24 * 60 * 60;
	const midnightTomorrow = midnight + secondsInDay;

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
		if (status == "UP") {
			completeUps++;
		} else if (status == "DEGRADED") {
			completeDegraded++;
		} else if (status == "DOWN") {
			completeDown++;
		}
		//0 Day data
		if (_0Day[timestamp] !== undefined) {
			_0Day[timestamp].status = status;
			_0Day[timestamp].cssClass = StatusObj[status];

			dailyUps = status == "UP" ? dailyUps + 1 : dailyUps;
			dailyDown = status == "DOWN" ? dailyDown + 1 : dailyDown;
			dailyDegraded = status == "DEGRADED" ? dailyDegraded + 1 : dailyDegraded;
		}
	}

	for (let i = midnight90DaysAgo; i < midnightTomorrow; i += secondsInDay) {
		_90Day[i] = getDayData(
			day0,
			i,
			i + secondsInDay - 1,
			monitor.dayDownMinimumCount,
			monitor.dayDegradedMinimumCount
		);
	}

	for (const key in _90Day) {
		const element = _90Day[key];
		delete _90Day[key].UP;
		delete _90Day[key].DEGRADED;
		delete _90Day[key].DOWN;
		if (element.message == NO_DATA) continue;
	}

	let uptime0DayNumerator = dailyUps + dailyDegraded;
	let uptime0DayDenominator = dailyUps + dailyDown + dailyDegraded;
	let uptime90DayNumerator = completeUps + completeDegraded;
	let uptime90DayDenominator = completeUps + completeDown + completeDegraded;

	if (monitor.includeDegradedInDowntime === true) {
		uptime0DayNumerator = dailyUps;
		uptime90DayNumerator = completeUps;
	}
	uptime0Day = ParseUptime(uptime0DayNumerator, uptime0DayDenominator);

	const dataToWrite = {
		_90Day: _90Day,
		uptime0Day,
		uptime90Day: ParseUptime(uptime90DayNumerator, uptime90DayDenominator),
		dailyUps,
		dailyDown,
		dailyDegraded
	};

	await fs.writeJson(monitor.path90Day, dataToWrite);

	return true;
};

export { Ninety };

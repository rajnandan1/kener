// @ts-nocheck
// @ts-ignore
import db from "$lib/server/db/db.js";
import {
	GetMinuteStartNowTimestampUTC,
	BeginningOfDay,
	StatusObj,
	StatusColor,
	ParseUptime,
	GetDayStartTimestampUTC
} from "$lib/server/tool.js";
import { siteStore } from "$lib/server/stores/site";
import { get } from "svelte/store";

function getDayMessage(type, numOfMinute) {
	if (numOfMinute > 59) {
		let hour = Math.floor(numOfMinute / 60);
		let minute = numOfMinute % 60;
		return `${type} for ${hour}h:${minute}m`;
	} else {
		return `${type} for ${numOfMinute} minute${numOfMinute > 1 ? "s" : ""}`;
	}
}
function getTimezoneOffset(timeZone) {
	const formatter = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" });
	const parts = formatter.formatToParts(new Date());
	const timeZoneOffset = parts.find((part) => part.type === "timeZoneName")?.value;

	const match = timeZoneOffset.match(/([+-]\d{2}):?(\d{2})/);
	if (!match) return 0;

	const [, hours, minutes] = match;
	return parseInt(hours) * 60 + parseInt(minutes);
}

function returnStatusClass(val, c, barStyle) {
	if (barStyle === undefined || barStyle == "FULL") {
		return c;
	} else if (barStyle == "PARTIAL") {
		let totalHeight = 24 * 60;
		let cl = `api-up`;
		if (val > 0 && val <= 0.1 * totalHeight) {
			cl = c + "-10";
		} else if (val > 0.1 * totalHeight && val <= 0.2 * totalHeight) {
			cl = c + "-20";
		} else if (val > 0.2 * totalHeight && val <= 0.4 * totalHeight) {
			cl = c + "-40";
		} else if (val > 0.4 * totalHeight && val <= 0.6 * totalHeight) {
			cl = c + "-60";
		} else if (val > 0.6 * totalHeight && val <= 0.8 * totalHeight) {
			cl = c + "-80";
		} else if (val > 0.8 * totalHeight && val <= totalHeight) {
			cl = c;
		}
		return cl;
	}
	return c;
}

const FetchData = async function (monitor, localTz) {
	const secondsInDay = 24 * 60 * 60;

	let site = get(siteStore);
	//get offset from utc in minutes

	const now = GetMinuteStartNowTimestampUTC();
	const midnight = BeginningOfDay({ timeZone: localTz });
	const midnight90DaysAgo = midnight - 90 * 24 * 60 * 60;
	const NO_DATA = "No Data";
	const midnightTomorrow = midnight + secondsInDay;
	let offsetInMinutes = parseInt((GetDayStartTimestampUTC(now) - midnight) / 60);
	const _90Day = {};
	let latestTimestamp = 0;
	let ij = 0;
	for (let i = midnight90DaysAgo; i < midnightTomorrow; i += secondsInDay) {
		_90Day[i] = {
			UP: 0,
			DEGRADED: 0,
			DOWN: 0,
			timestamp: i,
			cssClass: StatusObj.NO_DATA,
			textClass: StatusObj.NO_DATA,
			message: NO_DATA,
			border: true,
			ij: ij
		};
		ij++;
		latestTimestamp = i;
	}

	let dbData = db.getDataGroupByDayAlternative(
		monitor.tag,
		midnight90DaysAgo,
		midnightTomorrow,
		offsetInMinutes
	);
	let totalDegradedCount = 0;
	let totalDownCount = 0;
	let totalUpCount = 0;

	let summaryText = NO_DATA;
	let summaryColorClass = "api-nodata";

	for (let i = 0; i < dbData.length; i++) {
		let dayData = dbData[i];
		let ts = dayData.timestamp;
		let cssClass = StatusObj.UP;
		let message = "Status OK";

		totalDegradedCount += dayData.DEGRADED;
		totalDownCount += dayData.DOWN;
		totalUpCount += dayData.UP;

		if (dayData.DEGRADED >= monitor.dayDegradedMinimumCount) {
			cssClass = returnStatusClass(dayData.DEGRADED, StatusObj.DEGRADED, site.barStyle);
			message = getDayMessage("DEGRADED", dayData.DEGRADED);
		}
		if (dayData.DOWN >= monitor.dayDownMinimumCount) {
			cssClass = returnStatusClass(dayData.DOWN, StatusObj.DOWN, site.barStyle);
			message = getDayMessage("DOWN", dayData.DOWN);
		}

		if (!!_90Day[ts]) {
			_90Day[ts].timestamp = ts;
			_90Day[ts].cssClass = cssClass;
			_90Day[ts].message = message;
			_90Day[ts].textClass = cssClass.replace(/-\d+$/, "");
		}
	}
	let uptime90DayNumerator = totalUpCount + totalDegradedCount;
	let uptime90DayDenominator = totalUpCount + totalDownCount + totalDegradedCount;

	//remove degraded from uptime
	if (monitor.includeDegradedInDowntime === true) {
		uptime90DayNumerator = totalUpCount;
	}
	// return _90Day;
	let uptime90Day = ParseUptime(uptime90DayNumerator, uptime90DayDenominator);
	if (site.summaryStyle === "CURRENT") {
		let lastDbData = db.getData(monitor.tag, latestTimestamp, latestTimestamp + secondsInDay);
		let lastData = lastDbData[lastDbData.length - 1];
		summaryText = "Status OK";
		summaryColorClass = "api-up";
		if (lastData.DEGRADED >= monitor.dayDegradedMinimumCount) {
			summaryText = getDayMessage("DEGRADED", lastData.DEGRADED);
			summaryColorClass = "api-degraded";
		}
		if (lastData.DOWN >= monitor.dayDownMinimumCount) {
			summaryText = getDayMessage("DOWN", lastData.DOWN);
			summaryColorClass = "api-down";
		}
	} else {
		let lastData = _90Day[latestTimestamp];
		summaryText = lastData.message;
		summaryColorClass = lastData.cssClass.replace(/-\d+$/, "");
	}
	return {
		_90Day: _90Day,
		uptime90Day: uptime90Day,
		summaryText: summaryText,
		summaryColorClass: summaryColorClass,
		barRoundness: site.barRoundness
	};
};
export { FetchData };

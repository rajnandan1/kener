// @ts-nocheck
// @ts-ignore
import db from "$lib/server/db/db.js";
import {
	GetMinuteStartNowTimestampUTC,
	BeginningOfDay,
	StatusObj,
	ParseUptime,
	GetDayStartTimestampUTC
} from "$lib/server/tool.js";
import { formatDuration, intervalToDuration } from "date-fns";
import { fdm } from "$lib/i18n/client";
import {
	GetDataGroupByDayAlternative,
	InterpolateData,
	GetLastStatusBefore
} from "$lib/server/controllers/controller.js";

function getSummaryDuration(numOfMinute, selectedLang) {
	// Convert minutes to milliseconds and create duration object
	const duration = intervalToDuration({
		start: new Date(0),
		end: new Date(numOfMinute * 60 * 1000)
	});

	return fdm(duration, selectedLang);
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

function returnStatusClass(val, total, c, barStyle) {
	// return "api-degraded-10";
	if (barStyle === undefined || barStyle == "FULL") {
		return c;
	} else if (barStyle == "PARTIAL") {
		let totalHeight = total;
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
		} else if (val > 0.8 * totalHeight && val < totalHeight) {
			cl = c + "-90";
		} else if (val == totalHeight) {
			cl = c;
		}
		return cl;
	}
	return c;
}

function getCountOfSimilarStatuesEnd(arr, statusType) {
	let count = 0;
	for (let i = arr.length - 1; i >= 0; i--) {
		if (arr[i].status === statusType) {
			count++;
		} else {
			break;
		}
	}
	return count;
}

const FetchData = async function (site, monitor, localTz, selectedLang) {
	const secondsInDay = 24 * 60 * 60;
	//get offset from utc in minutes

	const now = GetMinuteStartNowTimestampUTC() + 60;
	const midnight = BeginningOfDay({ timeZone: localTz });
	const midnight90DaysAgo = midnight - 90 * 24 * 60 * 60;
	const NO_DATA = "No Data";
	const midnightTomorrow = midnight + secondsInDay;
	let offsetInMinutes = parseInt((GetDayStartTimestampUTC(now) - midnight) / 60);
	const _90Day = {};
	let latestTimestamp = 0;
	for (let i = midnight90DaysAgo; i < midnightTomorrow; i += secondsInDay) {
		_90Day[i] = {
			UP: 0,
			DEGRADED: 0,
			DOWN: 0,
			timestamp: i,
			cssClass: StatusObj.NO_DATA,
			textClass: StatusObj.NO_DATA,
			summaryDuration: 0,
			summaryStatus: NO_DATA,
			message: NO_DATA,
			border: true
		};
		latestTimestamp = i;
	}

	let dbData = await GetDataGroupByDayAlternative(
		monitor.tag,
		midnight90DaysAgo,
		midnightTomorrow,
		offsetInMinutes
	);
	let totalDegradedCount = 0;
	let totalDownCount = 0;
	let totalUpCount = 0;

	let summaryDuration = 0;
	let summaryStatus = "UP";

	let summaryColorClass = "api-nodata";

	let todayDataDb = await db.getMonitoringData(monitor.tag, midnight, midnight + secondsInDay);
	let anchorStatus = await GetLastStatusBefore(monitor.tag, midnight);
	todayDataDb = InterpolateData(todayDataDb, midnight, anchorStatus);

	for (let i = 0; i < dbData.length; i++) {
		let dayData = dbData[i];
		let ts = dayData.timestamp;
		let cssClass = StatusObj.UP;
		let message = "Status OK";
		let summaryDuration = 0;
		let summaryStatus = "UP";

		totalDegradedCount += dayData.DEGRADED;
		totalDownCount += dayData.DOWN;
		totalUpCount += dayData.UP;

		if (dayData.DEGRADED >= monitor.day_degraded_minimum_count) {
			cssClass = returnStatusClass(
				dayData.DEGRADED,
				dayData.total,
				StatusObj.DEGRADED,
				site.barStyle
			);
			summaryDuration = getSummaryDuration(dayData.DEGRADED, selectedLang);
			summaryStatus = "DEGRADED";
		}
		if (dayData.DOWN >= monitor.day_down_minimum_count) {
			cssClass = returnStatusClass(
				dayData.DOWN,
				dayData.total,
				StatusObj.DOWN,
				site.barStyle
			);

			summaryDuration = getSummaryDuration(dayData.DOWN, selectedLang);
			summaryStatus = "DOWN";
		}

		if (!!_90Day[ts]) {
			_90Day[ts].timestamp = ts;
			_90Day[ts].cssClass = cssClass;
			_90Day[ts].summaryDuration = summaryDuration;
			_90Day[ts].summaryStatus = summaryStatus;
			_90Day[ts].textClass = cssClass.replace(/-\d+$/, "");
		}
	}
	let uptime90DayNumerator = totalUpCount + totalDegradedCount;
	let uptime90DayDenominator = totalUpCount + totalDownCount + totalDegradedCount;

	//remove degraded from uptime
	if (monitor.include_degraded_in_downtime === "YES") {
		uptime90DayNumerator = totalUpCount;
	}
	// return _90Day;
	let uptime90Day = ParseUptime(uptime90DayNumerator, uptime90DayDenominator);

	if (site.summaryStyle === "CURRENT") {
		summaryColorClass = "api-up";

		let lastRow = todayDataDb[todayDataDb.length - 1];

		if (!!lastRow && lastRow.status == "DEGRADED") {
			summaryDuration = getSummaryDuration(
				getCountOfSimilarStatuesEnd(todayDataDb, "DEGRADED"),
				selectedLang
			);
			summaryStatus = "DEGRADED";
			summaryColorClass = "api-degraded";
		}
		if (!!lastRow && lastRow.status == "DOWN") {
			summaryDuration = getSummaryDuration(
				getCountOfSimilarStatuesEnd(todayDataDb, "DOWN"),
				selectedLang
			);
			summaryStatus = "DOWN";
			summaryColorClass = "api-down";
		}
	} else {
		let lastData = _90Day[latestTimestamp];
		summaryColorClass = lastData.cssClass.replace(/-\d+$/, "");
		summaryDuration = lastData.summaryDuration;
		summaryStatus = lastData.summaryStatus;
	}
	return {
		_90Day: _90Day,
		uptime90Day: uptime90Day,
		summaryDuration: summaryDuration,
		summaryStatus: summaryStatus,
		summaryColorClass: summaryColorClass,
		barRoundness: site.barRoundness,
		midnight90DaysAgo: midnight90DaysAgo,
		midnightTomorrow: midnightTomorrow
	};
};
export { FetchData };

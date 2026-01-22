import db from "$lib/server/db/db.js";
import {
  GetMinuteStartNowTimestampUTC,
  BeginningOfDay,
  StatusObj,
  ParseUptime,
  GetDayStartTimestampUTC,
  BeginningOfMinute,
} from "$lib/server/tool.js";
import { formatDuration, intervalToDuration } from "date-fns";
import { fdm, l, summaryTime } from "$lib/i18n/client";
import {
  GetDataGroupByDayAlternative,
  InterpolateData,
  GetLastStatusBefore,
} from "$lib/server/controllers/controller.js";
import { UP, DOWN, DEGRADED, NO_DATA } from "$lib/server/constants.js";
import type { MonitorRecord } from "$lib/server/types/db.js";
import type { SiteDataTransformed } from "$lib/server/controllers/controller";
import type { MonitorItem } from "$lib/clientTools";

interface DayData {
  timestamp: number;
  DEGRADED: number;
  DOWN: number;
  UP: number;
  MAINTENANCE: number;
  NO_DATA: number;
  total: number;
}

interface DayEntry {
  border: boolean;
  timestamp: number;
  cssClass: string;
  summaryStatus: string;
  textClass: string;
  summaryDuration?: string;
}

interface InterpolatedEntry {
  status: string;
  timestamp: number;
}

function getSummaryDuration(numOfMinute: number, selectedLang: string): string {
  // Convert minutes to milliseconds and create duration object
  const duration = intervalToDuration({
    start: new Date(0),
    end: new Date(numOfMinute * 60 * 1000),
  });

  return fdm(duration, selectedLang);
}
function getTimezoneOffset(timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" });
  const parts = formatter.formatToParts(new Date());
  const timeZoneOffset = parts.find((part) => part.type === "timeZoneName")?.value;

  if (!timeZoneOffset) return 0;
  const match = timeZoneOffset.match(/([+-]\d{2}):?(\d{2})/);
  if (!match) return 0;

  const [, hours, minutes] = match;
  return parseInt(hours) * 60 + parseInt(minutes);
}

function returnStatusClass(val: number, total: number, c: string, barStyle?: string): string {
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

function getCountOfSimilarStatuesEnd(arr: InterpolatedEntry[], statusType: string): number {
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

const FetchData = async function (
  site: SiteDataTransformed,
  monitor: MonitorItem,
  localTz: string,
  selectedLang: string,
  lang: Record<string, string>,
  isMobile: boolean,
) {
  const secondsInDay = 24 * 60 * 60;
  //get offset from utc in minutes
  const nowUTC = GetMinuteStartNowTimestampUTC();

  let deviceType: "mobile" | "desktop" = isMobile ? "mobile" : "desktop";
  let homeDataMaxDays = {
    maxDays: 90,
    selectableDays: [1, 7, 14, 30, 60, 90],
  };
  if (site.homeDataMaxDays && site.homeDataMaxDays[deviceType]) {
    homeDataMaxDays = site.homeDataMaxDays[deviceType] || { maxDays: 90 };
  }

  const midnightTz = BeginningOfDay({ timeZone: localTz });
  const midnight90DaysAgoTz = midnightTz - (homeDataMaxDays.maxDays - 1) * 24 * 60 * 60;
  const NO_DATA_STR = "No Data";
  let offsetInMinutes = Math.floor((GetDayStartTimestampUTC(nowUTC) - midnightTz) / 60);
  const maxDateTodayTimestampTz = BeginningOfMinute({ timeZone: localTz });
  const _90Day: Record<number, DayEntry> = {};
  let latestTimestamp = 0;

  let dbData = await GetDataGroupByDayAlternative(
    monitor.tag,
    midnight90DaysAgoTz,
    maxDateTodayTimestampTz,
    offsetInMinutes,
  );
  let totalDegradedCount = 0;
  let totalDownCount = 0;
  let totalUpCount = 0;

  for (let i = 0; i < dbData.length; i++) {
    let dayData = dbData[i] as DayData;
    let ts = dayData.timestamp;
    let cssClass = StatusObj.UP;
    let summaryDuration = "";
    let summaryStatus = UP;
    latestTimestamp = ts;
    totalDegradedCount += dayData.DEGRADED;
    totalDownCount += dayData.DOWN;
    totalUpCount += dayData.UP;
    if (dayData.DEGRADED >= (monitor.day_degraded_minimum_count || 0)) {
      cssClass = returnStatusClass(dayData.DEGRADED, dayData.total, StatusObj.DEGRADED, site.barStyle);
      summaryDuration = getSummaryDuration(dayData.DEGRADED, selectedLang);
      summaryStatus = "DEGRADED";
    }
    if (dayData.DOWN >= (monitor.day_down_minimum_count || 0)) {
      cssClass = returnStatusClass(dayData.DOWN, dayData.total, StatusObj.DOWN, site.barStyle);

      summaryDuration = getSummaryDuration(dayData.DOWN, selectedLang);
      summaryStatus = "DOWN";
    }
    if (dayData.MAINTENANCE > 0) {
      cssClass = returnStatusClass(dayData.MAINTENANCE, dayData.total, StatusObj.MAINTENANCE, site.barStyle);
      summaryDuration = getSummaryDuration(dayData.MAINTENANCE, selectedLang);
      summaryStatus = "MAINTENANCE";
    }
    if (dayData.NO_DATA === dayData.total) {
      cssClass = StatusObj.NO_DATA;
      summaryStatus = NO_DATA_STR;
    }

    _90Day[ts] = {
      border: true,
      timestamp: ts,
      cssClass: cssClass,
      summaryStatus: l(lang, summaryTime(summaryStatus), {
        status: l(lang, summaryStatus),
        duration: summaryDuration,
      }),
      textClass: cssClass.replace(/-\d+$/, ""),
      summaryDuration: summaryDuration,
    };
  }

  let uptime90DayNumerator = totalUpCount + totalDegradedCount;
  let uptime90DayDenominator = totalUpCount + totalDownCount + totalDegradedCount;

  //remove degraded from uptime
  if (monitor.include_degraded_in_downtime === "YES") {
    uptime90DayNumerator = totalUpCount;
  }
  // return _90Day;
  let uptime90Day = ParseUptime(uptime90DayNumerator, uptime90DayDenominator);

  let summaryDuration = "";
  let summaryStatus = "UP";

  let summaryColorClass = "api-nodata";

  let todayDataDb = await db.getMonitoringData(monitor.tag, midnightTz, maxDateTodayTimestampTz);
  let anchorStatus = await GetLastStatusBefore(monitor.tag, midnightTz);
  let todayData = InterpolateData(
    todayDataDb.map((d) => ({ status: d.status || "NO_DATA", timestamp: d.timestamp })),
    midnightTz,
    anchorStatus,
    maxDateTodayTimestampTz,
  );

  if (site.summaryStyle === "CURRENT") {
    summaryColorClass = "api-up";

    let lastRow = todayData[todayData.length - 1];

    if (!!lastRow && lastRow.status == "DEGRADED") {
      summaryDuration = getSummaryDuration(getCountOfSimilarStatuesEnd(todayData, "DEGRADED"), selectedLang);
      summaryStatus = "DEGRADED";
      summaryColorClass = "api-degraded";
    }
    if (!!lastRow && lastRow.status == "DOWN") {
      summaryDuration = getSummaryDuration(getCountOfSimilarStatuesEnd(todayData, "DOWN"), selectedLang);
      summaryStatus = "DOWN";
      summaryColorClass = "api-down";
    }
    if (!!lastRow && lastRow.status == "MAINTENANCE") {
      summaryDuration = getSummaryDuration(getCountOfSimilarStatuesEnd(todayData, "MAINTENANCE"), selectedLang);
      summaryStatus = "MAINTENANCE";
      summaryColorClass = "api-maintenance";
    }
    if (lastRow?.status === "NO_DATA") {
      summaryStatus = NO_DATA_STR;
      summaryColorClass = "api-nodata";
    }
    summaryStatus = l(lang, summaryTime(summaryStatus), {
      status: l(lang, summaryStatus),
      duration: summaryDuration,
    });
  } else {
    let lastData = _90Day[latestTimestamp];
    summaryColorClass = lastData.cssClass.replace(/-\d+$/, "");
    summaryDuration = lastData.summaryDuration || "";
    summaryStatus = lastData.summaryStatus;
  }
  return {
    _90Day: _90Day,
    uptime90Day: uptime90Day,
    summaryStatus: summaryStatus,
    summaryColorClass: summaryColorClass,
    barRoundness: site.barRoundness,
    midnight90DaysAgo: midnight90DaysAgoTz,
    maxDateTodayTimestamp: maxDateTodayTimestampTz,
    startOfTheDay: midnightTz,
    homeDataMaxDays,
  };
};
export { FetchData };

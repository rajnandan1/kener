import { ParseUptime, GetMinuteStartNowTimestampUTC } from "$lib/server/tool.js";
import { makeBadge } from "badge-maker";
import moment from "moment";
import {
  GetMonitors,
  GetLastStatusBefore,
  InterpolateData,
  AggregateData,
  GetMonitoringData,
  GetMonitoringDataAll,
  GetSiteDataByKey,
  GetLastStatusBeforeAll,
} from "$lib/server/controllers/controller.js";
import { ErrorSvg } from "$lib/anywhere.js";
import { NO_DATA } from "$lib/server/constants.js";
import { getBadgeStyle } from "$lib/global-constants.js";

export async function GET({ params, url }) {
  // @ts-ignore
  let monitors = await GetMonitors({ status: "ACTIVE" });
  if (monitors.length === 0) {
    return new Response(ErrorSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });
  }

  let name: string | undefined, tag, include_degraded_in_downtime;
  const siteName = await GetSiteDataByKey("siteName");

  const query = url.searchParams;
  const sinceLastParam = query.get("sinceLast");
  let sinceLast: number;
  if (sinceLastParam == undefined || isNaN(Number(sinceLastParam)) || Number(sinceLastParam) < 60) {
    sinceLast = 90 * 24 * 60 * 60;
  } else {
    sinceLast = Number(sinceLastParam);
  }
  const rangeInSeconds = sinceLast;
  const now = Math.floor(Date.now() / 1000);
  const since = GetMinuteStartNowTimestampUTC() - rangeInSeconds;

  const hideDuration = query.get("hideDuration") === "true";

  const duration = moment.duration(rangeInSeconds, "seconds");
  let formatted = "";
  if (duration.days() > 0 || duration.minutes() < 1) {
    formatted = `${Math.floor(rangeInSeconds / 86400)}d`;
  } else if (duration.hours() > 0) {
    formatted = `${duration.hours()}h`;
  } else if (duration.minutes() > 0) {
    formatted = `${duration.minutes()}m`;
  }

  let todayDataDb, anchorStatus;
  if (params.tag == "_") {
    name = typeof siteName === "string" ? siteName : undefined;
    let activeTags = monitors.map((monitor) => monitor.tag);
    //if anyone has include_degraded_in_downtime = "YES" then we will include degraded in downtime
    let hasIncludeDowntime = monitors.find((monitor) => monitor.include_degraded_in_downtime === "YES");
    include_degraded_in_downtime = hasIncludeDowntime ? "YES" : "NO";
    todayDataDb = await GetMonitoringDataAll(activeTags, since, now);
    anchorStatus = await GetLastStatusBeforeAll(activeTags, since);
  } else {
    const m = monitors.find((monitor) => monitor.tag === params.tag);
    if (!!!m) {
      return new Response(ErrorSvg, {
        headers: {
          "Content-Type": "image/svg+xml",
        },
      });
    }
    tag = m.tag;
    name = m.name;
    include_degraded_in_downtime = m.include_degraded_in_downtime;

    todayDataDb = await GetMonitoringData(tag, since, now);
    anchorStatus = await GetLastStatusBefore(tag, since);
  }
  todayDataDb = InterpolateData(
    todayDataDb.map((d) => ({ status: d.status || NO_DATA, timestamp: d.timestamp })),
    since,
    anchorStatus,
    now,
  );
  let calculatedData = AggregateData(todayDataDb);

  let numerator = calculatedData.UPs + calculatedData.DEGRADEDs;
  let denominator = calculatedData.total;
  if (include_degraded_in_downtime === "YES") {
    numerator = calculatedData.UPs;
  }

  let uptime = ParseUptime(numerator, denominator) + "%";
  let label: string = query.get("label") || name || "";
  const labelColor = query.get("labelColor") || "#333";
  const color = query.get("color") || "#0079FF";
  const style = getBadgeStyle(query.get("style"));

  label = label + (hideDuration ? "" : ` ${formatted}`);
  label = label.trim();

  const format = {
    label: label,
    message: uptime,
    color: color,
    labelColor: labelColor,
    style: style,
  };
  const svg = makeBadge(format);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  });
}

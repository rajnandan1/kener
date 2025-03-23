// @ts-nocheck

import {
  GetMonitors,
  GetIncidentsOpenHome,
  GetIncidentsPage,
  GetLocaleFromCookie,
} from "$lib/server/controllers/controller.js";
import { BeginningOfDay } from "$lib/server/tool.js";
import db from "$lib/server/db/db.js";
import { format, addDays, subDays, parse, getUnixTime, startOfMonth, endOfMonth } from "date-fns";
import { f } from "$lib/i18n/client";

export async function load({ parent, url, params, cookies }) {
  const parentData = await parent();
  const siteData = parentData.site;
  let monitors = await GetMonitors({ status: "ACTIVE" });
  const query = url.searchParams;
  let locale = GetLocaleFromCookie(parentData.site, cookies);
  let month = params.month; //January-2021

  if (!!!month) {
    month = format(new Date(), "MMMM-yyyy");
  }
  let monthStart = startOfMonth(parse(month, "MMMM-yyyy", new Date()));
  let monthEnd = endOfMonth(parse(month, "MMMM-yyyy", new Date()));
  let nextMonth = addDays(monthEnd, 1);
  let prevMonth = subDays(monthStart, 1);

  // let xx = parse(month, "MMMM-yyyy", new Date());

  let midnightMonthStartUTCTimestamp = getUnixTime(monthStart);
  let midnightMonthEndUTCTimestamp = getUnixTime(monthEnd);
  let midnightNextMonthUTCTimestamp = getUnixTime(nextMonth);
  let midnightPrevMonthUTCTimestamp = getUnixTime(prevMonth);

  let monthStartTs = BeginningOfDay({
    date: new Date(midnightMonthStartUTCTimestamp * 1000),
    timeZone: parentData.localTz,
  });

  let monthEndTs = BeginningOfDay({
    date: new Date(midnightMonthEndUTCTimestamp * 1000),
    timeZone: parentData.localTz,
  });

  let incidents = await GetIncidentsPage(monthStartTs, monthEndTs);

  incidents = incidents.map((incident) => {
    let incidentMonitors = incident.monitors;
    let monitorTags = incidentMonitors.map((monitor) => monitor.monitor_tag);
    let xm = monitors.filter((monitor) => monitorTags.includes(monitor.tag));

    incident.monitors = xm.map((monitor) => {
      return {
        tag: monitor.tag,
        name: monitor.name,
        description: monitor.description,
        image: monitor.image,
        impact_type: incidentMonitors.filter((m) => m.monitor_tag === monitor.tag)[0].monitor_impact,
      };
    });
    return incident;
  });

  return {
    incidents: incidents,
    nextMonthName: f(new Date(midnightNextMonthUTCTimestamp * 1000), "MMMM-yyyy", "en", parentData.localTz),
    prevMonthName: f(new Date(midnightPrevMonthUTCTimestamp * 1000), "MMMM-yyyy", "en", parentData.localTz),
    thisMonthName: f(monthEnd, "MMMM-yyyy", "en", parentData.localTz),
    canonical: siteData.siteURL + "/incidents/" + month,
    midnightNextMonthUTCTimestamp: midnightNextMonthUTCTimestamp,
    midnightPrevMonthUTCTimestamp: midnightPrevMonthUTCTimestamp,
    midnightMonthStartUTCTimestamp: midnightMonthStartUTCTimestamp + 86400,
  };
}

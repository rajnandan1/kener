// @ts-nocheck

import { GetMonitors, GetIncidentsPage, GetLocaleFromCookie } from "$lib/server/controllers/controller.js";
import { BeginningOfDay } from "$lib/server/tool.js";
import db from "$lib/server/db/db.js";
import { format, addDays, subDays, parse, getUnixTime, startOfMonth, endOfMonth, addMonths, getYear } from "date-fns";
import { f } from "$lib/i18n/client";
import { error } from "@sveltejs/kit";

const MIN_YEAR = 2023;

export async function load({ parent, url, params, cookies }) {
  const parentData = await parent();
  const siteData = parentData.site;
  let monitors = await GetMonitors({ status: "ACTIVE" });
  const query = url.searchParams;
  let locale = GetLocaleFromCookie(parentData.site, cookies);
  let month = params.month; //January-2021

  if (!!!month) {
    month = format(new Date(), "LLLL-yyyy");
  }

  let parsedDate;
  try {
    parsedDate = parse(month, "LLLL-yyyy", new Date());
    if (isNaN(parsedDate.getTime())) {
      throw error(404, "Invalid date format");
    }
  } catch (e) {
    throw error(404, "Invalid date format");
  }

  const year = getYear(parsedDate);
  const currentDate = new Date();
  const maxDate = addMonths(currentDate, 12);
  const maxYear = getYear(maxDate);

  if (year < MIN_YEAR || year > maxYear) {
    throw error(404, "Date out of allowed range");
  }

  if (year === maxYear && parsedDate > maxDate) {
    throw error(404, "Date out of allowed range");
  }
  let monthStart = startOfMonth(parse(month, "LLLL-yyyy", new Date()));
  let monthEnd = endOfMonth(parse(month, "LLLL-yyyy", new Date()));
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

  const prevMonthDate = subDays(monthStart, 1);
  const nextMonthDate = addDays(monthEnd, 1);

  const minDate = new Date(MIN_YEAR, 0, 1);

  const showPrevButton = prevMonthDate >= minDate;
  const showNextButton = nextMonthDate <= maxDate;

  return {
    incidents: incidents,
    nextMonthName: f(new Date(midnightNextMonthUTCTimestamp * 1000), "LLLL-yyyy", "en", parentData.localTz),
    prevMonthName: f(new Date(midnightPrevMonthUTCTimestamp * 1000), "LLLL-yyyy", "en", parentData.localTz),
    thisMonthName: f(monthEnd, "LLLL-yyyy", "en", parentData.localTz),
    canonical: siteData.siteURL + "/incidents/" + month,
    midnightNextMonthUTCTimestamp: midnightNextMonthUTCTimestamp,
    midnightPrevMonthUTCTimestamp: midnightPrevMonthUTCTimestamp,
    midnightMonthStartUTCTimestamp: midnightMonthStartUTCTimestamp + 86400,
    showPrevButton: showPrevButton,
    showNextButton: showNextButton,
  };
}

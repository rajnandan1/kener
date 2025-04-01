// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { GetMinuteStartNowTimestampUTC, BeginningOfDay, StatusObj, ParseUptime } from "$lib/server/tool.js";
import db from "$lib/server/db/db.js";
import {
  GetAllSiteData,
  GetIncidentsByIDS,
  InterpolateData,
  GetLastStatusBefore,
} from "$lib/server/controllers/controller.js";

export async function POST({ request }) {
  const payload = await request.json();
  const monitor = payload.monitor;
  const localTz = payload.localTz;
  const incidentIDs = payload.incidentIDs || [];
  let _0Day = {};

  const start = payload.startTs;
  let end = payload.endTs;

  for (let i = start; i < end; i += 60) {
    _0Day[i] = {
      timestamp: i,
      status: "NO_DATA",
      cssClass: StatusObj.NO_DATA,
      index: (i - start) / 60,
    };
  }

  let siteData = await GetAllSiteData();

  let dayData = await db.getMonitoringData(monitor.tag, start, end);

  let anchorStatus = await GetLastStatusBefore(monitor.tag, start);
  dayData = InterpolateData(dayData, start, anchorStatus, end);

  let aggregatedData = dayData.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    {
      UP: 0,
      DOWN: 0,
      DEGRADED: 0,
    },
  );

  let ups = Number(aggregatedData.UP);
  let downs = Number(aggregatedData.DOWN);
  let degradeds = Number(aggregatedData.DEGRADED);

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

  let total = ups + downs + degradeds;
  let uptime = ParseUptime(ups + degradeds, total);
  if (monitor.include_degraded_in_downtime === "YES") {
    uptime = ParseUptime(ups, total);
  }

  return json({ _0Day, uptime, incidents: await GetIncidentsByIDS(incidentIDs) });
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

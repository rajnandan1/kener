// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { GetMinuteStartNowTimestampUTC, BeginningOfDay, StatusObj, ParseUptime } from "$lib/server/tool.js";
import db from "$lib/server/db/db.js";
import { InterpolateData, GetLastStatusBefore } from "$lib/server/controllers/controller.js";

export async function POST({ request }) {
  const payload = await request.json();
  const monitor = payload.monitor;
  const start = payload.startTs;
  const end = payload.endTs;

  let rawData = await db.getMonitoringData(monitor.tag, start, end);
  let anchorStatus = await GetLastStatusBefore(monitor.tag, start);
  rawData = InterpolateData(rawData, start, anchorStatus, end);

  let aggregatedData = rawData.reduce(
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
  //covert all keys to uppercase
  let ups = Number(aggregatedData.UP);
  let downs = Number(aggregatedData.DOWN);
  let degradeds = Number(aggregatedData.DEGRADED);

  let total = ups + downs + degradeds;
  let uptime = ParseUptime(ups + degradeds, total);
  if (monitor.include_degraded_in_downtime === "YES") {
    uptime = ParseUptime(ups, total);
  }

  return json({ uptime });
}

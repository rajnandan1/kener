import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import db from "$lib/server/db/db";
import { GetLastStatusBefore, InterpolateData } from "$lib/server/controllers/monitorsController";
import {
  BeginningOfDay,
  GetMinuteStartNowTimestampUTC,
  GetMinuteStartTimestampUTC,
  ParseUptime,
  UptimeCalculator,
} from "$lib/server/tool";
import { NO_DATA } from "$lib/server/constants";
import GC from "$lib/global-constants";
import { GetMonitorsParsed } from "../../controllers/monitorsController";
import type { TimestampStatusCount } from "$lib/server/types/db";

interface DayDetailRequest {
  tag: string;
}

interface MinuteData {
  timestamp: number;
  status: string;
}

/**
 * POST /dashboard-apis/monitor-uptime
 * Returns minute-by-minute data for a specific day
 */
export default async function post(req: APIServerRequest): Promise<Response> {
  const body = req.body as DayDetailRequest;

  if (!body.tag) {
    return error(400, { message: "tag is required" });
  }

  const startOfDayTodayAtTz = req.body.startOfDayTodayAtTz
    ? parseInt(req.body.startOfDayTodayAtTz || "0", 10)
    : BeginningOfDay();

  const nowAtTz =
    GetMinuteStartTimestampUTC(
      req.body.nowAtTz ? parseInt(req.body.nowAtTz || "0", 10) : GetMinuteStartNowTimestampUTC(),
    ) + 60;

  const monitors = await GetMonitorsParsed({ tag: body.tag });
  if (!monitors || monitors.length === 0) {
    return error(404, { message: "Monitor not found" });
  }
  const monitor = monitors[0];

  // Get raw monitoring data for the day
  const rawData = await db.getMonitoringData(monitor.tag, startOfDayTodayAtTz, nowAtTz);
  const minuteData: MinuteData[] = [];
  let upCount = 0;
  let downCount = 0;
  let degradedCount = 0;
  let maintenanceCount = 0;

  // Create a map for quick lookup
  const dataMap = new Map<number, string>();
  for (const d of rawData) {
    dataMap.set(d.timestamp, d.status || NO_DATA);
  }

  for (let i = startOfDayTodayAtTz; i < nowAtTz; i += 60) {
    const status = dataMap.get(i) || NO_DATA;

    minuteData.push({
      timestamp: i,
      status: status,
    });

    if (status === GC.UP) upCount++;
    else if (status === GC.DOWN) downCount++;
    else if (status === GC.DEGRADED) degradedCount++;
    else if (status === GC.MAINTENANCE) maintenanceCount++;
  }

  const item: TimestampStatusCount = {
    ts: nowAtTz - 60,
    countOfUp: upCount,
    countOfDown: downCount,
    countOfDegraded: degradedCount,
    countOfMaintenance: maintenanceCount,
    avgLatency: 0,
  };

  const uptimeCalculationResult = UptimeCalculator(
    [item],
    monitor.monitor_settings_json?.uptime_formula_numerator,
    monitor.monitor_settings_json?.uptime_formula_denominator,
  );

  return json({
    minutes: minuteData,
    uptime: uptimeCalculationResult.uptime,
  });
}

import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import db from "$lib/server/db/db";
import { GetLatestMonitoringData, GetMonitorsParsed } from "$lib/server/controllers/monitorsController";
import { ParseUptime, GetMinuteStartNowTimestampUTC, UptimeCalculator } from "$lib/server/tool";
import { NO_DATA } from "$lib/server/constants";
import type { StatusType } from "$lib/global-constants";
import type { TimestampStatusCount } from "$lib/server/types/db";

const DEFAULT_DAYS = 90;
const MAX_DAYS = 90;

export interface BarData {
  status: StatusType;
  timestamp: number;
}

export interface MonitorBarResponse {
  name: string;
  description: string;
  image: string | null;
  currentStatus: StatusType;
  uptime: string;
  avgLatency: string;
  uptimeData: TimestampStatusCount[];
  fromTimeStamp: number;
  toTimeStamp: number;
}

/**
 * GET /dashboard-apis/monitor-bar?tag=xxx&days=90&endOfDayTodayAtTz=xxx
 * Returns monitor info, uptime data, and calculated uptime/avgLatency for the specified days
 */
export default async function get(req: APIServerRequest): Promise<Response> {
  const tag = req.query.get("tag");
  const daysStr = req.query.get("days");
  const days = Math.min(MAX_DAYS, Math.max(1, daysStr ? parseInt(daysStr, 10) : DEFAULT_DAYS));
  const endOfDayTodayAtTzStr = req.query.get("endOfDayTodayAtTz");
  const endOfDayTodayAtTz = endOfDayTodayAtTzStr ? parseInt(endOfDayTodayAtTzStr, 10) : GetMinuteStartNowTimestampUTC();
  const startTime = endOfDayTodayAtTz - days * 24 * 60 * 60;
  if (!tag) {
    return error(400, { message: "tag query parameter is required" });
  }

  const monitors = await GetMonitorsParsed({
    tag: tag,
  });
  if (!monitors || monitors.length === 0) {
    return error(404, { message: "Monitor not found" });
  }
  const monitor = monitors[0];
  const rawUptimeData = await db.getStatusCountsByInterval(monitor.tag, startTime, 86400, days);
  console.log(">>>>>>----  get:53 ", rawUptimeData[0]);
  //for days that are missing, add 0 counts
  const uptimeData: TimestampStatusCount[] = [];
  const uptimeDataMap = new Map(rawUptimeData.map((d) => [d.ts, d]));

  for (let i = 0; i < days; i++) {
    const ts = startTime + i * 86400;
    const data = uptimeDataMap.get(ts);
    if (!!data) {
      uptimeData.push(data);
    } else {
      uptimeData.push({
        ts,
        countOfUp: 0,
        countOfDown: 0,
        countOfDegraded: 0,
        countOfMaintenance: 0,
        avgLatency: 0,
      });
    }
  }

  // Fetch latest BAR_COUNT data points for the bars
  const barData = await db.getLatestMonitoringDataN(monitor.tag, 1);
  const dataPoints = barData.reverse();

  // Build bars from the data points
  const bars: BarData[] = dataPoints.map((d) => ({
    status: (d.status as StatusType) || NO_DATA,
    timestamp: d.timestamp,
  }));

  // Get current status
  const latestData = bars[bars.length - 1];
  const currentStatus: StatusType = (latestData?.status as StatusType) || NO_DATA;
  const uptimeCalculationResult = UptimeCalculator(
    rawUptimeData,
    monitor.monitor_settings_json?.uptime_formula_numerator,
    monitor.monitor_settings_json?.uptime_formula_denominator,
  );
  const response: MonitorBarResponse = {
    name: monitor.name,
    description: monitor.description || "",
    image: monitor.image || null,
    currentStatus,
    uptime: uptimeCalculationResult.uptime,
    avgLatency: uptimeCalculationResult.avgLatency,
    uptimeData,
    fromTimeStamp: startTime,
    toTimeStamp: endOfDayTodayAtTz - 1,
  };

  return json(response);
}

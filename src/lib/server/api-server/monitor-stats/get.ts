import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import db from "$lib/server/db/db";
import { GetLastStatusBefore, GetMonitorsParsed, InterpolateData } from "$lib/server/controllers/monitorsController";
import { ParseUptime, GetMinuteStartNowTimestampUTC, BeginningOfDay, UptimeCalculator } from "$lib/server/tool";
import { NO_DATA } from "$lib/server/constants";

/**
 * GET /dashboard-apis/monitor-stats?tag=xxx&days=90&localTz=xxx
 * Returns uptime and latency stats for a monitor over a given period
 */
export default async function get(req: APIServerRequest): Promise<Response> {
  const tag = req.query.get("tag");
  const days = parseInt(req.query.get("days") || "90", 10);
  const localTz = req.query.get("localTz") || "UTC";
  const startOfDayTimestamp = BeginningOfDay({ timeZone: localTz }) - (days - 1) * 86400;
  const timestampAgo = parseInt(req.query.get("timestampAgo") || String(startOfDayTimestamp), 10);

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

  const rawUptimeData = await db.getStatusCountsByInterval(monitor.tag, timestampAgo, days * 86400, 1);
  if (!rawUptimeData || rawUptimeData.length === 0) {
    return error(404, { message: "Data not found" });
  }

  const statData = rawUptimeData[0];
  const uptimeCalculationResult = UptimeCalculator(
    rawUptimeData,
    monitor.monitor_settings_json?.uptime_formula_numerator,
    monitor.monitor_settings_json?.uptime_formula_denominator,
  );
  return json({
    uptime: uptimeCalculationResult.uptime,
    avgLatency: uptimeCalculationResult.avgLatency,
  });
}

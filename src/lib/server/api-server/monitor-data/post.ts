import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import type { MonitorTableRow, MonitorTableUptime } from "$lib/types/common";
import db from "$lib/server/db/db";
import { ParseUptime } from "$lib/server/tool";
import { CalculateUptimeByTags, GetLatestMonitoringData } from "$lib/server/controllers/monitorsController";
import { NO_DATA } from "$lib/server/constants";

interface MonitorDataRequest {
  monitor_tags: string[];
  now_ts: number;
}

const UPTIME_RANGES = [
  { label: "24h", seconds: 24 * 60 * 60 },
  { label: "7d", seconds: 7 * 24 * 60 * 60 },
  { label: "30d", seconds: 30 * 24 * 60 * 60 },
  { label: "90d", seconds: 90 * 24 * 60 * 60 },
];

export default async function post(req: APIServerRequest): Promise<Response> {
  const body = req.body as MonitorDataRequest;

  if (!body.monitor_tags || !Array.isArray(body.monitor_tags) || body.monitor_tags.length === 0) {
    return error(400, { message: "monitor_tags is required and must be a non-empty array" });
  }

  if (!body.now_ts || typeof body.now_ts !== "number") {
    return error(400, { message: "now_ts is required and must be a number" });
  }

  const monitors = await db.getMonitorsByTags(body.monitor_tags);
  const now = body.now_ts;

  const results: MonitorTableRow[] = await Promise.all(
    monitors.map(async (monitor) => {
      // Get latest status and latency
      const latestData = await GetLatestMonitoringData(monitor.tag);
      const status = latestData?.status || NO_DATA;
      const responseTime = latestData?.latency ? `${latestData.latency}ms` : "-";

      // Calculate uptimes for each range
      const uptimes: MonitorTableUptime[] = await Promise.all(
        UPTIME_RANGES.map(async (range) => {
          const start = now - range.seconds;
          const uptimeValue = await CalculateUptimeByTags([monitor.tag], start, now);
          return {
            range: range.label,
            percentage: ParseUptime(Math.round(uptimeValue * 100), 10000),
          };
        }),
      );

      return {
        name: monitor.name,
        status,
        responseTime,
        uptimes,
      };
    }),
  );

  return json(results);
}

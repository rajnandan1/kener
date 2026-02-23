import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import db from "$lib/server/db/db";
import { GetMinuteStartNowTimestampUTC } from "$lib/server/tool";
import type { StatusType } from "$lib/global-constants";
import GC from "$lib/global-constants";
import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
import { buildMonitorBarResponseFromRawData } from "$lib/server/api-server/monitor-bar/shared";
import {
  GetLatestMonitoringDataAllActive,
  GetStatusCountsByIntervalGroupedByMonitor,
} from "$lib/server/controllers/monitorsController";
import type { TimestampStatusCount, TimestampStatusCountByMonitor } from "$lib/server/types/db";

const DEFAULT_DAYS = 90;
const MAX_DAYS = 90;
const MAX_TAGS = 100;

interface MonitorBarsResponse {
  data: Record<string, MonitorBarResponse>;
  missingTags: string[];
}

/**
 * GET /dashboard-apis/monitor-bars?tags=tag1,tag2&days=90&endOfDayTodayAtTz=xxx
 * Returns monitor-bar payloads for multiple tags in one request.
 */
export default async function get(req: APIServerRequest): Promise<Response> {
  const tagsStr = req.query.get("tags");
  const daysStr = req.query.get("days");
  const days = Math.min(MAX_DAYS, Math.max(1, daysStr ? parseInt(daysStr, 10) : DEFAULT_DAYS));
  const endOfDayTodayAtTzStr = req.query.get("endOfDayTodayAtTz");
  const endOfDayTodayAtTz = endOfDayTodayAtTzStr ? parseInt(endOfDayTodayAtTzStr, 10) : GetMinuteStartNowTimestampUTC();

  if (!tagsStr) {
    return error(400, { message: "tags query parameter is required" });
  }

  const tags = Array.from(
    new Set(
      tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );

  if (tags.length === 0) {
    return error(400, { message: "At least one tag is required" });
  }

  if (tags.length > MAX_TAGS) {
    return error(400, { message: `Maximum ${MAX_TAGS} tags are allowed` });
  }

  const startTime = endOfDayTodayAtTz - days * 24 * 60 * 60;

  const [monitors, latestDataAll, aggregatedData] = await Promise.all([
    db.getMonitorsByTags(tags),
    GetLatestMonitoringDataAllActive(tags),
    GetStatusCountsByIntervalGroupedByMonitor(tags, startTime, 86400, days),
  ]);

  const latestStatusByTag = new Map<string, StatusType>(
    latestDataAll.map((d) => [d.monitor_tag, (d.status as StatusType) || GC.NO_DATA]),
  );

  const monitorByTag = new Map(monitors.map((m) => [m.tag, m]));
  const existingTags = new Set(monitors.map((m) => m.tag));
  const missingTags = tags.filter((t) => !existingTags.has(t));

  const aggregatedByTag = new Map<string, TimestampStatusCount[]>();
  for (const row of aggregatedData as TimestampStatusCountByMonitor[]) {
    const arr = aggregatedByTag.get(row.monitor_tag) || [];
    arr.push({
      ts: row.ts,
      countOfUp: row.countOfUp,
      countOfDown: row.countOfDown,
      countOfDegraded: row.countOfDegraded,
      countOfMaintenance: row.countOfMaintenance,
      avgLatency: row.avgLatency,
      maxLatency: row.maxLatency,
      minLatency: row.minLatency,
    });
    aggregatedByTag.set(row.monitor_tag, arr);
  }

  const responseData: Record<string, MonitorBarResponse> = {};
  const monitorResults = await Promise.all(
    tags
      .filter((tag) => existingTags.has(tag))
      .map(async (tag) => {
        const monitor = monitorByTag.get(tag);
        if (!monitor) return null;
        const payload = buildMonitorBarResponseFromRawData(
          monitor,
          aggregatedByTag.get(tag) || [],
          days,
          endOfDayTodayAtTz,
          latestStatusByTag.get(tag) || GC.NO_DATA,
        );
        return { tag, payload };
      }),
  );

  for (const result of monitorResults) {
    if (result) {
      responseData[result.tag] = result.payload;
    }
  }

  const response: MonitorBarsResponse = {
    data: responseData,
    missingTags,
  };

  return json(response);
}

import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import db from "$lib/server/db/db";
import { GetMinuteStartNowTimestampUTC } from "$lib/server/tool";

/**
 * Time range definitions with aggregation intervals
 * Designed to keep data points under 100 for performance
 */
interface TimeRange {
  label: string;
  value: string;
  minutes: number; // Total minutes in the range
  avgInterval: number; // Minutes to average together
}

const TIME_RANGES: TimeRange[] = [
  { label: "Last Hour", value: "1h", minutes: 60, avgInterval: 1 }, // 60 points
  { label: "Last 3 Hours", value: "3h", minutes: 180, avgInterval: 5 }, // 36 points
  { label: "Last 6 Hours", value: "6h", minutes: 360, avgInterval: 10 }, // 36 points
  { label: "Last 12 Hours", value: "12h", minutes: 720, avgInterval: 15 }, // 48 points
  { label: "Last 24 Hours", value: "24h", minutes: 1440, avgInterval: 30 }, // 48 points
  { label: "Last 48 Hours", value: "48h", minutes: 2880, avgInterval: 60 }, // 48 points
  { label: "Last 7 Days", value: "7d", minutes: 10080, avgInterval: 180 }, // 56 points (3-hour avg)
  { label: "Last 14 Days", value: "14d", minutes: 20160, avgInterval: 360 }, // 56 points (6-hour avg)
  { label: "Last 30 Days", value: "30d", minutes: 43200, avgInterval: 720 }, // 60 points (12-hour avg)
];

/**
 * GET /dashboard-apis/monitor-latency-chart?tag=xxx&range=24h&localTz=xxx
 * Returns aggregated latency data for chart visualization
 */
export default async function get(req: APIServerRequest): Promise<Response> {
  const tag = req.query.get("tag");
  const range = req.query.get("range") || "24h";
  const localTz = req.query.get("localTz") || "UTC";

  if (!tag) {
    return error(400, { message: "tag query parameter is required" });
  }

  const monitor = await db.getMonitorByTag(tag);
  if (!monitor) {
    return error(404, { message: "Monitor not found" });
  }

  // Find the time range config
  const rangeConfig = TIME_RANGES.find((r) => r.value === range);
  if (!rangeConfig) {
    return error(400, { message: "Invalid range parameter" });
  }

  const now = GetMinuteStartNowTimestampUTC();
  const startTimestamp = now - rangeConfig.minutes * 60;

  // Fetch raw monitoring data
  const rawData = await db.getMonitoringData(monitor.tag, startTimestamp, now);

  // Aggregate data by intervals
  const aggregatedData: {
    timestamp: number;
    avgLatency: number | null;
    minLatency: number | null;
    maxLatency: number | null;
  }[] = [];
  const intervalSeconds = rangeConfig.avgInterval * 60;

  // Create time buckets
  let bucketStart = startTimestamp;
  while (bucketStart < now) {
    const bucketEnd = bucketStart + intervalSeconds;

    // Find all data points in this bucket
    const bucketData = rawData.filter((d) => d.timestamp >= bucketStart && d.timestamp < bucketEnd);

    // Calculate aggregates for latency
    const validLatencies = bucketData
      .filter((d) => d.latency !== null && d.latency !== undefined && d.latency > 0)
      .map((d) => d.latency as number);

    let avgLatency: number | null = null;
    let minLatency: number | null = null;
    let maxLatency: number | null = null;

    if (validLatencies.length > 0) {
      avgLatency = Math.round(validLatencies.reduce((sum, l) => sum + l, 0) / validLatencies.length);
      minLatency = Math.min(...validLatencies);
      maxLatency = Math.max(...validLatencies);
    }

    aggregatedData.push({
      timestamp: bucketStart + Math.floor(intervalSeconds / 2), // Use middle of bucket as timestamp
      avgLatency,
      minLatency,
      maxLatency,
    });

    bucketStart = bucketEnd;
  }

  return json({
    data: aggregatedData,
    range: rangeConfig.value,
    rangeLabel: rangeConfig.label,
    avgInterval: rangeConfig.avgInterval,
    periodStart: startTimestamp,
    periodEnd: now,
  });
}

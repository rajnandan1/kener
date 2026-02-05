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
import GC from "$lib/global-constants";
import { GetMonitorsParsed } from "../../controllers/monitorsController";
import type { TimestampStatusCount } from "$lib/server/types/db";
import { ParseLatency } from "$lib/clientTools";

interface DayDetailRequest {
  tag: string;
}

interface MinuteData {
  timestamp: number;
  latency: number;
}

/**
 * Largest-Triangle-Three-Buckets (LTTB) downsampling algorithm
 * Reduces data points while preserving visual characteristics (peaks, valleys, trends)
 * https://skemman.is/bitstream/1946/15343/3/SS_MSthesis.pdf
 */
function lttbDownsample(data: MinuteData[], targetPoints: number): MinuteData[] {
  if (data.length <= targetPoints || targetPoints < 3) {
    return data;
  }

  const sampled: MinuteData[] = [];
  const bucketSize = (data.length - 2) / (targetPoints - 2);

  // Always keep first point
  sampled.push(data[0]);

  let prevSelectedIndex = 0;

  for (let i = 0; i < targetPoints - 2; i++) {
    // Calculate bucket boundaries
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length - 1);

    // Calculate average point of next bucket (for triangle calculation)
    const nextBucketStart = bucketEnd;
    const nextBucketEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, data.length);

    let avgX = 0;
    let avgY = 0;
    let avgCount = 0;

    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      avgX += data[j].timestamp;
      avgY += data[j].latency;
      avgCount++;
    }

    if (avgCount > 0) {
      avgX /= avgCount;
      avgY /= avgCount;
    } else {
      // Use last point if no next bucket
      avgX = data[data.length - 1].timestamp;
      avgY = data[data.length - 1].latency;
    }

    // Find point in current bucket that creates largest triangle
    const prevPoint = data[prevSelectedIndex];
    let maxArea = -1;
    let maxAreaIndex = bucketStart;

    for (let j = bucketStart; j < bucketEnd; j++) {
      const currentPoint = data[j];

      // Calculate triangle area using cross product
      // Area = 0.5 * |x1(y2-y3) + x2(y3-y1) + x3(y1-y2)|
      const area = Math.abs(
        (prevPoint.timestamp - avgX) * (currentPoint.latency - prevPoint.latency) -
          (prevPoint.timestamp - currentPoint.timestamp) * (avgY - prevPoint.latency),
      );

      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    sampled.push(data[maxAreaIndex]);
    prevSelectedIndex = maxAreaIndex;
  }

  // Always keep last point
  sampled.push(data[data.length - 1]);

  return sampled;
}

/**
 * POST /dashboard-apis/monitor-day-latency
 * Returns downsampled minute-by-minute latency data for a specific day
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
  let totalLatencySum = 0;
  let totalCount = 0;
  let maxLatency = 0;
  let minLatency = Infinity;

  // Filter to only points with valid latency and calculate stats
  const validData: MinuteData[] = [];
  for (const d of rawData) {
    const currentLatency = d.latency || 0;
    if (currentLatency > 0) {
      validData.push({
        timestamp: d.timestamp,
        latency: currentLatency,
      });
      totalLatencySum += currentLatency;
      totalCount++;
      if (currentLatency > maxLatency) {
        maxLatency = currentLatency;
      }
      if (currentLatency < minLatency) {
        minLatency = currentLatency;
      }
    }
  }

  // Handle case where no valid latency data exists
  if (minLatency === Infinity) {
    minLatency = 0;
  }

  // Downsample using LTTB algorithm - target ~100 points for smooth chart
  const targetPoints = Math.min(100, validData.length);
  const minuteData = lttbDownsample(validData, targetPoints);

  console.log("Start", startOfDayTodayAtTz, "End", nowAtTz);
  console.log(
    "Raw data points:",
    rawData.length,
    "Valid points:",
    validData.length,
    "Downsampled to:",
    minuteData.length,
  );

  return json({
    minutes: minuteData,
    avgLatency: ParseLatency(totalCount > 0 ? totalLatencySum / totalCount : 0),
    maxLatency: ParseLatency(maxLatency),
    minLatency: ParseLatency(minLatency),
  });
}

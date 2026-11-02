import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  GetMonitoringDataResponse,
  MonitoringDataPoint,
  UpdateMonitoringDataRangeRequest,
  UpdateMonitoringDataRangeResponse,
  BadRequestResponse,
} from "$lib/types/api";
import GC from "$lib/global-constants";
import { UpdateMonitoringData } from "$lib/server/controllers/monitorsController";
import { GetMinuteStartTimestampUTC } from "$lib/server/tool";
import { readRequestBody } from "$lib/server/requestBody";

export const GET: RequestHandler = async ({ locals, url }) => {
  // Monitor is validated by middleware and available in locals
  const monitor = locals.monitor!;
  const monitorTag = monitor.tag;

  // Parse query params for timestamp range
  const startTsParam = url.searchParams.get("start_ts");
  const endTsParam = url.searchParams.get("end_ts");

  if (!startTsParam || !endTsParam) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Both start_ts and end_ts query parameters are required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const startTs = GetMinuteStartTimestampUTC(parseInt(startTsParam, 10));
  const endTs = GetMinuteStartTimestampUTC(parseInt(endTsParam, 10));

  if (isNaN(startTs) || isNaN(endTs)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "start_ts and end_ts must be valid integers (UTC timestamps in seconds)",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (startTs >= endTs) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "start_ts must be less than end_ts",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const rawData = await db.getMonitoringData(monitorTag, startTs, endTs);

  const data: MonitoringDataPoint[] = rawData.map((d) => ({
    monitor_tag: d.monitor_tag,
    timestamp: d.timestamp,
    status: d.status,
    latency: d.latency,
    type: d.type,
  }));

  const response: GetMonitoringDataResponse = {
    data,
  };

  return json(response);
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
  // Monitor is validated by middleware and available in locals
  const monitor = locals.monitor!;
  const monitorTag = monitor.tag;

  const body = await readRequestBody<UpdateMonitoringDataRangeRequest>(
    request,
    "PATCH /api/v4/monitors/{monitor_tag}/data",
  );
  if (body instanceof Response) return body;

  if (body.start_ts >= body.end_ts) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "start_ts must be less than end_ts",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (body.latency < 0) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "latency is required and must be a non-negative number",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const deviation = body.deviation ?? 0;
  if (deviation < 0) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "deviation must be a non-negative number",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  await UpdateMonitoringData({
    monitor_tag: monitorTag,
    start: body.start_ts,
    end: body.end_ts,
    newStatus: body.status,
    type: GC.MANUAL,
    latency: body.latency,
    deviation: deviation,
  });

  // Calculate the number of data points that will be returned by GET
  // GET uses: timestamp >= start_ts AND timestamp < end_ts
  // Data is stored at minute-aligned timestamps
  const firstMinuteInRange = Math.ceil(body.start_ts / 60) * 60;
  const lastMinuteInRange = Math.floor((body.end_ts - 1) / 60) * 60;
  const updatedCount =
    firstMinuteInRange <= lastMinuteInRange ? Math.floor((lastMinuteInRange - firstMinuteInRange) / 60) + 1 : 0;

  const response: UpdateMonitoringDataRangeResponse = {
    message: "Monitoring data updated successfully",
    updated_count: updatedCount,
  };

  return json(response);
};

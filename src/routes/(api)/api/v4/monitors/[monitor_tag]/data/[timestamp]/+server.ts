import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  GetMonitoringDataPointResponse,
  UpdateMonitoringDataPointRequest,
  UpdateMonitoringDataPointResponse,
  NotFoundResponse,
  BadRequestResponse,
} from "$lib/types/api";
import GC from "$lib/global-constants";
import { GetMinuteStartTimestampUTC } from "$lib/server/tool";
import { SetLastMonitoringValue } from "$lib/server/cache/setGet";
import { NotifySubscribersOnStatusChange } from "$lib/server/controllers/monitorsController";
import alertingQueue from "$lib/server/queues/alertingQueue";

export const GET: RequestHandler = async ({ params, locals }) => {
  // Monitor is validated by middleware and available in locals
  const monitor = locals.monitor!;
  const monitorTag = monitor.tag;
  const timestampParam = params.timestamp as string;

  if (!timestampParam) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Timestamp is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const timestamp = GetMinuteStartTimestampUTC(parseInt(timestampParam, 10));
  if (isNaN(timestamp)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Timestamp must be a valid integer (UTC timestamp in seconds)",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const data = await db.getMonitoringDataAt(monitorTag, timestamp);

  if (!data) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `No monitoring data found for monitor '${monitorTag}' at timestamp ${timestamp}`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  const response: GetMonitoringDataPointResponse = {
    data: {
      monitor_tag: data.monitor_tag,
      timestamp: data.timestamp,
      status: data.status,
      latency: data.latency,
      type: data.type,
    },
  };

  return json(response);
};

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
  // Monitor is validated by middleware and available in locals
  const monitor = locals.monitor!;
  const monitorTag = monitor.tag;
  const timestampParam = params.timestamp as string;

  if (!timestampParam) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Timestamp is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const timestamp = GetMinuteStartTimestampUTC(parseInt(timestampParam, 10));
  if (isNaN(timestamp)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Timestamp must be a valid integer (UTC timestamp in seconds)",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  let body: UpdateMonitoringDataPointRequest;

  try {
    body = await request.json();
  } catch {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Invalid JSON body",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Get existing data if it exists
  const existingData = await db.getMonitoringDataAt(monitorTag, timestamp);

  // Determine values - use provided values or fall back to existing/defaults
  let status: string;
  let latency: number;

  if (body.status !== undefined) {
    if (![GC.UP, GC.DOWN, GC.DEGRADED].includes(body.status)) {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "status must be one of: UP, DOWN, DEGRADED",
        },
      };
      return json(errorResponse, { status: 400 });
    }
    status = body.status;
  } else if (existingData?.status) {
    status = existingData.status;
  } else {
    status = monitor.default_status || GC.UP;
  }

  if (body.latency !== undefined) {
    if (typeof body.latency !== "number" || body.latency < 0) {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "latency must be a non-negative number",
        },
      };
      return json(errorResponse, { status: 400 });
    }
    latency = body.latency;
  } else if (existingData?.latency !== null && existingData?.latency !== undefined) {
    latency = existingData.latency;
  } else {
    latency = 0;
  }

  // Get old status before insert (for status change detection)
  const oldLatest = await db.getLatestMonitoringData(monitorTag);
  const oldStatus = oldLatest?.status ?? undefined;

  // Insert or update the data point
  await db.insertMonitoringData({
    monitor_tag: monitorTag,
    timestamp: timestamp,
    status: status,
    latency: latency,
    type: GC.MANUAL,
  });

  // Update the cache so group monitors (and other cache consumers) see the latest status
  const latestData = await db.getLatestMonitoringData(monitorTag);
  if (latestData) {
    await SetLastMonitoringValue(monitorTag, latestData);
  }

  // Notify subscribers if status changed
  if (oldStatus && oldStatus !== status) {
    NotifySubscribersOnStatusChange(monitorTag, status, oldStatus).catch((err) =>
      console.error("Failed to notify subscribers of status change:", err),
    );
  }

  // MANUAL samples are alert-visible (docs/adr/0005), so re-evaluate alerts for this
  // sample — for NONE monitors nothing else would ever trigger evaluation.
  // Best-effort: the row is already committed; a queue outage must not fail the request.
  try {
    await alertingQueue.push(monitorTag, timestamp, status);
  } catch (err) {
    console.error(`Failed to enqueue alert evaluation for ${monitorTag} after MANUAL data write:`, err);
  }

  // Fetch the updated data
  const updatedData = await db.getMonitoringDataAt(monitorTag, timestamp);

  const response: UpdateMonitoringDataPointResponse = {
    data: {
      monitor_tag: monitorTag,
      timestamp: timestamp,
      status: updatedData?.status ?? status,
      latency: updatedData?.latency ?? latency,
      type: updatedData?.type ?? GC.MANUAL,
    },
  };

  return json(response);
};

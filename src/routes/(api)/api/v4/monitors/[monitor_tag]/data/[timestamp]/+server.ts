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
import { UpdateMonitoringData } from "$lib/server/controllers/monitorsController";
import { readRequestBody } from "$lib/server/requestBody";

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

  const body = await readRequestBody<UpdateMonitoringDataPointRequest>(
    request,
    "PATCH /api/v4/monitors/{monitor_tag}/data/{timestamp}",
  );
  if (body instanceof Response) return body;

  // Get existing data if it exists
  const existingData = await db.getMonitoringDataAt(monitorTag, timestamp);

  // Determine values - use provided values or fall back to existing/defaults
  let status: string;
  let latency: number;

  if (body.status !== undefined) {
    status = body.status;
  } else if (existingData?.status) {
    status = existingData.status;
  } else {
    status = monitor.default_status || GC.UP;
  }

  if (body.latency !== undefined) {
    if (body.latency < 0) {
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

  await UpdateMonitoringData({
    monitor_tag: monitorTag,
    start: timestamp,
    end: timestamp,
    newStatus: status,
    type: GC.MANUAL,
    latency: latency,
  });

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

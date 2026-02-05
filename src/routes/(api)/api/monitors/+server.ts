import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  GetMonitorsListResponse,
  MonitorResponse,
  CreateMonitorRequest,
  CreateMonitorResponse,
  BadRequestResponse,
} from "$lib/types/api";
import type { MonitorRecord } from "$lib/server/types/db";
import { GetMonitorsParsed } from "../../../../lib/server/controllers/monitorsController";

function formatDateToISO(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString();
  }
  // Handle string dates (e.g., from SQLite: "2026-01-27 16:07:19")
  const parsed = new Date(date.replace(" ", "T") + "Z");
  return parsed.toISOString();
}

export const GET: RequestHandler = async ({ url }) => {
  const status = url.searchParams.get("status") || undefined;
  const category_name = url.searchParams.get("category_name") || undefined;
  const monitor_type = url.searchParams.get("monitor_type") || undefined;
  const is_hidden = url.searchParams.get("is_hidden") || undefined;

  const rawMonitors = await GetMonitorsParsed({
    status,
    category_name,
    monitor_type,
    is_hidden,
  });

  const response: GetMonitorsListResponse = {
    monitors: rawMonitors,
  };

  return json(response);
};

export const POST: RequestHandler = async ({ request }) => {
  let body: CreateMonitorRequest;

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

  // Validate required fields
  if (!body.tag || typeof body.tag !== "string" || body.tag.trim().length === 0) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Tag is required and must be a non-empty string",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Name is required and must be a non-empty string",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Check if monitor with this tag already exists
  const existingMonitor = await db.getMonitorByTag(body.tag);
  if (existingMonitor) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: `Monitor with tag '${body.tag}' already exists`,
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Prepare monitor data for insertion
  const monitorData = {
    tag: body.tag.trim(),
    name: body.name.trim(),
    description: body.description ?? null,
    image: body.image ?? null,
    cron: body.cron ?? null,
    default_status: body.default_status ?? "UP",
    status: body.status ?? "ACTIVE",
    category_name: body.category_name ?? null,
    monitor_type: body.monitor_type ?? "API",
    type_data: body.type_data ? JSON.stringify(body.type_data) : null,
    include_degraded_in_downtime: body.include_degraded_in_downtime ?? "NO",
    is_hidden: body.is_hidden ?? "NO",
    monitor_settings_json: body.monitor_settings_json ? JSON.stringify(body.monitor_settings_json) : null,
  };

  await db.insertMonitor(monitorData);

  // Fetch the created monitor
  const createdMonitor = await GetMonitorsParsed({ tag: body.tag }).then((monitors) =>
    monitors.length > 0 ? monitors[0] : null,
  );

  if (!createdMonitor) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create monitor",
      },
    };
    return json(errorResponse, { status: 500 });
  }

  const response: CreateMonitorResponse = {
    monitor: createdMonitor,
  };

  return json(response, { status: 201 });
};

import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  GetMaintenancesListResponse,
  MaintenanceResponse,
  CreateMaintenanceRequest,
  CreateMaintenanceResponse,
  BadRequestResponse,
  MaintenanceMonitor,
} from "$lib/types/api";
import { GetMinuteStartTimestampUTC, parseDbTimestamp } from "$lib/server/tool";
import {
  CreateMaintenance,
  GenerateMaintenanceEvents,
  isOneTimeRrule,
} from "$lib/server/controllers/maintenanceController";
import { GetSiteURL } from "$lib/server/controllers/siteDataController";
import serverResolver from "$lib/server/resolver";
import { rrulestr } from "rrule";
import { readRequestBody } from "$lib/server/requestBody";

function isValidRrule(rrule: string): boolean {
  try {
    // Test parsing by creating a full rrule string with a dummy DTSTART
    const dtstart = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const fullRrule = `DTSTART:${dtstart}\nRRULE:${rrule}`;
    rrulestr(fullRrule);
    return true;
  } catch {
    return false;
  }
}

export const GET: RequestHandler = async ({ url }) => {
  // Parse query params for filtering
  const statusParam = url.searchParams.get("status");
  const monitorTagParam = url.searchParams.get("monitor_tag");

  // Build filter
  const filter: { status?: "ACTIVE" | "INACTIVE" } = {};
  if (statusParam && (statusParam === "ACTIVE" || statusParam === "INACTIVE")) {
    filter.status = statusParam;
  }

  // Get maintenances
  let rawMaintenances = await db.getAllMaintenances(filter);

  // If filtering by monitor_tag, filter to only maintenances that include that monitor
  if (monitorTagParam) {
    const filteredMaintenances = [];
    for (const maintenance of rawMaintenances) {
      const monitors = await db.getMaintenanceMonitors(maintenance.id);
      const hasMonitor = monitors.some((m) => m.monitor_tag === monitorTagParam);
      if (hasMonitor) {
        filteredMaintenances.push(maintenance);
      }
    }
    rawMaintenances = filteredMaintenances;
  }

  // Build response with monitors for each maintenance
  const siteUrl = await GetSiteURL();
  const maintenances: MaintenanceResponse[] = [];
  for (const maintenance of rawMaintenances) {
    const monitors = await db.getMaintenanceMonitors(maintenance.id);
    maintenances.push({
      id: maintenance.id,
      title: maintenance.title,
      description: maintenance.description,
      start_date_time: maintenance.start_date_time,
      rrule: maintenance.rrule,
      duration_seconds: maintenance.duration_seconds,
      status: maintenance.status as "ACTIVE" | "INACTIVE",
      monitors: monitors.map((m) => ({
        monitor_tag: m.monitor_tag,
        impact: m.monitor_impact as "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE",
      })),
      created_at: parseDbTimestamp(maintenance.created_at).toISOString(),
      updated_at: parseDbTimestamp(maintenance.updated_at).toISOString(),
      url: siteUrl + serverResolver(`/maintenances/${maintenance.id}?type=maintenance`),
    });
  }

  const response: GetMaintenancesListResponse = {
    maintenances,
  };

  return json(response);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await readRequestBody<CreateMaintenanceRequest>(request, "POST /api/v4/maintenances");
  if (body instanceof Response) return body;

  // Validate required fields
  if (body.title.trim().length === 0) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "title is required and must be a non-empty string",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (body.rrule.trim().length === 0) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "rrule is required and must be a non-empty string",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Validate rrule format
  if (!isValidRrule(body.rrule)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "rrule is not a valid iCalendar RRULE string",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (body.duration_seconds <= 0) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "duration_seconds must be a positive number",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Validate monitors if provided
  if (body.monitors !== undefined) {
    for (const monitor of body.monitors) {
      if (!monitor.monitor_tag) {
        const errorResponse: BadRequestResponse = {
          error: {
            code: "BAD_REQUEST",
            message: "Each monitor must have a valid monitor_tag",
          },
        };
        return json(errorResponse, { status: 400 });
      }

      // Verify monitor exists
      const existingMonitor = await db.getMonitorByTag(monitor.monitor_tag);
      if (!existingMonitor) {
        const errorResponse: BadRequestResponse = {
          error: {
            code: "BAD_REQUEST",
            message: `Monitor with tag '${monitor.monitor_tag}' not found`,
          },
        };
        return json(errorResponse, { status: 400 });
      }
    }
  }

  // Normalize timestamp to minute start
  const normalizedStartDateTime = GetMinuteStartTimestampUTC(body.start_date_time);

  // Create the maintenance
  const result = await CreateMaintenance({
    title: body.title.trim(),
    description: body.description || null,
    start_date_time: normalizedStartDateTime,
    rrule: body.rrule.trim(),
    duration_seconds: body.duration_seconds,
    monitors: body.monitors?.map((m) => ({
      monitor_tag: m.monitor_tag,
      monitor_impact: m.impact || "MAINTENANCE",
    })),
  });

  // Fetch the created maintenance to return
  const maintenance = await db.getMaintenanceById(result.maintenance_id);
  if (!maintenance) {
    return json({ error: { code: "INTERNAL_ERROR", message: "Failed to create maintenance" } }, { status: 500 });
  }

  const monitors = await db.getMaintenanceMonitors(maintenance.id);

  const maintenanceResponse: MaintenanceResponse = {
    id: maintenance.id,
    title: maintenance.title,
    description: maintenance.description,
    start_date_time: maintenance.start_date_time,
    rrule: maintenance.rrule,
    duration_seconds: maintenance.duration_seconds,
    status: maintenance.status as "ACTIVE" | "INACTIVE",
    monitors: monitors.map((m) => ({
      monitor_tag: m.monitor_tag,
      impact: m.monitor_impact as "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE",
    })),
    created_at: parseDbTimestamp(maintenance.created_at).toISOString(),
    updated_at: parseDbTimestamp(maintenance.updated_at).toISOString(),
    url: (await GetSiteURL()) + serverResolver(`/maintenances/${maintenance.id}?type=maintenance`),
  };

  const response: CreateMaintenanceResponse = {
    maintenance: maintenanceResponse,
  };

  return json(response, { status: 201 });
};

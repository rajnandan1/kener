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
import { GetMinuteStartTimestampUTC } from "$lib/server/tool";
import {
  CreateMaintenance,
  GenerateMaintenanceEvents,
  isOneTimeRrule,
} from "$lib/server/controllers/maintenanceController";
import { rrulestr } from "rrule";

function formatDateToISO(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString();
  }
  // Handle string dates (e.g., from SQLite: "2026-01-27 16:07:19")
  const parsed = new Date(date.replace(" ", "T") + "Z");
  return parsed.toISOString();
}

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

const VALID_IMPACTS = ["UP", "DOWN", "DEGRADED", "MAINTENANCE"];

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
      created_at: formatDateToISO(maintenance.created_at),
      updated_at: formatDateToISO(maintenance.updated_at),
    });
  }

  const response: GetMaintenancesListResponse = {
    maintenances,
  };

  return json(response);
};

export const POST: RequestHandler = async ({ request }) => {
  let body: CreateMaintenanceRequest;

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
  if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "title is required and must be a non-empty string",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (body.start_date_time === undefined || body.start_date_time === null) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "start_date_time is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (typeof body.start_date_time !== "number" || isNaN(body.start_date_time)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "start_date_time must be a valid timestamp (UTC seconds)",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (!body.rrule || typeof body.rrule !== "string" || body.rrule.trim().length === 0) {
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

  if (body.duration_seconds === undefined || body.duration_seconds === null) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "duration_seconds is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (typeof body.duration_seconds !== "number" || body.duration_seconds <= 0) {
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
    if (!Array.isArray(body.monitors)) {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "monitors must be an array",
        },
      };
      return json(errorResponse, { status: 400 });
    }

    for (const monitor of body.monitors) {
      if (!monitor.monitor_tag || typeof monitor.monitor_tag !== "string") {
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

      // Validate impact if provided
      if (monitor.impact && !VALID_IMPACTS.includes(monitor.impact)) {
        const errorResponse: BadRequestResponse = {
          error: {
            code: "BAD_REQUEST",
            message: `Invalid impact '${monitor.impact}'. Must be one of: ${VALID_IMPACTS.join(", ")}`,
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
    created_at: formatDateToISO(maintenance.created_at),
    updated_at: formatDateToISO(maintenance.updated_at),
  };

  const response: CreateMaintenanceResponse = {
    maintenance: maintenanceResponse,
  };

  return json(response, { status: 201 });
};

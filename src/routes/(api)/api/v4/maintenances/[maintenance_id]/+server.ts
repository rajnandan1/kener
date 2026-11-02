import { json, type RequestHandler } from "@sveltejs/kit";
import { parseDbTimestamp } from "$lib/server/tool";
import db from "$lib/server/db/db";
import type {
  GetMaintenanceResponse,
  UpdateMaintenanceRequest,
  UpdateMaintenanceResponse,
  MaintenanceResponse,
  BadRequestResponse,
  DeleteMaintenanceResponse,
} from "$lib/types/api";
import { GetMinuteStartTimestampUTC } from "$lib/server/tool";
import {
  DeleteMaintenance,
  UpdateMaintenance,
  type UpdateMaintenanceInput,
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

async function buildMaintenanceResponse(maintenanceId: number): Promise<MaintenanceResponse | null> {
  const maintenance = await db.getMaintenanceById(maintenanceId);
  if (!maintenance) return null;

  const monitors = await db.getMaintenanceMonitors(maintenanceId);

  return {
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
}

export const GET: RequestHandler = async ({ locals }) => {
  // Maintenance is validated by middleware and available in locals
  const maintenance = locals.maintenance!;

  const maintenanceResponse = await buildMaintenanceResponse(maintenance.id);

  if (!maintenanceResponse) {
    return json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to build maintenance response" } },
      { status: 500 },
    );
  }

  const response: GetMaintenanceResponse = {
    maintenance: maintenanceResponse,
  };

  return json(response);
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
  // Maintenance is validated by middleware and available in locals
  const existingMaintenance = locals.maintenance!;

  const body = await readRequestBody<UpdateMaintenanceRequest>(request, "PATCH /api/v4/maintenances/{maintenance_id}");
  if (body instanceof Response) return body;

  // Validate rrule if provided
  if (body.rrule !== undefined) {
    if (body.rrule.trim().length === 0) {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "rrule must be a non-empty string",
        },
      };
      return json(errorResponse, { status: 400 });
    }

    if (!isValidRrule(body.rrule)) {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "rrule is not a valid iCalendar RRULE string",
        },
      };
      return json(errorResponse, { status: 400 });
    }
  }

  // Validate duration_seconds if provided
  if (body.duration_seconds !== undefined) {
    if (body.duration_seconds <= 0) {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "duration_seconds must be a positive number",
        },
      };
      return json(errorResponse, { status: 400 });
    }
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

  const updateData: UpdateMaintenanceInput = {};
  if (body.title !== undefined) {
    updateData.title = body.title.trim();
  }
  if (body.description !== undefined) {
    updateData.description = body.description;
  }
  if (body.start_date_time !== undefined) {
    updateData.start_date_time = GetMinuteStartTimestampUTC(body.start_date_time);
  }
  if (body.rrule !== undefined) {
    updateData.rrule = body.rrule.trim();
  }
  if (body.duration_seconds !== undefined) {
    updateData.duration_seconds = body.duration_seconds;
  }
  if (body.status !== undefined) {
    updateData.status = body.status;
  }
  if (body.monitors !== undefined) {
    updateData.monitors = body.monitors.map((m) => ({
      monitor_tag: m.monitor_tag,
      monitor_impact: m.impact || "MAINTENANCE",
    }));
  }

  await UpdateMaintenance(existingMaintenance.id, updateData);

  // Build and return the updated maintenance
  const maintenanceResponse = await buildMaintenanceResponse(existingMaintenance.id);

  if (!maintenanceResponse) {
    return json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to build maintenance response" } },
      { status: 500 },
    );
  }

  const response: UpdateMaintenanceResponse = {
    maintenance: maintenanceResponse,
  };

  return json(response);
};

export const DELETE: RequestHandler = async ({ locals }) => {
  // Maintenance is validated by middleware and available in locals
  const maintenance = locals.maintenance!;

  await DeleteMaintenance(maintenance.id);

  const response: DeleteMaintenanceResponse = {
    message: `Maintenance with id '${maintenance.id}' deleted successfully`,
  };

  return json(response);
};

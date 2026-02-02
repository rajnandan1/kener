import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  GetIncidentResponse,
  UpdateIncidentRequest,
  UpdateIncidentResponse,
  DeleteIncidentResponse,
  IncidentDetailResponse,
  BadRequestResponse,
} from "$lib/types/api";
import { GetMinuteStartTimestampUTC } from "$lib/server/tool";

function formatDateToISO(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString();
  }
  // Handle string dates (e.g., from SQLite: "2026-01-27 16:07:19")
  const parsed = new Date(date.replace(" ", "T") + "Z");
  return parsed.toISOString();
}

async function buildIncidentResponse(incidentId: number): Promise<IncidentDetailResponse | null> {
  const incident = await db.getIncidentById(incidentId);
  if (!incident) return null;

  const monitors = await db.getIncidentMonitorsByIncidentID(incidentId);

  // Get full incident record for incident_source
  const fullIncident = await db.getIncidentsPaginated(1, 1, { id: incidentId });
  const incidentSource = fullIncident.length > 0 ? fullIncident[0].incident_source : "MANUAL";

  return {
    id: incident.id,
    title: incident.title,
    start_date_time: incident.start_date_time,
    end_date_time: incident.end_date_time,
    state: incident.state,
    incident_type: incident.incident_type,
    incident_source: incidentSource,
    monitors: monitors.map((m) => ({
      monitor_tag: m.monitor_tag,
      impact: m.monitor_impact || "DOWN",
    })),
    created_at: formatDateToISO(incident.created_at),
    updated_at: formatDateToISO(incident.updated_at),
  };
}

export const GET: RequestHandler = async ({ locals }) => {
  // Incident is validated by middleware and available in locals
  const incident = locals.incident!;

  const incidentResponse = await buildIncidentResponse(incident.id);

  if (!incidentResponse) {
    return json({ error: { code: "INTERNAL_ERROR", message: "Failed to build incident response" } }, { status: 500 });
  }

  const response: GetIncidentResponse = {
    incident: incidentResponse,
  };

  return json(response);
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
  // Incident is validated by middleware and available in locals
  const existingIncident = locals.incident!;

  let body: UpdateIncidentRequest;

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
    }
  }

  // Build update data - only include fields that are present in the request
  const updateData = {
    id: existingIncident.id,
    title: body.title !== undefined ? body.title : existingIncident.title,
    start_date_time:
      body.start_date_time !== undefined
        ? GetMinuteStartTimestampUTC(body.start_date_time)
        : existingIncident.start_date_time,
    end_date_time:
      body.end_date_time !== undefined
        ? body.end_date_time !== null
          ? GetMinuteStartTimestampUTC(body.end_date_time)
          : null
        : existingIncident.end_date_time,
    status: existingIncident.status,
    state: existingIncident.state,
    // These fields are required by IncidentRecord but not used by updateIncident
    created_at: existingIncident.created_at,
    updated_at: existingIncident.updated_at,
    incident_type: existingIncident.incident_type,
    incident_source: "", // Not used by updateIncident
  };

  // Update the incident
  await db.updateIncident(updateData);

  // Handle monitors update if provided
  if (body.monitors !== undefined) {
    // Get current monitors
    const currentMonitors = await db.getIncidentMonitorsByIncidentID(existingIncident.id);

    // If empty array, remove all monitors
    if (body.monitors.length === 0) {
      for (const monitor of currentMonitors) {
        await db.removeIncidentMonitor(existingIncident.id, monitor.monitor_tag);
      }
    } else {
      // Remove monitors that are not in the new list
      const newMonitorTags = body.monitors.map((m) => m.monitor_tag);
      for (const currentMonitor of currentMonitors) {
        if (!newMonitorTags.includes(currentMonitor.monitor_tag)) {
          await db.removeIncidentMonitor(existingIncident.id, currentMonitor.monitor_tag);
        }
      }

      // Add or update monitors from the new list
      for (const monitor of body.monitors) {
        await db.insertIncidentMonitorWithMerge({
          incident_id: existingIncident.id,
          monitor_tag: monitor.monitor_tag,
          monitor_impact: monitor.impact || "DOWN",
        });
      }
    }
  }

  // Fetch updated incident for response
  const incidentResponse = await buildIncidentResponse(existingIncident.id);

  if (!incidentResponse) {
    return json({ error: { code: "INTERNAL_ERROR", message: "Failed to build incident response" } }, { status: 500 });
  }

  const response: UpdateIncidentResponse = {
    incident: incidentResponse,
  };

  return json(response);
};

export const DELETE: RequestHandler = async ({ locals }) => {
  // Incident is validated by middleware and available in locals
  const incident = locals.incident!;

  // Delete incident monitors
  const monitors = await db.getIncidentMonitorsByIncidentID(incident.id);
  for (const monitor of monitors) {
    await db.removeIncidentMonitor(incident.id, monitor.monitor_tag);
  }

  // Delete incident comments (hard delete by setting status to DELETED)
  const comments = await db.getIncidentComments(incident.id);
  for (const comment of comments) {
    await db.updateIncidentCommentStatusByID(comment.id, "DELETED");
  }

  // Actually delete the incident from the database
  await db.deleteIncident(incident.id);

  const response: DeleteIncidentResponse = {
    message: `Incident with id '${incident.id}' deleted successfully`,
  };

  return json(response);
};

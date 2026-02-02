import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  GetIncidentsListResponse,
  IncidentResponse,
  CreateIncidentRequest,
  CreateIncidentResponse,
  IncidentDetailResponse,
  BadRequestResponse,
} from "$lib/types/api";
import GC from "$lib/global-constants";
import { GetMinuteStartTimestampUTC } from "$lib/server/tool";

function formatDateToISO(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString();
  }
  // Handle string dates (e.g., from SQLite: "2026-01-27 16:07:19")
  const parsed = new Date(date.replace(" ", "T") + "Z");
  return parsed.toISOString();
}

export const GET: RequestHandler = async ({ url }) => {
  // Parse query params for filtering
  const startTsParam = url.searchParams.get("start_ts");
  const endTsParam = url.searchParams.get("end_ts");
  const monitorTagsParam = url.searchParams.get("monitor_tags");

  const startTs = startTsParam ? parseInt(startTsParam, 10) : undefined;
  const endTs = endTsParam ? parseInt(endTsParam, 10) : undefined;
  const monitorTags = monitorTagsParam ? monitorTagsParam.split(",").map((t) => t.trim()) : undefined;

  // Build filter for incidents query
  const filter: { start?: number; end?: number } = {};
  if (startTs && !isNaN(startTs)) {
    filter.start = startTs;
  }
  if (endTs && !isNaN(endTs)) {
    filter.end = endTs;
  }

  // Get incidents with pagination (use large limit for API)
  let rawIncidents = await db.getIncidentsPaginated(1, 1000, filter.start || filter.end ? filter : null);

  // If filtering by monitor tags, we need to filter the results
  if (monitorTags && monitorTags.length > 0) {
    const filteredIncidents = [];
    for (const incident of rawIncidents) {
      const monitors = await db.getIncidentMonitorsByIncidentID(incident.id);
      const hasMatchingMonitor = monitors.some((m) => monitorTags.includes(m.monitor_tag));
      if (hasMatchingMonitor) {
        filteredIncidents.push(incident);
      }
    }
    rawIncidents = filteredIncidents;
  }

  // Build response with monitors for each incident
  const incidents: IncidentResponse[] = [];
  for (const incident of rawIncidents) {
    const monitors = await db.getIncidentMonitorsByIncidentID(incident.id);
    incidents.push({
      id: incident.id,
      title: incident.title,
      start_date_time: incident.start_date_time,
      end_date_time: incident.end_date_time,
      state: incident.state,
      incident_source: incident.incident_source,
      monitors: monitors.map((m) => ({
        monitor_tag: m.monitor_tag,
        impact: m.monitor_impact || "DOWN",
      })),
      created_at: formatDateToISO(incident.created_at),
      updated_at: formatDateToISO(incident.updated_at),
    });
  }

  const response: GetIncidentsListResponse = {
    incidents,
  };

  return json(response);
};

export const POST: RequestHandler = async ({ request }) => {
  let body: CreateIncidentRequest;

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
        message: "Title is required and must be a non-empty string",
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

  // Create incident
  const incidentData = {
    title: body.title.trim(),
    start_date_time: GetMinuteStartTimestampUTC(body.start_date_time),
    end_date_time: body.end_date_time ? GetMinuteStartTimestampUTC(body.end_date_time) : null,
    status: "OPEN",
    state: GC.INVESTIGATING,
    incident_type: GC.INCIDENT,
    incident_source: "API",
  };

  const createdIncident = await db.createIncident(incidentData);

  // Add monitors if provided
  if (body.monitors && body.monitors.length > 0) {
    for (const monitor of body.monitors) {
      await db.insertIncidentMonitor({
        incident_id: createdIncident.id,
        monitor_tag: monitor.monitor_tag,
        monitor_impact: monitor.impact || "DOWN",
      });
    }
  }

  // Fetch monitors for response
  const monitors = await db.getIncidentMonitorsByIncidentID(createdIncident.id);

  const response: CreateIncidentResponse = {
    incident: {
      id: createdIncident.id,
      title: createdIncident.title,
      start_date_time: createdIncident.start_date_time,
      end_date_time: createdIncident.end_date_time,
      state: createdIncident.state,
      status: createdIncident.status,
      incident_type: createdIncident.incident_type,
      incident_source: createdIncident.incident_source,
      monitors: monitors.map((m) => ({
        monitor_tag: m.monitor_tag,
        impact: m.monitor_impact || "DOWN",
      })),
      created_at: formatDateToISO(createdIncident.created_at),
      updated_at: formatDateToISO(createdIncident.updated_at),
    },
  };

  return json(response, { status: 201 });
};

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
import { GetMinuteStartTimestampUTC, parseDbTimestamp } from "$lib/server/tool";
import { GetSiteURL } from "$lib/server/controllers/siteDataController";
import { AddIncidentMonitor, CreateIncident } from "$lib/server/controllers/incidentController";
import serverResolver from "$lib/server/resolver";

const VALID_IMPACTS: string[] = [GC.DOWN, GC.DEGRADED, GC.MAINTENANCE];

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
  const siteUrl = await GetSiteURL();
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
      created_at: parseDbTimestamp(incident.created_at).toISOString(),
      updated_at: parseDbTimestamp(incident.updated_at).toISOString(),
      url: siteUrl + serverResolver(`/incidents/${incident.id}`),
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

  let incidentId: number;
  try {
    ({ incident_id: incidentId } = await CreateIncident({
      title: body.title.trim(),
      start_date_time: GetMinuteStartTimestampUTC(body.start_date_time),
      end_date_time: body.end_date_time ? GetMinuteStartTimestampUTC(body.end_date_time) : null,
      status: "OPEN",
      state: GC.INVESTIGATING,
      incident_type: GC.INCIDENT,
      incident_source: "API",
    }));
  } catch (err) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "Failed to create incident",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  for (const monitor of body.monitors ?? []) {
    await AddIncidentMonitor(incidentId, monitor.monitor_tag, monitor.impact || "DOWN");
  }

  const [createdIncident] = await db.getIncidentsPaginated(1, 1, { id: incidentId });

  // Fetch monitors for response
  const monitors = await db.getIncidentMonitorsByIncidentID(createdIncident.id);

  const response: CreateIncidentResponse = {
    incident: {
      id: createdIncident.id,
      title: createdIncident.title,
      start_date_time: createdIncident.start_date_time,
      end_date_time: createdIncident.end_date_time,
      state: createdIncident.state,
      incident_type: createdIncident.incident_type,
      incident_source: createdIncident.incident_source,
      monitors: monitors.map((m) => ({
        monitor_tag: m.monitor_tag,
        impact: m.monitor_impact || "DOWN",
      })),
      created_at: parseDbTimestamp(createdIncident.created_at).toISOString(),
      updated_at: parseDbTimestamp(createdIncident.updated_at).toISOString(),
      url: (await GetSiteURL()) + serverResolver(`/incidents/${createdIncident.id}`),
    },
  };

  return json(response, { status: 201 });
};

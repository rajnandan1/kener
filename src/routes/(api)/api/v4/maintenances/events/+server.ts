import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  GetMaintenanceEventsDetailListResponse,
  MaintenanceEventDetailResponse,
  MaintenanceMonitor,
} from "$lib/types/api";
import { GetNowTimestampUTC, GetMinuteStartTimestampUTC } from "$lib/server/tool";

const VALID_EVENT_STATUSES = ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED", "READY"];

export const GET: RequestHandler = async ({ url }) => {
  // Parse query params
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  const monitorsParam = url.searchParams.get("monitors"); // comma-separated monitor tags
  const eventStatusParam = url.searchParams.get("event_status");
  const eventStartDateTimeParam = url.searchParams.get("event_start_date_time");
  const maintenanceIdParam = url.searchParams.get("maintenance_id");

  // Pagination
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20)) : 20;

  // Determine start timestamp for filtering
  // If not provided, use current timestamp; otherwise normalize to minute start
  let startFromTimestamp: number;
  if (eventStartDateTimeParam) {
    const parsed = parseInt(eventStartDateTimeParam, 10);
    if (!isNaN(parsed)) {
      startFromTimestamp = GetMinuteStartTimestampUTC(parsed);
    } else {
      startFromTimestamp = GetNowTimestampUTC();
    }
  } else {
    startFromTimestamp = GetNowTimestampUTC();
  }

  // Parse monitors filter
  const monitorTags = monitorsParam
    ? monitorsParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;

  // Parse event status filter
  let eventStatus: string | undefined;
  if (eventStatusParam && VALID_EVENT_STATUSES.includes(eventStatusParam.toUpperCase())) {
    eventStatus = eventStatusParam.toUpperCase();
  }

  // Parse maintenance_id filter
  let maintenanceId: number | undefined;
  if (maintenanceIdParam) {
    const parsed = parseInt(maintenanceIdParam, 10);
    if (!isNaN(parsed)) {
      maintenanceId = parsed;
    }
  }

  // Query using repository method
  const { events: rawEvents, total } = await db.getMaintenanceEventsWithDetails({
    startFromTimestamp,
    page,
    limit,
    monitorTags,
    eventStatus,
    maintenanceId,
  });

  // For each event, get the monitors for that maintenance
  const events: MaintenanceEventDetailResponse[] = [];
  for (const event of rawEvents) {
    const monitors = await db.getMaintenanceMonitors(event.maintenance_id);
    const monitorList: MaintenanceMonitor[] = monitors.map((m) => ({
      monitor_tag: m.monitor_tag,
      impact: m.monitor_impact as "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE",
    }));

    events.push({
      maintenance_id: event.maintenance_id,
      event_id: event.event_id,
      event_start_date_time: event.event_start_date_time,
      event_end_date_time: event.event_end_date_time,
      event_status: event.event_status as "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED",
      maintenance_title: event.maintenance_title,
      maintenance_description: event.maintenance_description,
      maintenance_status: event.maintenance_status as "ACTIVE" | "INACTIVE",
      maintenance_rrule: event.maintenance_rrule,
      maintenance_duration_seconds: event.maintenance_duration_seconds,
      monitors: monitorList,
    });
  }

  const response: GetMaintenanceEventsDetailListResponse = {
    events,
    page,
    limit,
    total,
  };

  return json(response);
};

import { json, type RequestHandler } from "@sveltejs/kit";
import { parseDbTimestamp } from "$lib/server/tool";
import db from "$lib/server/db/db";
import type { GetMaintenanceEventsListResponse, MaintenanceEventResponse } from "$lib/types/api";
import { GetSiteURL } from "$lib/server/controllers/siteDataController";
import serverResolver from "$lib/server/resolver";

export const GET: RequestHandler = async ({ locals, url }) => {
  // Maintenance is validated by middleware and available in locals
  const maintenance = locals.maintenance!;

  // Parse pagination params
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");

  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20)) : 20;

  // Get all events for this maintenance
  const allEvents = await db.getMaintenanceEventsByMaintenanceId(maintenance.id);

  // Calculate pagination
  const total = allEvents.length;
  const offset = (page - 1) * limit;
  const paginatedEvents = allEvents.slice(offset, offset + limit);

  // Build response
  const siteUrl = await GetSiteURL();
  const events: MaintenanceEventResponse[] = paginatedEvents.map((event) => ({
    id: event.id,
    maintenance_id: event.maintenance_id,
    start_date_time: event.start_date_time,
    end_date_time: event.end_date_time,
    status: event.status as MaintenanceEventResponse["status"],
    created_at: parseDbTimestamp(event.created_at).toISOString(),
    updated_at: parseDbTimestamp(event.updated_at).toISOString(),
    url: siteUrl + serverResolver(`/maintenances/${event.id}`),
  }));

  const response: GetMaintenanceEventsListResponse = {
    events,
    page,
    limit,
  };

  return json(response);
};

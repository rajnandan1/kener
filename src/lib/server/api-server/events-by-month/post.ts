import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import type { IncidentForMonitorListWithComments, MaintenanceEventsMonitorList } from "$lib/server/types/db";
import db from "$lib/server/db/db";
import { GetAllSiteData } from "$lib/server/controllers/siteDataController";

interface EventsByMonthRequest {
  start_ts: number;
  end_ts: number;
}

export interface EventsByMonthResponse {
  incidents: IncidentForMonitorListWithComments[];
  maintenances: MaintenanceEventsMonitorList[];
}

export default async function post(req: APIServerRequest): Promise<Response> {
  const body = req.body as EventsByMonthRequest;
  const queryParams = req.query;
  const rawPagePath = queryParams.get("page_path");
  let pagePath = rawPagePath?.trim() || null;

  if (pagePath && ["undefined", "null"].includes(pagePath.toLowerCase())) {
    pagePath = null;
  }

  if (!body.start_ts || typeof body.start_ts !== "number") {
    return error(400, { message: "start_ts is required and must be a number" });
  }

  if (!body.end_ts || typeof body.end_ts !== "number") {
    return error(400, { message: "end_ts is required and must be a number" });
  }

  // get site data
  const siteData = await GetAllSiteData();
  const { globalPageVisibilitySettings } = siteData;
  const isExclusivePageEnabled = !!globalPageVisibilitySettings?.forceExclusivity;

  if (isExclusivePageEnabled && !pagePath) {
    pagePath = "";
  }

  let pathMonitors: string[] | undefined = undefined;
  if (pagePath !== null) {
    const pageData = await db.getPageByPath(pagePath);
    if (!pageData) {
      return error(404, { message: "Page not found" });
    }
    const monitorsForPage = await db.getPageMonitorsExcludeHidden(pageData.id);
    pathMonitors = monitorsForPage.map((m) => m.monitor_tag);
  }

  const [incidents, maintenances] = await Promise.all([
    db.getIncidentsForEventsByDateRange(body.start_ts, body.end_ts, pathMonitors),
    db.getMaintenanceEventsForEventsByDateRange(body.start_ts, body.end_ts, pathMonitors),
  ]);

  const response: EventsByMonthResponse = {
    incidents,
    maintenances,
  };

  return json(response);
}

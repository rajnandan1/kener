import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import type { IncidentForMonitorListWithComments, MaintenanceEventsMonitorList } from "$lib/server/types/db";
import db from "$lib/server/db/db";

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

  if (!body.start_ts || typeof body.start_ts !== "number") {
    return error(400, { message: "start_ts is required and must be a number" });
  }

  if (!body.end_ts || typeof body.end_ts !== "number") {
    return error(400, { message: "end_ts is required and must be a number" });
  }

  const [incidents, maintenances] = await Promise.all([
    db.getIncidentsForEventsByDateRange(body.start_ts, body.end_ts),
    db.getMaintenanceEventsForEventsByDateRange(body.start_ts, body.end_ts),
  ]);

  const response: EventsByMonthResponse = {
    incidents,
    maintenances,
  };

  return json(response);
}

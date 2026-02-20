import { json } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import type { NotificationPayload } from "$lib/server/controllers/dashboardController";
import {
  GetOngoingIncidentsForMonitorList,
  GetResolvedIncidentsForMonitorList,
  GetOngoingMaintenanceEventsForMonitorList,
  GetPastMaintenanceEventsForMonitorList,
  GetUpcomingMaintenanceEventsForMonitorList,
  BuildNotificationPayload,
} from "$lib/server/controllers/dashboardController";
import { GetMinuteStartNowTimestampUTC } from "$lib/server/tool";

/**
 * GET /dashboard-apis/notifications?tags=tag1,tag2
 * Returns NotificationPayload for the given monitor tags.
 * If no tags are provided, returns only global (is_global=YES) incidents/maintenances.
 */
export default async function get(req: APIServerRequest): Promise<Response> {
  const tagsParam = req.query.get("tags");
  const monitorTags: string[] = tagsParam ? tagsParam.split(",").filter(Boolean) : [];
  const nowTs = GetMinuteStartNowTimestampUTC();

  const [ongoingIncidents, resolvedIncidents, ongoingMaintenances, pastMaintenances, upcomingMaintenances] =
    await Promise.all([
      GetOngoingIncidentsForMonitorList(monitorTags),
      GetResolvedIncidentsForMonitorList(monitorTags),
      GetOngoingMaintenanceEventsForMonitorList(monitorTags),
      GetPastMaintenanceEventsForMonitorList(monitorTags),
      GetUpcomingMaintenanceEventsForMonitorList(monitorTags),
    ]);

  const payload: NotificationPayload = BuildNotificationPayload(
    ongoingIncidents,
    ongoingMaintenances,
    resolvedIncidents,
    upcomingMaintenances,
    pastMaintenances,
    nowTs,
  );

  return json(payload);
}

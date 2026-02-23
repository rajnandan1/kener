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
import { GetSiteDataByKey } from "$lib/server/controllers/siteDataController";
import type { EventDisplaySettings } from "$lib/types/site";
import seedSiteData from "$lib/server/db/seedSiteData";

/**
 * GET /dashboard-apis/notifications?tags=tag1,tag2
 * Returns NotificationPayload for the given monitor tags.
 * If no tags are provided, returns only global (is_global=YES) incidents/maintenances.
 */
export default async function get(req: APIServerRequest): Promise<Response> {
  const tagsParam = req.query.get("tags");
  const monitorTags: string[] = tagsParam ? tagsParam.split(",").filter(Boolean) : [];
  const nowTs = GetMinuteStartNowTimestampUTC();
  //get event display setting from site data
  let eventDisplaySetting = (await GetSiteDataByKey("eventDisplaySettings")) as EventDisplaySettings | null;
  if (!eventDisplaySetting) {
    eventDisplaySetting = seedSiteData.eventDisplaySettings;
  }
  const [ongoingIncidents, resolvedIncidents, ongoingMaintenances, pastMaintenances, upcomingMaintenances] =
    await Promise.all([
      eventDisplaySetting.incidents.enabled && eventDisplaySetting.incidents.ongoing.show
        ? GetOngoingIncidentsForMonitorList(monitorTags)
        : Promise.resolve([]),
      eventDisplaySetting.incidents.enabled && eventDisplaySetting.incidents.resolved.show
        ? GetResolvedIncidentsForMonitorList(
            monitorTags,
            eventDisplaySetting.incidents.resolved.maxCount,
            eventDisplaySetting.incidents.resolved.daysInPast,
          )
        : Promise.resolve([]),
      eventDisplaySetting.maintenances.enabled && eventDisplaySetting.maintenances.ongoing.show
        ? GetOngoingMaintenanceEventsForMonitorList(monitorTags)
        : Promise.resolve([]),
      eventDisplaySetting.maintenances.enabled && eventDisplaySetting.maintenances.past.show
        ? GetPastMaintenanceEventsForMonitorList(
            monitorTags,
            eventDisplaySetting.maintenances.past.maxCount,
            eventDisplaySetting.maintenances.past.daysInPast,
          )
        : Promise.resolve([]),
      eventDisplaySetting.maintenances.enabled && eventDisplaySetting.maintenances.upcoming.show
        ? GetUpcomingMaintenanceEventsForMonitorList(
            monitorTags,
            eventDisplaySetting.maintenances.upcoming.maxCount,
            eventDisplaySetting.maintenances.upcoming.daysInFuture,
          )
        : Promise.resolve([]),
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

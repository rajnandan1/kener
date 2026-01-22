import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import {
  GetOngoingIncidentsForMonitorList,
  GetResolvedIncidentsForMonitorList,
  GetOngoingMaintenanceEventsForMonitorList,
  GetPastMaintenanceEventsForMonitorList,
  GetUpcomingMaintenanceEventsForMonitorList,
} from "$lib/server/controllers/dashboardController.js";
import type { TimestampStatusCount } from "$lib/server/types/db";
import { GetNowTimestampUTC, UptimeCalculator } from "$lib/server/tool";
import GC from "$lib/global-constants.js";
import { GetStatusColor, GetStatusSummary, ParseLatency } from "$lib/clientTools";

export const load: PageServerLoad = async ({ params }) => {
  const { monitor_tag } = params;

  // Validate monitor exists
  const monitor = await db.getMonitorByTag(monitor_tag);
  if (!monitor) {
    throw error(404, { message: "Monitor not found" });
  }

  // Check if monitor is hidden
  if (monitor.is_hidden === "YES") {
    throw error(404, { message: "Monitor not found" });
  }

  const monitorTags = [monitor_tag];

  const [ongoingIncidents, resolvedIncidents, ongoingMaintenances, pastMaintenances, upcomingMaintenances] =
    await Promise.all([
      GetOngoingIncidentsForMonitorList(monitorTags),
      GetResolvedIncidentsForMonitorList(monitorTags),
      GetOngoingMaintenanceEventsForMonitorList(monitorTags),
      GetPastMaintenanceEventsForMonitorList(monitorTags),
      GetUpcomingMaintenanceEventsForMonitorList(monitorTags),
    ]);

  //last known status
  const lastStatus = await db.getLatestMonitoringData(monitor.tag);
  //use uptime calculator tool to parse
  let item: TimestampStatusCount = {
    ts: lastStatus ? lastStatus.timestamp : GetNowTimestampUTC(),
    countOfUp: lastStatus && lastStatus.status === GC.UP ? 1 : 0,
    countOfDown: lastStatus && lastStatus.status === GC.DOWN ? 1 : 0,
    countOfDegraded: lastStatus && lastStatus.status === GC.DEGRADED ? 1 : 0,
    countOfMaintenance: lastStatus && lastStatus.status === GC.MAINTENANCE ? 1 : 0,
    avgLatency: lastStatus && lastStatus.latency ? lastStatus.latency : 0,
  };

  //get status summary

  return {
    monitorTag: monitor_tag,
    monitorName: monitor.name,
    monitorImage: monitor.image,
    monitorDescription: monitor.description,
    monitorId: monitor.id,
    monitorLastStatus: GetStatusSummary(item),
    textClass: GetStatusColor(item),
    monitorLastStatusTimestamp: item.ts,
    monitorLastLatency: ParseLatency(item.avgLatency),
    ongoingIncidents,
    resolvedIncidents,
    ongoingMaintenances,
    pastMaintenances,
    upcomingMaintenances,
  };
};

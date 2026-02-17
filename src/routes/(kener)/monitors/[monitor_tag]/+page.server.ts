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
import { GetMonitorsParsed } from "$lib/server/controllers/monitorsController";
import type { GroupMonitorTypeData } from "$lib/server/types/monitor";

export const load: PageServerLoad = async ({ params, parent }) => {
  const { monitor_tag } = params;
  const parentData = await parent();
  // Validate monitor exists
  const monitors = await GetMonitorsParsed({ tag: monitor_tag, status: "ACTIVE", is_hidden: "NO" });
  if (!monitors || monitors.length === 0) {
    throw error(404, { message: "Monitor not found" });
  }
  const monitor = monitors[0];
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
    maxLatency: lastStatus && lastStatus.latency ? lastStatus.latency : 0,
    minLatency: lastStatus && lastStatus.latency ? lastStatus.latency : 0,
  };

  //get status summary
  let extendedTags: string[] = [];
  let monitorGroupMembersByTag: Record<string, string[]> = {};
  if (monitor.monitor_type === "GROUP") {
    const groupData = monitor.type_data as GroupMonitorTypeData;
    const memberTags = groupData.monitors.map((m) => m.tag);
    extendedTags = extendedTags.concat(memberTags);
  }

  if (extendedTags.length > 0) {
    const parsedExtendedMonitors = await GetMonitorsParsed({ tags: extendedTags, status: "ACTIVE", is_hidden: "NO" });
    for (const parsedMonitor of parsedExtendedMonitors) {
      if (parsedMonitor.monitor_type !== "GROUP") continue;

      const groupData = parsedMonitor.type_data as GroupMonitorTypeData;
      if (!groupData?.monitors || !Array.isArray(groupData.monitors)) continue;

      monitorGroupMembersByTag[parsedMonitor.tag] = groupData.monitors.map((member) => member.tag);
    }
  }

  let maxDays = parentData.isMobile ? 30 : 90;
  if (monitor.monitor_settings_json?.monitor_status_history_days) {
    maxDays = parentData.isMobile
      ? monitor.monitor_settings_json.monitor_status_history_days.mobile || 30
      : monitor.monitor_settings_json.monitor_status_history_days.desktop || 90;
  }
  return {
    ...{
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
      externalUrl: monitor.external_url,
      extendedTags,
      monitorGroupMembersByTag,
      maxDays,
      monitorSharingOptions: {
        showShareBadgeMonitor: monitor.monitor_settings_json?.sharing_options?.showShareBadgeMonitor ?? true,
        showShareEmbedMonitor: monitor.monitor_settings_json?.sharing_options?.showShareEmbedMonitor ?? true,
      },
    },
  };
};

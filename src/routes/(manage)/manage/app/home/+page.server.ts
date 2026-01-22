import type { PageServerLoad } from "./$types";
import db from "$lib/server/db/db.js";
import { GetNowTimestampUTC } from "$lib/server/tool.js";

export const load: PageServerLoad = async () => {
  const now = GetNowTimestampUTC();

  // Get all monitors
  const monitors = await db.getMonitors({});
  const monitorsCount = monitors.length;

  // Get latest status for all active monitors
  const activeMonitorTags = monitors.filter((m) => m.status === "ACTIVE").map((m) => m.tag);
  const latestStatuses =
    activeMonitorTags.length > 0 ? await db.getLatestMonitoringDataAllActive(activeMonitorTags) : [];

  // Create a map of monitor_tag -> current status
  const statusMap = new Map(latestStatuses.map((s) => [s.monitor_tag, s.status]));

  // Combine monitors with their current status
  const monitorsWithStatus = monitors.map((m) => ({
    id: m.id,
    tag: m.tag,
    name: m.name,
    monitorStatus: m.status, // ACTIVE/INACTIVE
    currentStatus: m.status === "ACTIVE" ? statusMap.get(m.tag) || "NO_DATA" : null,
  }));

  // Get all pages count
  const pages = await db.getAllPages();
  const pagesCount = pages.length;

  // Get all triggers count
  const triggers = await db.getTriggers({});
  const triggersCount = triggers.length;

  // Get maintenance events
  // Ongoing: events where start_date_time <= now && end_date_time >= now && status IN_PROGRESS or SCHEDULED
  // Upcoming: events where start_date_time > now && status = SCHEDULED
  const allEvents = await db.getMaintenanceEvents({});

  const ongoingMaintenances = allEvents.filter(
    (event) =>
      event.start_date_time <= now &&
      event.end_date_time >= now &&
      (event.status === "IN_PROGRESS" || event.status === "SCHEDULED"),
  );

  const upcomingMaintenances = allEvents.filter((event) => event.start_date_time > now && event.status === "SCHEDULED");

  return {
    monitorsCount,
    monitorsWithStatus,
    pagesCount,
    triggersCount,
    ongoingMaintenances,
    upcomingMaintenances,
  };
};

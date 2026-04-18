import GC from "$lib/global-constants";
import { UptimeCalculator } from "$lib/server/tool";
import type {
  IncidentForMonitorListWithComments,
  MaintenanceEventsMonitorList,
  MonitoringData,
  TimestampStatusCount,
} from "$lib/server/types/db";

type GroupMinuteMonitoringData = Pick<MonitoringData, "timestamp" | "status" | "latency">;

export function aggregateGroupStatus(statuses: string[]): string {
  if (statuses.length === 0 || statuses.every((status) => status === GC.NO_DATA)) {
    return GC.NO_DATA;
  }

  if (statuses.every((status) => status === GC.DOWN)) return GC.DOWN;
  if (statuses.includes(GC.DOWN)) return GC.DEGRADED;
  if (statuses.includes(GC.DEGRADED)) return GC.DEGRADED;
  if (statuses.includes(GC.MAINTENANCE)) return GC.MAINTENANCE;
  if (statuses.includes(GC.UP)) return GC.UP;

  return GC.NO_DATA;
}

export function buildGroupDayStatusDetail(
  monitoringDataByTag: Record<string, GroupMinuteMonitoringData[]>,
  startOfDayTodayAtTz: number,
  nowAtTz: number,
): {
  minutes: Array<{ timestamp: number; status: string }>;
  uptime: string;
} {
  const minuteData: Array<{ timestamp: number; status: string }> = [];
  const counts: TimestampStatusCount = {
    ts: nowAtTz - 60,
    countOfUp: 0,
    countOfDown: 0,
    countOfDegraded: 0,
    countOfMaintenance: 0,
    avgLatency: 0,
    maxLatency: 0,
    minLatency: 0,
  };

  const statusMapsByTag = Object.fromEntries(
    Object.entries(monitoringDataByTag).map(([tag, rows]) => [tag, new Map(rows.map((row) => [row.timestamp, row.status || GC.NO_DATA]))]),
  );
  const tags = Object.keys(statusMapsByTag);

  for (let timestamp = startOfDayTodayAtTz; timestamp < nowAtTz; timestamp += 60) {
    const statuses = tags.map((tag) => statusMapsByTag[tag].get(timestamp) || GC.NO_DATA);
    const status = aggregateGroupStatus(statuses);

    minuteData.push({ timestamp, status });

    if (status === GC.UP) counts.countOfUp++;
    else if (status === GC.DOWN) counts.countOfDown++;
    else if (status === GC.DEGRADED) counts.countOfDegraded++;
    else if (status === GC.MAINTENANCE) counts.countOfMaintenance++;
  }

  return {
    minutes: minuteData,
    uptime: UptimeCalculator([counts]).uptime,
  };
}

export function mergeGroupIncidents(
  incidentLists: IncidentForMonitorListWithComments[][],
): IncidentForMonitorListWithComments[] {
  const incidentsById = new Map<number, IncidentForMonitorListWithComments>();

  for (const incidents of incidentLists) {
    for (const incident of incidents) {
      const existing = incidentsById.get(incident.id);
      if (!existing) {
        incidentsById.set(incident.id, {
          ...incident,
          monitors: [...incident.monitors],
          comments: [...incident.comments],
        });
        continue;
      }

      const monitorsByTag = new Map(existing.monitors.map((monitor) => [monitor.monitor_tag, monitor]));
      for (const monitor of incident.monitors) {
        monitorsByTag.set(monitor.monitor_tag, monitor);
      }
      existing.monitors = Array.from(monitorsByTag.values());

      const commentsById = new Map(existing.comments.map((comment) => [comment.id, comment]));
      for (const comment of incident.comments) {
        commentsById.set(comment.id, comment);
      }
      existing.comments = Array.from(commentsById.values()).sort((left, right) => right.id - left.id);
    }
  }

  return Array.from(incidentsById.values()).sort((left, right) => right.start_date_time - left.start_date_time);
}

export function mergeGroupMaintenances(
  maintenanceLists: MaintenanceEventsMonitorList[][],
): MaintenanceEventsMonitorList[] {
  const maintenancesById = new Map<number, MaintenanceEventsMonitorList>();

  for (const maintenances of maintenanceLists) {
    for (const maintenance of maintenances) {
      const existing = maintenancesById.get(maintenance.id);
      if (!existing) {
        maintenancesById.set(maintenance.id, {
          ...maintenance,
          monitors: [...maintenance.monitors],
        });
        continue;
      }

      const monitorsByTag = new Map(existing.monitors.map((monitor) => [monitor.monitor_tag, monitor]));
      for (const monitor of maintenance.monitors) {
        monitorsByTag.set(monitor.monitor_tag, monitor);
      }
      existing.monitors = Array.from(monitorsByTag.values());
    }
  }

  return Array.from(maintenancesById.values()).sort((left, right) => right.start_date_time - left.start_date_time);
}

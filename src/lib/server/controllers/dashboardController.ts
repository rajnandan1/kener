import db from "../db/db.js";
import { GetMinuteStartNowTimestampUTC, BeginningOfMinute, BeginningOfDay } from "../tool.js";
import { GetPageByPathWithMonitors, GetLatestMonitoringDataAllActive } from "./controller.js";
import { GetAllPages } from "./pagesController.js";
import { GetStatusSummary, GetStatusColor, GetStatusBgColor } from "../../clientTools";
import type {
  IncidentRecord,
  IncidentCommentRecord,
  MaintenanceEventRecordDetailed,
  IncidentForMonitorList,
  MaintenanceEventsMonitorList,
  PageRecord,
  TimestampStatusCount,
} from "../types/db.js";
import GC from "../../global-constants.js";

// Type for incident with comments
export type IncidentWithComments = IncidentRecord & {
  comments: IncidentCommentRecord[];
};

// Re-export HourlyUptime for consumers
export type { HourlyUptime } from "../../types/monitor.js";

export const GetOngoingIncidents = async (
  monitor_tags: string[],
  incidentType: string,
): Promise<IncidentWithComments[]> => {
  const now = GetMinuteStartNowTimestampUTC();
  const ongoingIncidents = await db.getOngoingIncidentsByMonitorTags(now, monitor_tags, incidentType);

  // Fetch comments for each incident
  const incidentsWithComments = await Promise.all(
    ongoingIncidents.map(async (incident) => {
      const comments = await db.getActiveIncidentComments(incident.id);
      return {
        ...incident,
        comments,
      };
    }),
  );

  return incidentsWithComments;
};

//upcoming maintenance function using maintenance tables
export const GetUpcomingMaintenances = async (
  monitor_tags: string[],
  numDays: number,
  nowTs: number,
): Promise<MaintenanceEventRecordDetailed[]> => {
  const futureTimestamp = nowTs + numDays * 24 * 60 * 60;
  const upcomingMaintenances = await db.getUpcomingMaintenanceEventsByMonitorTags(nowTs, futureTimestamp, monitor_tags);
  return upcomingMaintenances;
};

//ongoing maintenance function using maintenance tables
export const GetOngoingMaintenances = async (
  monitor_tags: string[],
  nowTs: number,
): Promise<MaintenanceEventRecordDetailed[]> => {
  const ongoingMaintenances = await db.getOngoingMaintenanceEventsByMonitorTags(nowTs, monitor_tags);
  return ongoingMaintenances;
};

//given array of monitor tags, get ongoing incidents for dashboard
export const GetOngoingIncidentsForMonitorList = async (monitor_tags: string[]): Promise<IncidentForMonitorList[]> => {
  const now = GetMinuteStartNowTimestampUTC();
  const ongoingIncidents = await db.getOngoingIncidentsForMonitorList(now, monitor_tags);
  return ongoingIncidents;
};

//given array of monitor tags, get recently resolved incidents for dashboard
export const GetResolvedIncidentsForMonitorList = async (
  monitor_tags: string[],
  limit: number = 5,
  daysInPast: number = 7,
): Promise<IncidentForMonitorList[]> => {
  const now = GetMinuteStartNowTimestampUTC();
  const resolvedIncidents = await db.getResolvedIncidentsForMonitorList(now, monitor_tags, limit, daysInPast);
  return resolvedIncidents;
};

// ============ Maintenance Events for Monitor List ============

/**
 * Get ongoing maintenance events for a list of monitors
 * Returns maintenance events that are currently in progress
 */
export const GetOngoingMaintenanceEventsForMonitorList = async (
  monitor_tags: string[],
): Promise<MaintenanceEventsMonitorList[]> => {
  const now = GetMinuteStartNowTimestampUTC();
  const ongoingMaintenances = await db.getOngoingMaintenanceEventsForMonitorList(now, monitor_tags);
  return ongoingMaintenances;
};

/**
 * Get past/completed maintenance events for a list of monitors
 * Returns maintenance events that ended within the specified days
 */
export const GetPastMaintenanceEventsForMonitorList = async (
  monitor_tags: string[],
  limit: number = 5,
  daysInPast: number = 7,
): Promise<MaintenanceEventsMonitorList[]> => {
  const now = GetMinuteStartNowTimestampUTC();
  const pastMaintenances = await db.getPastMaintenanceEventsForMonitorList(now, monitor_tags, limit, daysInPast);
  return pastMaintenances;
};

/**
 * Get upcoming maintenance events for a list of monitors
 * Returns scheduled maintenance events within the specified days
 */
export const GetUpcomingMaintenanceEventsForMonitorList = async (
  monitor_tags: string[],
  limit: number = 5,
  daysInFuture: number = 7,
): Promise<MaintenanceEventsMonitorList[]> => {
  const now = GetMinuteStartNowTimestampUTC();
  const upcomingMaintenances = await db.getUpcomingMaintenanceEventsForMonitorList(
    now,
    monitor_tags,
    limit,
    daysInFuture,
  );
  return upcomingMaintenances;
};

// ============ Incident Detail Functions ============

/**
 * Get incident by ID
 */
export const GetIncidentById = async (id: number): Promise<Omit<IncidentRecord, "incident_source"> | undefined> => {
  return await db.getIncidentById(id);
};

/**
 * Get incident comments by incident ID
 */
export const GetIncidentCommentsByIncidentId = async (incident_id: number): Promise<IncidentCommentRecord[]> => {
  return await db.getActiveIncidentComments(incident_id);
};

/**
 * Get affected monitors by incident ID
 */
export const GetAffectedMonitorsByIncidentId = async (
  incident_id: number,
): Promise<Array<{ monitor_tag: string; monitor_impact: string | null }>> => {
  return await db.getIncidentMonitorsByIncidentID(incident_id);
};

// ============ Page Dashboard Data ============

export interface PageNavItem {
  page_title: string;
  page_path: string;
}

export interface PageDashboardData {
  pageStatus: { statusSummary: string; statusClass: string };
  ongoingIncidents: IncidentForMonitorList[];
  ongoingMaintenances: MaintenanceEventRecordDetailed[];
  upcomingMaintenances: MaintenanceEventRecordDetailed[];
  pastMaintenances: MaintenanceEventsMonitorList[];
  monitorTags: string[];
  pageDetails: PageRecord;
  allPages: PageNavItem[];
}

/**
 * Get all dashboard data for a status page
 * @param pagePath - The URL path of the page (e.g., "/" or "/api")
 * @returns Dashboard data or null if page not found
 */
export const GetPageDashboardData = async (pagePath: string): Promise<PageDashboardData | null> => {
  // Fetch page by path with monitors
  const pageData = await GetPageByPathWithMonitors(pagePath);
  if (!pageData) {
    return null;
  }

  const { page: pageDetails, monitors: pageMonitors } = pageData;
  const monitorTags = pageMonitors.map((pm) => pm.monitor_tag);

  const nowTs = BeginningOfDay();

  const [ongoingIncidents, ongoingMaintenances, upcomingMaintenances, pastMaintenances, latestData, allPagesData] =
    await Promise.all([
      GetOngoingIncidentsForMonitorList(monitorTags),
      GetOngoingMaintenances(monitorTags, nowTs),
      GetUpcomingMaintenances(monitorTags, 7, nowTs),
      GetPastMaintenanceEventsForMonitorList(monitorTags),
      GetLatestMonitoringDataAllActive(monitorTags),
      GetAllPages(),
    ]);

  // Map to lightweight page nav items
  const allPages: PageNavItem[] = allPagesData.map((p) => ({
    page_title: p.page_title,
    page_path: p.page_path,
  }));

  const upsInLatestData = latestData.filter((data) => data.status === GC.UP).length;
  const downsInLatestData = latestData.filter((data) => data.status === GC.DOWN).length;
  const degradedsInLatestData = latestData.filter((data) => data.status === GC.DEGRADED).length;
  const maintenancesInLatestData = latestData.filter((data) => data.status === GC.MAINTENANCE).length;
  const avgLatencyInLatestData =
    latestData.reduce((sum, data) => sum + (data.latency || 0), 0) / (latestData.length || 1);
  const item: TimestampStatusCount = {
    ts: nowTs,
    countOfUp: upsInLatestData,
    countOfDown: downsInLatestData,
    countOfDegraded: degradedsInLatestData,
    countOfMaintenance: maintenancesInLatestData,
    avgLatency: avgLatencyInLatestData,
  };

  const statusBgClass = GetStatusBgColor(item);
  const statusSummary = GetStatusSummary(item);

  const pageStatus: { statusSummary: string; statusClass: string } = {
    statusSummary: statusSummary,
    statusClass: statusBgClass,
  };
  return {
    pageStatus,
    ongoingIncidents,
    ongoingMaintenances,
    upcomingMaintenances,
    pastMaintenances,
    monitorTags,
    pageDetails,
    allPages,
  };
};

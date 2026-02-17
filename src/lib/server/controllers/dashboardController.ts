import db from "../db/db.js";
import { GetMinuteStartNowTimestampUTC, BeginningOfMinute, BeginningOfDay } from "../tool.js";
import { GetPageByPathWithMonitors, GetLatestMonitoringDataAllActive } from "./controller.js";
import { GetAllPages } from "./pagesController.js";
import { GetMonitorsParsed } from "./monitorsController.js";
import { GetStatusSummary, GetStatusBgColor } from "../../clientTools";
import type {
  IncidentRecord,
  IncidentCommentRecord,
  MaintenanceEventRecordDetailed,
  IncidentForMonitorList,
  MaintenanceEventsMonitorList,
  PageRecord,
  PageRecordTyped,
  TimestampStatusCount,
  PageSettingsType,
  IncidentMonitorDetailRecord,
} from "../types/db.js";
import type { GroupMonitorTypeData } from "../types/monitor.js";
import GC from "../../global-constants.js";

// Default page settings
const defaultPageSettings: PageSettingsType = {
  incidents: {
    enabled: true,
    ongoing: { show: true },
    resolved: { show: true, maxCount: 5, daysInPast: 7 },
  },
  include_maintenances: {
    enabled: true,
    ongoing: {
      show: true,
      past: { show: true, maxCount: 5, daysInPast: 7 },
      upcoming: { show: true, maxCount: 5, daysInFuture: 7 },
    },
  },
  monitor_status_history_days: {
    desktop: 90,
    mobile: 30,
  },
};

// Type for incident with comments
export type IncidentWithComments = IncidentRecord & {
  comments: IncidentCommentRecord[];
};

const GetOngoingIncidents = async (monitor_tags: string[], incidentType: string): Promise<IncidentWithComments[]> => {
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
const GetUpcomingMaintenances = async (
  monitor_tags: string[],
  numDays: number,
  nowTs: number,
  maxCount: number = 10,
): Promise<MaintenanceEventRecordDetailed[]> => {
  const futureTimestamp = nowTs + numDays * 24 * 60 * 60;
  const upcomingMaintenances = await db.getUpcomingMaintenanceEventsByMonitorTags(
    nowTs,
    futureTimestamp,
    monitor_tags,
    maxCount,
  );
  return upcomingMaintenances;
};

//ongoing maintenance function using maintenance tables
const GetOngoingMaintenances = async (
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
): Promise<Array<IncidentMonitorDetailRecord>> => {
  return await db.getMonitorsByIncidentId(incident_id);
};

// ============ Page Dashboard Data ============

export interface PageNavItem {
  page_title: string;
  page_path: string;
}

export interface PageDashboardData {
  pageStatus: { statusSummary: string; statusClass: string };
  ongoingIncidents: IncidentForMonitorList[];
  recentConcludedMaintenances: IncidentForMonitorList[];
  ongoingMaintenances: MaintenanceEventRecordDetailed[];
  upcomingMaintenances: MaintenanceEventRecordDetailed[];
  pastMaintenances: MaintenanceEventsMonitorList[];
  monitorTags: string[];
  monitorGroupMembersByTag: Record<string, string[]>;
  pageDetails: PageRecordTyped;
  allPages: PageNavItem[];
}

const BuildPageStatus = (latestData: Array<{ status?: string | null; latency?: number | null }>, nowTs: number) => {
  let upsInLatestData = 0;
  let downsInLatestData = 0;
  let degradedsInLatestData = 0;
  let maintenancesInLatestData = 0;
  let latencySum = 0;
  let maxLatency = 0;
  let minLatency = Infinity;

  for (const data of latestData) {
    if (data.status === GC.UP) {
      upsInLatestData++;
    } else if (data.status === GC.DOWN) {
      downsInLatestData++;
    } else if (data.status === GC.DEGRADED) {
      degradedsInLatestData++;
    } else if (data.status === GC.MAINTENANCE) {
      maintenancesInLatestData++;
    }

    const latency = data.latency || 0;
    latencySum += latency;
    if (latency > maxLatency) {
      maxLatency = latency;
    }
    if (latency < minLatency) {
      minLatency = latency;
    }
  }

  const item: TimestampStatusCount = {
    ts: nowTs,
    countOfUp: upsInLatestData,
    countOfDown: downsInLatestData,
    countOfDegraded: degradedsInLatestData,
    countOfMaintenance: maintenancesInLatestData,
    avgLatency: latencySum / (latestData.length || 1),
    maxLatency,
    minLatency: minLatency === Infinity ? 0 : minLatency,
  };

  return {
    statusSummary: GetStatusSummary(item),
    statusClass: GetStatusBgColor(item),
  };
};

/**
 * Get all dashboard data for a status page
 * @param pagePath - The URL path of the page (e.g., "/" or "/api")
 * @returns Dashboard data or null if page not found
 */
export const GetPageDashboardData = async (
  pagePath: string,
  allPagesInput?: PageNavItem[],
): Promise<PageDashboardData | null> => {
  // Fetch page by path with monitors
  const pageData = await GetPageByPathWithMonitors(pagePath);
  if (!pageData) {
    return null;
  }

  const { page: pageDetails, monitors: pageMonitors } = pageData;
  const monitorTags = pageMonitors.map((pm) => pm.monitor_tag);

  // Parse page settings with defaults
  let settings: PageSettingsType = defaultPageSettings;
  if (pageDetails.page_settings_json) {
    try {
      const parsed =
        typeof pageDetails.page_settings_json === "string"
          ? JSON.parse(pageDetails.page_settings_json)
          : pageDetails.page_settings_json;
      settings = { ...defaultPageSettings, ...parsed };
    } catch {
      settings = defaultPageSettings;
    }
  }
  const nowTs = GetMinuteStartNowTimestampUTC();

  // Convert to PageRecordTyped with parsed settings
  const pageDetailsTyped: PageRecordTyped = {
    id: pageDetails.id,
    page_path: pageDetails.page_path,
    page_title: pageDetails.page_title,
    page_header: pageDetails.page_header,
    page_subheader: pageDetails.page_subheader,
    page_logo: pageDetails.page_logo,
    page_settings: settings,
    created_at: pageDetails.created_at,
    updated_at: pageDetails.updated_at,
  };

  const allPagesPromise: Promise<PageNavItem[]> = allPagesInput
    ? Promise.resolve(allPagesInput)
    : GetAllPages().then((allPagesData) =>
        allPagesData.map((p) => ({
          page_title: p.page_title,
          page_path: p.page_path,
        })),
      );

  if (monitorTags.length === 0) {
    const allPages = await allPagesPromise;
    return {
      pageStatus: BuildPageStatus([], nowTs),
      recentConcludedMaintenances: [],
      ongoingIncidents: [],
      ongoingMaintenances: [],
      upcomingMaintenances: [],
      pastMaintenances: [],
      monitorTags,
      monitorGroupMembersByTag: {},
      pageDetails: pageDetailsTyped,
      allPages,
    };
  }

  // Fetch all dashboard data in parallel (respecting feature toggles)
  const [
    latestData,
    parsedMonitors,
    allPages,
    ongoingIncidents,
    recentConcludedMaintenances,
    ongoingMaintenances,
    pastMaintenances,
    upcomingMaintenances,
  ] = await Promise.all([
    GetLatestMonitoringDataAllActive(monitorTags),
    GetMonitorsParsed({ tags: monitorTags, status: "ACTIVE", is_hidden: "NO" }),
    allPagesPromise,
    settings.incidents.enabled && settings.incidents.ongoing.show
      ? GetOngoingIncidentsForMonitorList(monitorTags)
      : Promise.resolve([] as IncidentForMonitorList[]),
    settings.incidents.enabled && settings.incidents.resolved.show
      ? GetResolvedIncidentsForMonitorList(
          monitorTags,
          settings.incidents.resolved.maxCount,
          settings.incidents.resolved.daysInPast,
        )
      : Promise.resolve([] as IncidentForMonitorList[]),
    settings.include_maintenances.enabled && settings.include_maintenances.ongoing.show
      ? GetOngoingMaintenances(monitorTags, nowTs)
      : Promise.resolve([] as MaintenanceEventRecordDetailed[]),
    settings.include_maintenances.enabled && settings.include_maintenances.ongoing.past.show
      ? GetPastMaintenanceEventsForMonitorList(
          monitorTags,
          settings.include_maintenances.ongoing.past.maxCount,
          settings.include_maintenances.ongoing.past.daysInPast,
        )
      : Promise.resolve([] as MaintenanceEventsMonitorList[]),
    settings.include_maintenances.enabled && settings.include_maintenances.ongoing.upcoming.show
      ? GetUpcomingMaintenances(
          monitorTags,
          settings.include_maintenances.ongoing.upcoming.daysInFuture,
          nowTs,
          settings.include_maintenances.ongoing.upcoming.maxCount,
        )
      : Promise.resolve([] as MaintenanceEventRecordDetailed[]),
  ]);

  const pageStatus = BuildPageStatus(latestData, nowTs);
  const monitorGroupMembersByTag: Record<string, string[]> = {};

  for (const monitor of parsedMonitors) {
    if (monitor.monitor_type !== "GROUP") continue;

    const groupData = monitor.type_data as GroupMonitorTypeData;
    if (!groupData?.monitors || !Array.isArray(groupData.monitors)) continue;

    monitorGroupMembersByTag[monitor.tag] = groupData.monitors.map((member) => member.tag);
  }

  return {
    pageStatus,
    recentConcludedMaintenances,
    ongoingIncidents,
    ongoingMaintenances,
    upcomingMaintenances,
    pastMaintenances,
    monitorTags,
    monitorGroupMembersByTag,
    pageDetails: pageDetailsTyped,
    allPages,
  };
};

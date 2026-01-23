import {
  GetMinuteStartNowTimestampUTC,
  GetMinuteStartTimestampUTC,
  GetNowTimestampUTC,
  ReplaceAllOccurrences,
  ValidateEmail,
  UptimeCalculator,
} from "../tool.js";
import type {
  MonitorRecordInsert,
  TriggerRecordInsert,
  MonitoringDataInsert,
  MonitorAlertInsert,
  IncidentFilter,
  TriggerFilter,
  SubscriberRecordInsert,
  UserRecordInsert,
  UserRecord,
  MonitorRecordTyped,
  MonitorRecord,
  MonitorAlert,
  MonitoringData,
  TimestampStatusCount,
  UptimeCalculatorResult,
} from "../types/db.js";
import type { MonitorFilter } from "../db/repositories/base.js";
import Queue from "queue";
import db from "../db/db.js";
import { DEGRADED, DOWN, NO_DATA, SIGNAL, UP, REALTIME } from "../constants.js";
import type { PaginationInput } from "../../types/common.js";
import type { DayWiseStatus, NumberWithChange } from "../../types/monitor.js";
import GC, { getBadgeStyle, type BadgeStyle } from "../../global-constants.js";
import { makeBadge } from "badge-maker";
import { ErrorSvg } from "../../anywhere.js";
import { GetLastMonitoringValue } from "../cache/setGet.js";

interface GroupUpdateData {
  monitor_tag: string;
  timestamp: number;
  status: string;
  latency: number;
}

interface MonitorInput extends MonitorRecordInsert {
  id?: number;
}

interface DayGroupData {
  timestamp: number;
  total: number;
  UP: number;
  DOWN: number;
  DEGRADED: number;
  MAINTENANCE: number;
  NO_DATA: number;
  [key: string]: number;
}

interface UpdateMonitoringDataInput {
  monitor_tag: string;
  start: number;
  end: number;
  newStatus: string;
  type: string;
  latency?: number;
  deviation?: number;
}
interface MonitoringDataInput {
  monitor_tag: string;
  timestamp: number;
  status: string;
  latency?: number;
  type: string;
}

interface InterpolatedDataEntry {
  timestamp: number;
  status: string;
}

const insertStatusQueue = new Queue({
  concurrency: 1, // Number of tasks that can run concurrently
  timeout: 10000, // Timeout in ms after which a task will be considered as failed (optional)
  autostart: true, // Automatically start the queue (optional)
});

export const InsertMonitoringData = async (data: MonitoringDataInput): Promise<number[]> => {
  //do validation if present all fields below
  if (!data.monitor_tag || !data.timestamp || !data.status || !data.type) {
    throw new Error("Invalid data");
  }
  // insertStatusQueue.push(async (cb) => {
  //   await ProcessGroupUpdate(data as GroupUpdateData);
  //   if (cb) cb();
  // });
  return await db.insertMonitoringData({
    monitor_tag: data.monitor_tag,
    timestamp: data.timestamp,
    status: data.status,
    latency: data.latency || 0,
    type: data.type,
  });
};
export const ProcessGroupUpdate = async (data: GroupUpdateData): Promise<void> => {
  //find all active monitor that are of type group
  let groupActiveMonitors = await db.getMonitors({ status: "ACTIVE", monitor_type: "GROUP" });
  let validMonitorTags: Array<{ groupTag: string; selectedMonitorTags: string[] }> = [];

  for (let i = 0; i < groupActiveMonitors.length; i++) {
    let groupActiveMonitor = groupActiveMonitors[i];
    let typeData = JSON.parse(groupActiveMonitor.type_data || "{}");
    let monitorsInGroup = typeData.monitors || [];
    let selectedMonitorTags = monitorsInGroup
      .filter((monitor: { selected?: boolean; tag: string }) => {
        if (!!monitor.selected) {
          return monitor.tag;
        }
      })
      .map((monitor: { tag: string }) => monitor.tag);
    validMonitorTags.push({
      groupTag: groupActiveMonitor.tag,
      selectedMonitorTags: selectedMonitorTags,
    });
  }

  for (let i = 0; i < validMonitorTags.length; i++) {
    let groupActiveMonitor = validMonitorTags[i];
    if (groupActiveMonitor.selectedMonitorTags.indexOf(data.monitor_tag) !== -1) {
      //do db insert
      //get last status by tag for the group tag
      let updateData: MonitoringDataInsert | null = null;
      let lastStatus = await db.getMonitoringDataAt(groupActiveMonitor.groupTag, data.timestamp);
      if (!!lastStatus) {
        let status = lastStatus.status;
        let timestamp = lastStatus.timestamp;
        let receivedStatus = data.status;
        let receivedTimestamp = data.timestamp;
        if (receivedStatus === DOWN) {
          updateData = {
            monitor_tag: groupActiveMonitor.groupTag,
            timestamp: receivedTimestamp,
            status: DOWN,
            type: REALTIME,
            latency: data.latency,
          };
        } else if (receivedStatus === DEGRADED && status !== DOWN) {
          updateData = {
            monitor_tag: groupActiveMonitor.groupTag,
            timestamp: receivedTimestamp,
            status: DEGRADED,
            type: REALTIME,
            latency: data.latency,
          };
        } else if (receivedStatus === UP && status !== DOWN && status !== DEGRADED) {
          updateData = {
            monitor_tag: groupActiveMonitor.groupTag,
            timestamp: receivedTimestamp,
            status: UP,
            type: REALTIME,
            latency: data.latency,
          };
        }
      } else {
        //if no last status then insert the new status
        updateData = {
          monitor_tag: groupActiveMonitor.groupTag,
          timestamp: data.timestamp,
          status: data.status,
          type: REALTIME,
          latency: data.latency,
        };
      }
      if (updateData && !!updateData.status) {
        await db.insertMonitoringData(updateData);
      }
    }
  }
};

export const UpdateMonitoringData = async (data: UpdateMonitoringDataInput): Promise<unknown[]> => {
  let queryData = { ...data };

  return await db.updateMonitoringData(
    queryData.monitor_tag,
    GetMinuteStartTimestampUTC(queryData.start),
    GetMinuteStartTimestampUTC(queryData.end),
    queryData.newStatus,
    queryData.type,
    queryData.latency ?? 0,
    queryData.deviation ?? 0,
  );
};

export const GetLastStatusBefore = async (monitor_tag: string, timestamp: number): Promise<string> => {
  let data = await db.getLastStatusBefore(monitor_tag, timestamp);
  if (data) {
    return data.status || NO_DATA;
  }
  return NO_DATA;
};

export const InterpolateData = (
  rawData: InterpolatedDataEntry[],
  startTimestamp: number,
  initialStatus: string,
  overrideEndTimestamp?: number,
): InterpolatedDataEntry[] => {
  const interpolatedData: InterpolatedDataEntry[] = [];
  let currentStatus = initialStatus || "UP";
  let endTimestamp = startTimestamp;

  if (rawData && rawData.length > 0) {
    endTimestamp = rawData[rawData.length - 1].timestamp;
  }
  if (overrideEndTimestamp) {
    endTimestamp = overrideEndTimestamp;
  }

  const dataByTimestamp = rawData.reduce((accumulator: Record<number, InterpolatedDataEntry>, entry) => {
    accumulator[entry.timestamp] = entry;
    return accumulator;
  }, {});

  for (let timestamp = startTimestamp; timestamp <= endTimestamp; timestamp += 60) {
    const currentEntry = dataByTimestamp[timestamp];
    if (currentEntry) {
      currentStatus = currentEntry.status;
    }
    interpolatedData.push({ timestamp, status: currentStatus });
  }

  return interpolatedData;
};

export const AggregateData = (
  rawData: InterpolatedDataEntry[],
): { total: number; UPs: number; DOWNs: number; DEGRADEDs: number; NO_DATAs: number } => {
  //data like [{ timestamp: 1732435920, status: 'NO_DATA' }]
  let rawDataWithStatus = rawData.filter((data) => data.status !== NO_DATA);
  const total = rawDataWithStatus.length;
  const UPs = rawDataWithStatus.filter((data) => data.status === UP).length;
  const DOWNs = rawDataWithStatus.filter((data) => data.status === DOWN).length;
  const DEGRADEDs = rawDataWithStatus.filter((data) => data.status === DEGRADED).length;
  const NO_DATAs = total - (UPs + DOWNs + DEGRADEDs);

  return { total, UPs, DOWNs, DEGRADEDs, NO_DATAs };
};

export const GetDataGroupByDayAlternative = async (
  monitor_tag: string,
  start: number,
  end: number,
  timezoneOffsetMinutes = 0,
): Promise<DayGroupData[]> => {
  const offsetMinutes = Number(timezoneOffsetMinutes);
  if (isNaN(offsetMinutes)) {
    throw new Error("Invalid timezone offset. Must be a number representing minutes from UTC.");
  }

  const offsetSeconds = offsetMinutes * 60;

  let rawData = await db.getDataGroupByDayAlternative(monitor_tag, start, end);
  let anchorStatus = await GetLastStatusBefore(monitor_tag, start);
  let interpolatedData = InterpolateData(rawData, start, anchorStatus, end);

  const groupedData = interpolatedData.reduce((acc: Record<number, DayGroupData>, row) => {
    // Calculate day group considering timezone offset
    const dayGroup = Math.floor((row.timestamp + offsetSeconds) / 86400);
    if (!acc[dayGroup]) {
      acc[dayGroup] = {
        timestamp: dayGroup * 86400 - offsetSeconds, // start of day in UTC
        total: 0,
        UP: 0,
        DOWN: 0,
        DEGRADED: 0,
        MAINTENANCE: 0,
        NO_DATA: 0,
      };
    }

    const group = acc[dayGroup];
    group.total++;
    group[row.status]++;

    return acc;
  }, {});

  // Transform grouped data to final format
  return Object.values(groupedData).map((group) => ({
    timestamp: group.timestamp,
    total: group.total,
    UP: group.UP,
    DOWN: group.DOWN,
    DEGRADED: group.DEGRADED,
    MAINTENANCE: group.MAINTENANCE,
    NO_DATA: group.NO_DATA,
  })) as DayGroupData[];
};
export const GetMonitorsParsed = async (query: MonitorFilter): Promise<Array<MonitorRecordTyped>> => {
  // Retrieve monitors from the database based on the provided query
  const rawMonitors = await db.getMonitors(query);

  // Parse type_data if available for each monitor
  const parsedMonitors = rawMonitors.map((monitor) => {
    const monitorData: MonitorRecord = { ...monitor };
    const monitorTyped: MonitorRecordTyped = {
      ...monitorData,
      type_data: {},
      monitor_settings_json: {},
    };

    if (monitorData.type_data) {
      try {
        monitorTyped.type_data = JSON.parse(monitorData.type_data);
      } catch (error) {
        // Fallback to an empty object if JSON parsing fails
        monitorTyped.type_data = {};
      }
    } else {
      monitorTyped.type_data = {};
    }

    if (monitorData.monitor_settings_json) {
      try {
        monitorTyped.monitor_settings_json = JSON.parse(monitorData.monitor_settings_json);
      } catch (error) {
        // Fallback to default settings if JSON parsing fails
        monitorTyped.monitor_settings_json = {
          uptime_formula_numerator: GC.defaultNumeratorStr,
          uptime_formula_denominator: GC.defaultDenominatorStr,
        };
      }
    } else {
      monitorTyped.monitor_settings_json = {
        uptime_formula_numerator: GC.defaultNumeratorStr,
        uptime_formula_denominator: GC.defaultDenominatorStr,
      };
    }

    return monitorTyped;
  });

  return parsedMonitors;
};

export const CreateUpdateMonitor = async (monitor: MonitorInput): Promise<number | number[]> => {
  let monitorData = { ...monitor };
  if (monitorData.id) {
    return await db.updateMonitor(monitorData as MonitorRecord);
  } else {
    return await db.insertMonitor(monitorData);
  }
};

export const CreateMonitor = async (monitor: MonitorInput): Promise<number[]> => {
  let monitorData = { ...monitor };
  if (monitorData.id) {
    throw new Error("monitor id must be empty or 0");
  }
  return await db.insertMonitor(monitorData);
};

export const UpdateMonitor = async (monitor: MonitorInput): Promise<number> => {
  let monitorData = { ...monitor };
  if (!!!monitorData.id || monitorData.id === 0) {
    throw new Error("monitor id cannot be empty or 0");
  }
  return await db.updateMonitor(monitorData as MonitorRecord);
};

export const GetMonitors = async (data: MonitorFilter): Promise<MonitorRecord[]> => {
  return await db.getMonitors(data);
};

export const GetLatestMonitoringData = async (monitor_tag: string): Promise<MonitoringData | undefined> => {
  let latestData = await db.getLatestMonitoringData(monitor_tag);

  return latestData;
};
export const GetLatestStatusActiveAll = async (): Promise<{ status: string }> => {
  //get all the active not hidden monitor tags
  const monitors = await db.getMonitors({ status: "ACTIVE", is_hidden: "NO" });
  const monitor_tags = monitors.map((m) => m.tag);

  const latestData: MonitoringData[] = [];
  for (let i = 0; i < monitor_tags.length; i++) {
    const tag = monitor_tags[i];
    const lastObj = await GetLastMonitoringValue(tag, () => GetLatestMonitoringData(tag));
    if (lastObj) {
      latestData.push(lastObj);
    }
  }

  let status = NO_DATA;
  for (let i = 0; i < latestData.length; i++) {
    //if any status is down then status = down, if any is degraded then status = degraded, down > degraded > up
    if (latestData[i].status === DOWN) {
      status = DOWN;
    } else if (latestData[i].status === DEGRADED && status !== DOWN) {
      status = DEGRADED;
    } else if (latestData[i].status === UP && status !== DOWN && status !== DEGRADED) {
      status = UP;
    }
  }
  return {
    status: status,
  };
};

//getLatestMonitoringDataAllActive
export const GetLatestMonitoringDataAllActive = async (monitor_tags: string[]): Promise<MonitoringData[]> => {
  let latestData = await db.getLatestMonitoringDataAllActive(monitor_tags);
  return latestData;
};

export const CalculateUptimeByTags = async (tags: string[], start: number, end: number): Promise<number> => {
  if (tags.length === 0) {
    return 0;
  }

  // Get raw monitoring data for all tags
  const rawData = await db.getMonitoringDataAll(tags, start, end);

  // Get anchor status before the period
  const anchorStatus = await GetLastStatusBeforeAll(tags, start);

  // Convert to format expected by InterpolateData (filter out null status)
  const formattedData = rawData
    .filter((d) => d.status !== null)
    .map((d) => ({ timestamp: d.timestamp, status: d.status as string }));

  // Interpolate data
  const interpolatedData = InterpolateData(formattedData, start, anchorStatus, end);

  // Aggregate the data
  const aggregated = AggregateData(interpolatedData);

  // Calculate uptime percentage (UP / total * 100)
  if (aggregated.total === 0) {
    return 0;
  }

  const uptime = (aggregated.UPs / aggregated.total) * 100;
  return Math.round(uptime * 10000) / 10000; // 4 decimal places
};

export const GetLastHeartbeat = async (monitor_tag: string): Promise<MonitoringData | undefined> => {
  return await db.getLastHeartbeat(monitor_tag);
};

export const RegisterHeartbeat = async (tag: string, secret: string): Promise<number[] | null> => {
  let monitor = await db.getMonitorByTag(tag);
  if (!monitor) {
    return null;
  }
  let typeData = monitor.type_data;
  if (!typeData) {
    return null;
  }
  try {
    let heartbeatConfig = JSON.parse(typeData);
    let heartbeatSecret = heartbeatConfig.secretString;
    if (heartbeatSecret === secret) {
      return InsertMonitoringData({
        monitor_tag: monitor.tag,
        timestamp: GetMinuteStartNowTimestampUTC(),
        status: UP,
        latency: 0,
        type: SIGNAL,
      });
    }
  } catch (e) {
    console.error("Error registering heartbeat:", e);
  }
  return null;
};

export const DeleteMonitorCompletelyUsingTag = async (tag: string): Promise<number> => {
  await db.deleteMonitorDataByTag(tag);
  await db.deleteIncidentMonitorsByTag(tag);
  await db.deleteMonitorAlertsByTag(tag);
  await db.deletePageMonitorsByTag(tag);
  await db.deleteMaintenanceMonitorsByTag(tag);
  return await db.deleteMonitorsByTag(tag);
};

//getMonitorsByTag
export const GetMonitorsByTag = async (tag: string): Promise<MonitorRecord | undefined> => {
  return await db.getMonitorsByTag(tag);
};

export const GetAllAlertsPaginated = async (
  data: PaginationInput,
): Promise<{ alerts: MonitorAlert[]; total: number }> => {
  const countResult = await db.getMonitorAlertsCount();
  return {
    alerts: await db.getMonitorAlertsPaginated(data.page, data.limit),
    total: countResult ? Number(countResult.count) : 0,
  };
};

export const GetMonitoringData = async (tag: string, since: number, now: number): Promise<MonitoringData[]> => {
  return await db.getMonitoringData(tag, since, now);
};
export const GetMonitoringDataAll = async (tags: string[], since: number, now: number): Promise<MonitoringData[]> => {
  return await db.getMonitoringDataAll(tags, since, now);
};

export const GetLastStatusBeforeAll = async (monitor_tags: string[], timestamp: number): Promise<string> => {
  let data = await db.getLastStatusBeforeAll(monitor_tags, timestamp);
  if (data) {
    return data.status || NO_DATA;
  }
  return NO_DATA;
};

export const InsertNewAlert = async (data: MonitorAlertInsert): Promise<MonitorAlert | undefined> => {
  if (await db.alertExists(data.monitor_tag, data.monitor_status, data.alert_status)) {
    return;
  }
  await db.insertAlert(data);
  return await db.getActiveAlert(data.monitor_tag, data.monitor_status, data.alert_status);
};

//getStatusCountsByInterval
export const GetStatusCountsByInterval = async (
  monitor_tag: string | string[],
  start: number,
  interval: number,
  numIntervals: number,
): Promise<TimestampStatusCount[]> => {
  return await db.getStatusCountsByInterval(monitor_tag, start, interval, numIntervals);
};

export type BadgeType = "status" | "uptime" | "latency";

export interface BadgeParams {
  tag: string;
  sinceLast?: string | null;
  hideDuration?: string | null;
  label?: string | null;
  labelColor?: string | null;
  color?: string | null;
  style?: string | null;
}

function formatDuration(rangeInSeconds: number): string {
  const days = Math.floor(rangeInSeconds / 86400);
  const hours = Math.floor((rangeInSeconds % 86400) / 3600);
  const minutes = Math.floor((rangeInSeconds % 3600) / 60);

  if (days > 0 || minutes < 1) {
    return `${days}d`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  }
  return "";
}

export const GetBadge = async (badgeType: BadgeType, params: BadgeParams): Promise<Response> => {
  const { tag } = params;

  if (!tag) {
    return new Response(ErrorSvg, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }

  let name: string;
  let message: string;
  let badgeColor: string = params.color || "#0079FF";

  // For status badge, we get real-time status
  if (badgeType === "status") {
    let lastObj: { status: string } | undefined;

    if (tag === "_") {
      // All monitors status
      const siteData = await db.getSiteDataByKey("siteName");
      name = (siteData?.value as string) || "All Monitors";
      lastObj = await GetLatestStatusActiveAll();
    } else {
      // Single monitor status
      const monitors = await GetMonitorsParsed({ tag, status: "ACTIVE", is_hidden: "NO" });
      if (monitors.length === 0) {
        return new Response(ErrorSvg, {
          headers: { "Content-Type": "image/svg+xml" },
        });
      }
      const m = monitors[0];
      name = m.name;
      lastObj = (await GetLastMonitoringValue(m.tag, () => GetLatestMonitoringData(m.tag))) as { status: string };
    }

    const status = (lastObj?.status as string) || NO_DATA;
    message = status;

    // Use status-specific color if no custom color provided
    if (!params.color) {
      //get site colors
      let myColors = {} as Record<string, string>;
      const siteColorsData = await db.getSiteDataByKey("colors");
      if (siteColorsData && siteColorsData.value) {
        try {
          myColors = JSON.parse(siteColorsData.value);
        } catch (e) {
          myColors = {};
        }
      }
      const statusColors: Record<string, string> = {
        UP: myColors.UP || "#00dfa2",
        DEGRADED: myColors.DEGRADED || "#e6ca61",
        DOWN: myColors.DOWN || "#ca3038",
        MAINTENANCE: myColors.MAINTENANCE || "#6679cc",
        NO_DATA: myColors.NO_DATA || "#9ca3af",
      };
      badgeColor = statusColors[status] || statusColors.NO_DATA;
    }
  } else {
    // For uptime/latency badges, we calculate over a time period
    let sinceLast: number;
    const sinceLastParam = params.sinceLast;
    if (sinceLastParam == undefined || isNaN(Number(sinceLastParam)) || Number(sinceLastParam) < 60) {
      sinceLast = 90 * 24 * 60 * 60;
    } else {
      sinceLast = Number(sinceLastParam);
    }
    const rangeInSeconds = sinceLast;
    const now = Math.floor(Date.now() / 1000);
    const since = GetMinuteStartNowTimestampUTC() - rangeInSeconds;

    const hideDuration = params.hideDuration === "true";
    const formatted = formatDuration(rangeInSeconds);

    let stats: TimestampStatusCount[] = [];
    let uptimeData: UptimeCalculatorResult = {
      uptime: "-",
      avgLatency: "-",
    };

    if (tag === "_") {
      // All monitors badge
      const siteData = await db.getSiteDataByKey("siteName");
      const siteName = siteData?.value as string | undefined;
      name = siteName || "All Monitors";
      const goodMonitors = await GetMonitorsParsed({ status: "ACTIVE", is_hidden: "NO" });
      const activeTags = goodMonitors.map((monitor) => monitor.tag);

      stats = await db.getStatusCountsByInterval(activeTags, since, now - since, 1);
      uptimeData = UptimeCalculator(stats);
    } else {
      // Single monitor badge
      const monitors = await GetMonitorsParsed({ tag });
      if (monitors.length === 0) {
        return new Response(ErrorSvg, {
          headers: { "Content-Type": "image/svg+xml" },
        });
      }
      const m = monitors[0];
      name = m.name;

      stats = await db.getStatusCountsByInterval(m.tag, since, now - since, 1);
      uptimeData = UptimeCalculator(
        stats,
        m.monitor_settings_json?.uptime_formula_numerator,
        m.monitor_settings_json?.uptime_formula_denominator,
      );
    }

    // Determine message based on badge type
    message = badgeType === "uptime" ? uptimeData.uptime : uptimeData.avgLatency;

    // Build label with duration suffix for uptime/latency
    name = name + (hideDuration ? "" : ` ${formatted}`);
  }

  // Build final label
  let label: string = params.label || name;
  label = label.trim();

  const format = {
    label,
    message,
    color: badgeColor,
    labelColor: params.labelColor || "#333",
    style: getBadgeStyle(params.style ?? null),
  };
  const svg = makeBadge(format);

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
};

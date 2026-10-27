import { isDeepStrictEqual } from "node:util";
import {
  GetMinuteStartNowTimestampUTC,
  GetMinuteStartTimestampUTC,
  GetNowTimestampUTC,
  GetNowTimestampUTCInMs,
  UnparsePercentage,
  UptimeCalculator,
} from "../tool.js";
import { LabelsFor, MaskStoredSecrets, MONITOR_LABELS, RestoreStoredSecrets } from "../storedSecrets.js";
import { getCache, setCache } from "../cache/cache.js";
import type {
  MonitorRecordInsert,
  MonitorAlertInsert,
  MonitorRecordTyped,
  MonitorRecord,
  MonitorAlert,
  MonitoringData,
  TimestampStatusCount,
  UptimeCalculatorResult,
  TimestampStatusCountByMonitor,
} from "../types/db.js";
import type { MonitorFilter } from "../db/repositories/base.js";
import db from "../db/db.js";
import type { PaginationInput } from "../../types/common.js";
import GC, { getBadgeStyle, type BadgeStyle } from "../../global-constants.js";
import type { MonitoringStatus } from "../../types/status.js";
import { makeBadge } from "badge-maker";
import randomName from "@scaleway/random-name";
import { ErrorSvg } from "../../anywhere.js";
import {
  GetLastMonitoringValue,
  SetLastHeartbeat,
  SetLastMonitoringValue,
  DeleteMonitorCaches,
} from "../cache/setGet.js";
import alertingQueue from "../queues/alertingQueue.js";
import { CollapseStatusCounts } from "../../clientTools.js";
import { translate, isLocaleAvailable } from "../i18n.js";
import type { HeartbeatMonitor, GroupMonitorTypeData } from "../types/monitor.js";
import { IsValidProxyURL, IsValidHeartbeatSecret, HEARTBEAT_SECRET_RULE } from "../../anywhere.js";

interface GroupUpdateData {
  monitor_tag: string;
  timestamp: number;
  status: string;
  latency: number;
}

interface MonitorInput extends MonitorRecordInsert {
  id?: number;
}

/**
 * Validates that a monitor tag is URL-friendly: lowercase alphanumeric, hyphens, and underscores only.
 * Must start and end with an alphanumeric character.
 */
const VALID_TAG_REGEX = /^[a-z0-9][a-z0-9_-]*[a-z0-9]$/;
const VALID_TAG_SINGLE_CHAR_REGEX = /^[a-z0-9]$/;

function isValidMonitorTag(tag: string): boolean {
  if (!tag || tag.length === 0) return false;
  if (tag.length === 1) return VALID_TAG_SINGLE_CHAR_REGEX.test(tag);
  return VALID_TAG_REGEX.test(tag);
}

function validateMonitorTag(tag: string): void {
  const trimmed = tag?.trim();
  if (!trimmed) {
    throw new Error("Monitor tag is required");
  }
  if (!isValidMonitorTag(trimmed)) {
    throw new Error(
      "Monitor tag must be URL-friendly: only lowercase letters, numbers, hyphens, and underscores. Must start and end with a letter or number.",
    );
  }
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
  error_message?: string | null;
  raw_status?: string | null;
}

interface InterpolatedDataEntry {
  timestamp: number;
  status: string;
}

export const InsertMonitoringData = async (data: MonitoringDataInput): Promise<MonitoringData | null> => {
  //do validation if present all fields below
  if (!data.monitor_tag || !data.timestamp || !data.status || !data.type) {
    throw new Error("Invalid data");
  }

  return await db.insertMonitoringData({
    monitor_tag: data.monitor_tag,
    timestamp: data.timestamp,
    status: data.status,
    latency: data.latency || 0,
    type: data.type,
    error_message: data.error_message,
    raw_status: data.raw_status,
  });
};

export const UpdateMonitoringData = async (data: UpdateMonitoringDataInput): Promise<unknown[]> => {
  const end = GetMinuteStartTimestampUTC(data.end);
  const result = await db.updateMonitoringData(
    data.monitor_tag,
    GetMinuteStartTimestampUTC(data.start),
    end,
    data.newStatus,
    data.type,
    data.latency ?? 0,
    data.deviation ?? 0,
  );

  const latestData = await db.getLatestMonitoringData(data.monitor_tag);
  if (latestData) {
    await SetLastMonitoringValue(data.monitor_tag, latestData);
  }
  // Manual samples reach alerting: a NONE monitor has no other trigger for evaluation.
  // Best-effort: the rows are committed, so a queue outage must not fail the write.
  try {
    await alertingQueue.push(data.monitor_tag, end, data.newStatus);
  } catch (err) {
    console.error(`Failed to enqueue alert evaluation for ${data.monitor_tag} after MANUAL data write:`, err);
  }
  return result;
};

export const AggregateData = (
  rawData: InterpolatedDataEntry[],
): { total: number; UPs: number; DOWNs: number; DEGRADEDs: number; NO_DATAs: number } => {
  //data like [{ timestamp: 1732435920, status: 'NO_DATA' }]
  let rawDataWithStatus = rawData.filter((data) => data.status !== GC.NO_DATA);
  const total = rawDataWithStatus.length;
  const UPs = rawDataWithStatus.filter((data) => data.status === GC.UP).length;
  const DOWNs = rawDataWithStatus.filter((data) => data.status === GC.DOWN).length;
  const DEGRADEDs = rawDataWithStatus.filter((data) => data.status === GC.DEGRADED).length;
  const NO_DATAs = total - (UPs + DOWNs + DEGRADEDs);

  return { total, UPs, DOWNs, DEGRADEDs, NO_DATAs };
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

type TypeData = Record<string, unknown>;
interface MonitorSecrets {
  monitor_type?: string | null;
  type_data: TypeData | null | undefined;
}

const maskTypeData = (monitorType: string | null | undefined, typeData: TypeData) =>
  MaskStoredSecrets(typeData, LabelsFor(MONITOR_LABELS, monitorType)) as TypeData;

/** Returns a copy of a monitor with each type_data secret masked as MONITOR_LABELS says. */
export function MaskMonitorSecrets(monitor: MonitorRecordTyped): MonitorRecordTyped {
  if (!monitor.type_data) return monitor;
  return { ...monitor, type_data: maskTypeData(monitor.monitor_type, monitor.type_data) };
}

/**
 * MaskMonitorSecrets for a dashboard row, whose type_data is a JSON string. `keepHeartbeatSecret` leaves
 * `secretString` readable for monitor writers, who need the heartbeat URL and can set the secret anyway.
 */
export function MaskMonitorRecordSecrets(monitor: MonitorRecord, keepHeartbeatSecret: boolean): MonitorRecord {
  if (!monitor.type_data) return monitor;
  const typeData = parseTypeData(monitor.type_data) ?? {};
  const masked = maskTypeData(monitor.monitor_type, typeData);
  if (keepHeartbeatSecret && typeData.secretString !== undefined) masked.secretString = typeData.secretString;
  return { ...monitor, type_data: JSON.stringify(masked) };
}

/**
 * Puts the stored secret back for each masked type_data secret. A header is matched by key. Throws StoredSecretError
 * when the monitor type or a destination field changed and a stored secret would go with it.
 */
export function RestoreMonitorSecrets(sent: MonitorSecrets, stored: MonitorSecrets | undefined): TypeData {
  const labels = LabelsFor(MONITOR_LABELS, sent.monitor_type);
  const storedLabels = stored ? LabelsFor(MONITOR_LABELS, stored.monitor_type) : labels;
  return RestoreStoredSecrets(sent.type_data ?? {}, stored?.type_data, labels, storedLabels) as TypeData;
}

/** RestoreMonitorSecrets against the saved monitor with this id. Without an id, the type_data comes back as sent. */
export const RestoreSavedMonitorSecrets = async (
  monitorType: string,
  typeData: TypeData,
  monitorId?: number,
): Promise<TypeData> => {
  const stored = monitorId ? (await db.getMonitors({ id: monitorId }))[0] : undefined;
  if (!stored) return typeData;
  return RestoreMonitorSecrets(
    { monitor_type: monitorType, type_data: typeData },
    { monitor_type: stored.monitor_type, type_data: parseTypeData(stored.type_data) },
  );
};

/**
 * type_data.proxy must be a valid http(s):// URL. Node silently ignores any other scheme and
 * throws on a malformed authority, both at check time, so save is where a typo has to fail.
 * `$SECRET` tokens are still raw here and pass. Unparseable type_data is not this check's problem.
 * A proxy equal to `storedProxy` passes, so a bad stored value does not block an unrelated change.
 */
export function ValidateTypeDataProxy(monitor: Pick<MonitorInput, "type_data">, storedProxy?: unknown): void {
  if (!monitor.type_data) return;
  let typeData: unknown;
  try {
    typeData = typeof monitor.type_data === "string" ? JSON.parse(monitor.type_data) : monitor.type_data;
  } catch {
    return;
  }
  // type_data is parsed JSON, so `proxy` can be any type. Absent or blank means no proxy;
  // anything else - an object or a number included - has to be a proxy URL.
  const proxy = (typeData as { proxy?: unknown } | null)?.proxy;
  if (proxy === undefined || proxy === null || isDeepStrictEqual(proxy, storedProxy)) return;
  if (typeof proxy === "string" && proxy.trim() === "") return;
  if (!IsValidProxyURL(proxy)) {
    throw new Error("Proxy URL must be a valid http:// or https:// URL");
  }
}

function parseTypeData(typeData: string | null | undefined): Record<string, unknown> | null {
  if (!typeData) return {};
  try {
    const parsed: unknown = JSON.parse(typeData);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const newHeartbeatSecret = (): string => randomName() + "-" + randomName();

/**
 * Returns the HEARTBEAT monitor to save, with a generated secret when it has none. Throws when
 * the secret is new or changed and breaks the rule; an unchanged stored secret is kept as is.
 */
export function WithValidHeartbeatSecret<T extends Pick<MonitorInput, "monitor_type" | "type_data">>(
  monitor: T,
  storedSecret?: unknown,
): T {
  if (monitor.monitor_type !== "HEARTBEAT") return monitor;
  const typeData = parseTypeData(monitor.type_data);
  if (!typeData) return monitor;
  const secret = typeData.secretString;
  if (secret !== undefined && secret !== storedSecret && !IsValidHeartbeatSecret(secret)) {
    throw new Error(`Heartbeat secret breaks the rule. ${HEARTBEAT_SECRET_RULE}`);
  }
  if (secret) return monitor;
  return { ...monitor, type_data: JSON.stringify({ ...typeData, secretString: newHeartbeatSecret() }) };
}

export const CreateUpdateMonitor = async (monitor: MonitorInput): Promise<number | number[]> => {
  let monitorData = { ...monitor };
  const stored = monitorData.id ? (await db.getMonitors({ id: monitorData.id }))[0] : undefined;
  const storedTypeData = parseTypeData(stored?.type_data);
  const typeData = monitorData.type_data ? parseTypeData(monitorData.type_data) : null;
  if (stored && monitorData.type_data === undefined) monitorData.type_data = stored.type_data;
  else if (typeData) {
    const restored = RestoreMonitorSecrets(
      { monitor_type: monitorData.monitor_type, type_data: typeData },
      stored && { monitor_type: stored.monitor_type, type_data: storedTypeData },
    );
    monitorData.type_data = JSON.stringify(restored);
  }
  ValidateTypeDataProxy(monitorData, storedTypeData?.proxy);
  monitorData = WithValidHeartbeatSecret(monitorData, storedTypeData?.secretString);
  if (monitorData.id) {
    return await db.updateMonitor(monitorData as MonitorRecord);
  } else {
    validateMonitorTag(monitorData.tag);
    return await db.insertMonitor(monitorData);
  }
};

export const CreateMonitor = async (monitor: MonitorInput): Promise<number[]> => {
  let monitorData = { ...monitor };
  if (monitorData.id) {
    throw new Error("monitor id must be empty or 0");
  }
  validateMonitorTag(monitorData.tag);
  ValidateTypeDataProxy(monitorData);
  return await db.insertMonitor(monitorData);
};

interface CloneMonitorInput {
  sourceTag: string;
  newTag: string;
  newName: string;
}

export const CloneMonitor = async ({ sourceTag, newTag, newName }: CloneMonitorInput): Promise<number[]> => {
  const sourceTagTrimmed = sourceTag?.trim();
  const newTagTrimmed = newTag?.trim();
  const newNameTrimmed = newName?.trim();

  if (!sourceTagTrimmed) {
    throw new Error("Source monitor tag is required");
  }
  if (!newTagTrimmed) {
    throw new Error("Tag is required");
  }
  validateMonitorTag(newTagTrimmed);
  if (!newNameTrimmed) {
    throw new Error("Name is required");
  }
  if (sourceTagTrimmed === newTagTrimmed) {
    throw new Error("New tag must be different from source tag");
  }

  const source = await db.getMonitorsByTag(sourceTagTrimmed);
  if (!source) {
    throw new Error("Source monitor not found");
  }

  const existingTag = await db.getMonitorsByTag(newTagTrimmed);
  if (existingTag) {
    throw new Error("Monitor tag already exists");
  }

  const allMonitors = await db.getMonitors({});
  if (allMonitors.some((m) => m.name === newNameTrimmed)) {
    throw new Error("Monitor name already exists");
  }

  return await db.insertMonitor({
    tag: newTagTrimmed,
    name: newNameTrimmed,
    description: source.description,
    image: source.image,
    cron: source.cron,
    default_status: source.default_status,
    status: source.status,
    category_name: source.category_name,
    monitor_type: source.monitor_type,
    down_trigger: source.down_trigger,
    degraded_trigger: source.degraded_trigger,
    type_data:
      source.monitor_type === "HEARTBEAT"
        ? JSON.stringify({ ...parseTypeData(source.type_data), secretString: newHeartbeatSecret() })
        : source.type_data,
    day_degraded_minimum_count: source.day_degraded_minimum_count,
    day_down_minimum_count: source.day_down_minimum_count,
    confirmation_threshold: source.confirmation_threshold,
    include_degraded_in_downtime: source.include_degraded_in_downtime,
    is_hidden: source.is_hidden,
    monitor_settings_json: source.monitor_settings_json,
    external_url: source.external_url,
  });
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
  const monitors = await db.getMonitors({ status: GC.ACTIVE, is_hidden: GC.NO });
  const monitor_tags = monitors.map((m) => m.tag);

  const latestData: MonitoringData[] = [];
  for (let i = 0; i < monitor_tags.length; i++) {
    const tag = monitor_tags[i];
    const lastObj = await GetLastMonitoringValue(tag, () => GetLatestMonitoringData(tag));
    if (lastObj) {
      latestData.push(lastObj);
    }
  }

  const counts = { countOfUp: 0, countOfDown: 0, countOfDegraded: 0, countOfMaintenance: 0 };
  for (const data of latestData) {
    if (data.status === GC.UP) {
      counts.countOfUp++;
    } else if (data.status === GC.DOWN) {
      counts.countOfDown++;
    } else if (data.status === GC.DEGRADED) {
      counts.countOfDegraded++;
    } else if (data.status === GC.MAINTENANCE) {
      counts.countOfMaintenance++;
    }
  }
  return {
    status: CollapseStatusCounts(counts),
  };
};

//getLatestMonitoringDataAllActive
export const GetLatestMonitoringDataAllActive = async (monitor_tags: string[]): Promise<MonitoringData[]> => {
  let latestData = await db.getLatestMonitoringDataAllActive(monitor_tags);
  return latestData;
};

/**
 * expiry_at and issuer_* live only in Redis last_status, not in monitoring_data.
 * Attach them only when the cached entry is the same check as the DB row.
 */
export function mergeLatestMonitoringWithSslCache(
  fromDb: MonitoringData | null | undefined,
  cached: MonitoringData | null | undefined,
): MonitoringData | null {
  if (!fromDb) return null;
  if (
    !cached ||
    cached.timestamp !== fromDb.timestamp ||
    cached.status !== fromDb.status ||
    cached.type !== fromDb.type
  ) {
    return fromDb;
  }
  return {
    ...fromDb,
    expiry_at: cached.expiry_at,
    issuer_cn: cached.issuer_cn,
    issuer_o: cached.issuer_o,
    cert_trusted: cached.cert_trusted,
  };
}

export const AttachSslCacheFields = async (
  fromDb: MonitoringData | null | undefined,
): Promise<MonitoringData | null> => {
  if (!fromDb) return null;
  const cached = await GetLastMonitoringValue(fromDb.monitor_tag).catch(() => null);
  return mergeLatestMonitoringWithSslCache(fromDb, cached);
};

export const GetLastHeartbeat = async (monitor_tag: string): Promise<MonitoringData | undefined> => {
  return await db.getLastHeartbeat(monitor_tag);
};

export const RegisterHeartbeat = async (tag: string, secret: string): Promise<string> => {
  let monitor = (await GetMonitorsParsed({ tag, status: "ACTIVE", monitor_type: "HEARTBEAT" }).then((monitors) =>
    monitors.length > 0 ? monitors[0] : null,
  )) as HeartbeatMonitor | null;
  if (!monitor) {
    throw new Error("Monitor not found");
  }

  let typeData = monitor.type_data;
  if (!typeData) {
    throw new Error("Monitor type data not found");
  }
  try {
    let heartbeatConfig = typeData;
    let heartbeatSecret = heartbeatConfig.secretString;
    if (heartbeatSecret === secret) {
      // Store last heartbeat in seconds (DB uses seconds). Heartbeat evaluator tolerates older ms values.
      let nowSec = GetNowTimestampUTC();

      // Avoid rare collisions with minute-rounded monitoring timestamps (which can overwrite due to PK constraints).
      // Minute-rounded timestamps always end with :00 seconds.
      if (nowSec % 60 === 0) {
        nowSec += 1;
      }

      await SetLastHeartbeat(tag, nowSec);

      // Best-effort persist a heartbeat SIGNAL for restart recovery.
      // Failure here should not break heartbeat reception.
      try {
        await InsertMonitoringData({
          monitor_tag: tag,
          timestamp: nowSec,
          status: GC.UP,
          latency: 0,
          type: GC.SIGNAL,
          error_message: null,
        });
      } catch (e) {
        console.error("Error persisting heartbeat signal:", e);
      }
      return "OK";
    }
  } catch (e) {
    console.error("Error registering heartbeat:", e);
  }
  throw new Error("Invalid heartbeat secret");
};

/**
 * Removes a monitor tag from all GROUP monitors that reference it,
 * rebalances weights equally, and deactivates groups left with < 2 members.
 */
async function removeTagFromGroupMonitors(tag: string): Promise<void> {
  const groupMonitors = await GetMonitorsParsed({ monitor_type: "GROUP" });

  for (const group of groupMonitors) {
    const typeData = group.type_data as GroupMonitorTypeData;
    if (!typeData.monitors || !Array.isArray(typeData.monitors)) continue;

    const hasMember = typeData.monitors.some((m) => m.tag === tag);
    if (!hasMember) continue;

    // Remove the deleted tag
    const remaining = typeData.monitors.filter((m) => m.tag !== tag);

    // Rebalance weights equally across remaining monitors
    if (remaining.length > 0) {
      const weight = Math.round((1 / remaining.length) * 1000) / 1000;
      for (let i = 0; i < remaining.length; i++) {
        remaining[i].weight =
          i === remaining.length - 1 ? Math.round((1 - weight * (remaining.length - 1)) * 1000) / 1000 : weight;
      }
    }

    typeData.monitors = remaining;

    const updateData: Record<string, unknown> = {
      id: group.id,
      tag: group.tag,
      name: group.name,
      description: group.description,
      image: group.image,
      cron: group.cron,
      default_status: group.default_status,
      status: remaining.length < 2 ? "INACTIVE" : group.status,
      category_name: group.category_name,
      monitor_type: group.monitor_type,
      type_data: JSON.stringify(typeData),
      day_degraded_minimum_count: group.day_degraded_minimum_count,
      day_down_minimum_count: group.day_down_minimum_count,
      confirmation_threshold: group.confirmation_threshold,
      include_degraded_in_downtime: group.include_degraded_in_downtime,
      is_hidden: group.is_hidden,
      monitor_settings_json:
        typeof group.monitor_settings_json === "string"
          ? group.monitor_settings_json
          : JSON.stringify(group.monitor_settings_json),
      external_url: group.external_url,
    };

    await db.updateMonitor(updateData as unknown as MonitorRecord);
  }
}

export const DeleteMonitorCompletelyUsingTag = async (tag: string): Promise<number> => {
  await db.deleteMonitorDataByTag(tag);
  await db.deleteIncidentMonitorsByTag(tag);
  await db.deleteMonitorAlertsByTag(tag);
  await db.deleteMonitorAlertConfigsByMonitorTag(tag);
  await db.deletePageMonitorsByTag(tag);
  await db.deleteMaintenanceMonitorsByTag(tag);
  await removeTagFromGroupMonitors(tag);
  await DeleteMonitorCaches(tag);
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

//getMonitoringDataPaginated
export const GetMonitoringDataPaginated = async (
  page: number,
  limit: number,
  filter?: { monitor_tag?: string; status?: MonitoringStatus; start_time?: number; end_time?: number },
): Promise<{ data: MonitoringData[]; total: number }> => {
  const data = await db.getMonitoringDataPaginated(page, limit, filter);
  const countResult = await db.getMonitoringDataCount(filter);
  return { data, total: countResult.count };
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
  metric?: string | null;
  locale?: string | null;
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
      const monitors = await GetMonitorsParsed({ tag, status: GC.ACTIVE, is_hidden: GC.NO });
      if (monitors.length === 0) {
        return new Response(ErrorSvg, {
          headers: { "Content-Type": "image/svg+xml" },
        });
      }
      const m = monitors[0];
      name = m.name;
      lastObj = (await GetLastMonitoringValue(m.tag, () => GetLatestMonitoringData(m.tag))) as { status: string };
    }

    const status = (lastObj?.status as string) || GC.NO_DATA;

    // Resolve locale: validate against activated locales, fall back to configured default
    const i18nData = await db.getSiteDataByKey("i18n");
    let i18nConfig: { defaultLocale: string; locales: Array<{ code: string; selected: boolean }> } | null = null;
    if (i18nData?.value) {
      try {
        i18nConfig = typeof i18nData.value === "string" ? JSON.parse(i18nData.value) : i18nData.value;
      } catch {
        i18nConfig = null;
      }
    }
    const defaultLocale = i18nConfig?.defaultLocale || "en";
    const activatedCodes = new Set(i18nConfig?.locales?.filter((l) => l.selected).map((l) => l.code) ?? ["en"]);
    const requestedLocale = params.locale || defaultLocale;
    const locale =
      activatedCodes.has(requestedLocale) && isLocaleAvailable(requestedLocale) ? requestedLocale : defaultLocale;

    const statusLocaleKey: Record<string, string> = {
      [GC.UP]: "Operational",
      [GC.DEGRADED]: "Degraded",
      [GC.DOWN]: "Down",
      [GC.MAINTENANCE]: "Under Maintenance",
      [GC.NO_DATA]: "No Status Available",
    };
    message = translate(locale, statusLocaleKey[status] || status, defaultLocale);

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
      maxLatency: "-",
      minLatency: "-",
    };

    if (tag === "_") {
      // All monitors badge
      const siteData = await db.getSiteDataByKey("siteName");
      const siteName = siteData?.value as string | undefined;
      name = siteName || "All Monitors";
      const goodMonitors = await GetMonitorsParsed({ status: GC.ACTIVE, is_hidden: GC.NO });
      const activeTags = goodMonitors.map((monitor) => monitor.tag);

      stats = await db.getStatusCountsByInterval(activeTags, since, now - since, 1);
      uptimeData = UptimeCalculator(stats);
    } else {
      // Single monitor badge
      const monitors = await GetMonitorsParsed({ tag, status: GC.ACTIVE, is_hidden: GC.NO });
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
    if (badgeType === "uptime") {
      message = uptimeData.uptime;
    } else {
      // latency badge - support metric param (average, maximum, minimum)
      const metric = params.metric || "average";
      if (metric === "maximum") {
        message = uptimeData.maxLatency;
      } else if (metric === "minimum") {
        message = uptimeData.minLatency;
      } else {
        message = uptimeData.avgLatency;
      }
    }

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

//calculate uptime for last N rows
export const CalculateUptimeForLastNRows = async (
  tag: string | string[],
  lastX: number,
  numeratorStr: string,
  denominatorStr: string,
): Promise<number> => {
  const statusCounts = await db.getStatusCountsForLastN(tag, lastX);
  const uptime = UptimeCalculator([statusCounts], numeratorStr, denominatorStr);
  return UnparsePercentage(uptime.uptime);
};

export const IsUptimeGreaterThanXPercent = async (
  tag: string | string[],
  lastX: number,
  threshold: number,
  numeratorStr: string,
  denominatorStr: string,
): Promise<boolean> => {
  const uptimePercent = await CalculateUptimeForLastNRows(tag, lastX, numeratorStr, denominatorStr);
  return uptimePercent > threshold;
};

export const IsUptimeLessThanXPercent = async (
  tag: string | string[],
  lastX: number,
  threshold: number,
  numeratorStr: string,
  denominatorStr: string,
): Promise<boolean> => {
  const uptimePercent = await CalculateUptimeForLastNRows(tag, lastX, numeratorStr, denominatorStr);
  return uptimePercent < threshold;
};
export const GetStatusCountsByIntervalGroupedByMonitor = async (
  monitorTags: string[],
  startTimestamp: number,
  intervalInSeconds: number,
  numberOfPoints: number,
): Promise<Array<TimestampStatusCountByMonitor>> => {
  const sortedTags = [...monitorTags].sort();
  const cacheKey = `status_counts_grouped:${sortedTags.join(",")}:${startTimestamp}:${intervalInSeconds}:${numberOfPoints}`;
  const cached = await getCache<Array<TimestampStatusCountByMonitor>>(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await db.getStatusCountsByIntervalGroupedByMonitor(
    monitorTags,
    startTimestamp,
    intervalInSeconds,
    numberOfPoints,
  );
  await setCache(cacheKey, result, 60);
  return result;
};
export const GetLastKnownStatus = async (monitor_tag: string): Promise<MonitoringData | undefined> => {
  return await db.getLastKnownStatus(monitor_tag);
};

import type { MonitorValueDisplay, TimestampStatusCount } from "$lib/server/types/db";
import GC, { PAGE_STATUS_MESSAGES, type StatusType } from "$lib/global-constants";

function IsCustomUnit(display?: MonitorValueDisplay | null): boolean {
  return typeof display?.unit === "string" && display.unit !== "ms";
}

// Custom units treat 0 as a real reading, but a bucket whose readings were ALL NULL (e.g. every
// check in the window failed before recording a value) must not be fabricated into a "0" sample.
// `latencyCount` is the count of non-NULL `latency` readings the aggregate was built from (SQL
// COUNT(latency) ignores NULLs, unlike AVG/MIN/MAX which silently collapse an all-NULL bucket to
// NULL -> 0 downstream) - gate on that instead of on status counts.
function DayHasReading(d: Pick<TimestampStatusCount, "latencyCount">): boolean {
  return d.latencyCount > 0;
}

function clampDecimals(d: unknown): number | undefined {
  if (typeof d !== "number" || !Number.isFinite(d)) return undefined;
  return Math.min(4, Math.max(0, Math.round(d)));
}

function FormatValue(value: number | null | undefined, display?: MonitorValueDisplay | null): string {
  if (!IsCustomUnit(display)) {
    // Legacy latency path - must stay byte-identical to the historical ParseLatency.
    const latencyMs = value as number;
    if (!!!latencyMs) {
      return "";
    }
    if (latencyMs < 1000) {
      return `${Math.round(latencyMs)}ms`;
    } else if (latencyMs < 60000) {
      return `${(latencyMs / 1000).toFixed(2)}s`;
    } else if (latencyMs < 3600000) {
      return `${(latencyMs / 60000).toFixed(2)}m`;
    } else {
      return `${(latencyMs / 3600000).toFixed(2)}h`;
    }
  }
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }
  const decimals = clampDecimals(display?.decimals);
  // Locale pinned so strings formatted on the server (badges, monitor-bar) match the client.
  const formatted = new Intl.NumberFormat("en-US", {
    useGrouping: false,
    ...(decimals === undefined
      ? { maximumFractionDigits: 2 } // "auto": up to 2 fraction digits, trailing zeros trimmed
      : { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
  }).format(value);
  const unit = display?.unit ?? "";
  if (unit === "" || unit === "%") {
    return `${formatted}${unit}`;
  }
  return `${formatted} ${unit}`;
}

/** @deprecated Use FormatValue. TODO(next-major): rename latency -> value and remove this alias. */
function ParseLatency(latencyMs: number): string {
  return FormatValue(latencyMs);
}

function siteDataExtractFromDb(data: Record<string, unknown>, obj: Record<string, unknown>): Record<string, unknown> {
  let requestedObject: Record<string, unknown> = { ...obj };
  for (const key in requestedObject) {
    if (Object.prototype.hasOwnProperty.call(requestedObject, key)) {
      const element = data[key];
      if (data[key]) {
        requestedObject[key] = data[key];
      }
    }
  }
  //remove any keys that are still null or empty
  for (const key in requestedObject) {
    if (Object.prototype.hasOwnProperty.call(requestedObject, key)) {
      const element = requestedObject[key];
      if (element === null || element === "") {
        delete requestedObject[key];
      }
    }
  }
  return requestedObject;
}

const AllRecordTypes = {
  A: 1,
  NS: 2,
  MD: 3,
  MF: 4,
  CNAME: 5,
  SOA: 6,
  MB: 7,
  MG: 8,
  MR: 9,
  NULL: 10,
  WKS: 11,
  PTR: 12,
  HINFO: 13,
  MINFO: 14,
  MX: 15,
  TXT: 16,
  RP: 17,
  AFSDB: 18,
  X25: 19,
  ISDN: 20,
  RT: 21,
  NSAP: 22,
  NSAP_PTR: 23,
  SIG: 24,
  KEY: 25,
  PX: 26,
  GPOS: 27,
  AAAA: 28,
  LOC: 29,
  NXT: 30,
  EID: 31,
  NIMLOC: 32,
  SRV: 33,
  ATMA: 34,
  NAPTR: 35,
  KX: 36,
  CERT: 37,
  A6: 38,
  DNAME: 39,
  SINK: 40,
  OPT: 41,
  APL: 42,
  DS: 43,
  SSHFP: 44,
  IPSECKEY: 45,
  RRSIG: 46,
  NSEC: 47,
  DNSKEY: 48,
  DHCID: 49,
  NSEC3: 50,
  NSEC3PARAM: 51,
  TLSA: 52,
  SMIMEA: 53,
  HIP: 55,
  NINFO: 56,
  RKEY: 57,
  TALINK: 58,
  CDS: 59,
  CDNSKEY: 60,
  OPENPGPKEY: 61,
  CSYNC: 62,
  SPF: 99,
  UINFO: 100,
  UID: 101,
  GID: 102,
  UNSPEC: 103,
  NID: 104,
  L32: 105,
  L64: 106,
  LP: 107,
  EUI48: 108,
  EUI64: 109,
  TKEY: 249,
  TSIG: 250,
  IXFR: 251,
  AXFR: 252,
  MAILB: 253,
  MAILA: 254,
  ANY: 255,
};
const ValidateIpAddress = function (input: string): "IP4" | "IP6" | "DOMAIN" | "Invalid" {
  // Check if input is a valid IPv4 address with an optional port
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(input)) {
    return "IP4";
  }

  // Improved IPv6 regex that better handles compressed notation
  const ipv6Regex =
    /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){0,7}:|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){6}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|(?:[0-9a-fA-F]{1,4}:){1,7}(?::|:[0-9a-fA-F]{1,4})|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:))$/;
  if (ipv6Regex.test(input)) {
    return "IP6";
  }

  // Check if input is a valid domain name with an optional port
  const domainRegex = /^[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
  if (domainRegex.test(input)) {
    return "DOMAIN";
  }

  // If none of the above conditions match, the input is invalid
  return "Invalid";
};

function IsValidHost(domain: string): boolean {
  const regex = /^[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
  return regex.test(domain);
}
function IsValidNameServer(nameServer: string): boolean {
  //8.8.8.8 example
  const regex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
  return regex.test(nameServer);
}
function IsValidDnsResolver(resolver: string): boolean {
  const normalizedResolver = resolver.trim();
  const ipv4Parts = normalizedResolver.split(".");
  if (
    ipv4Parts.length === 4 &&
    ipv4Parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
  ) {
    return true;
  }
  const ipType = ValidateIpAddress(normalizedResolver);
  if (ipType === "IP6") {
    return true;
  }
  return IsValidHost(normalizedResolver);
}
const IsValidURL = function (url: string): boolean {
  return /^(http|https):\/\/[^ "]+$/.test(url);
};
function ValidateCronExpression(cronExp: string): { isValid: boolean; message: string } {
  // Check if expression is provided and is a string
  if (!cronExp || typeof cronExp !== "string") {
    return { isValid: false, message: "Cron expression must be a non-empty string" };
  }

  // Split the expression into its components
  const fields = cronExp.trim().split(/\s+/);

  // Standard cron should have 5 or 6 fields
  // minute hour day-of-month month day-of-week [year]
  if (fields.length < 5 || fields.length > 6) {
    return {
      isValid: false,
      message: "Cron expression must have 5 or 6 fields",
    };
  }

  // Define field constraints
  const fieldConstraints = [
    { name: "minute", min: 0, max: 59 },
    { name: "hour", min: 0, max: 23 },
    { name: "day", min: 1, max: 31 },
    { name: "month", min: 1, max: 12 },
    { name: "weekday", min: 0, max: 6 },
    { name: "year", min: 1970, max: 2099 }, // Optional field
  ];

  // Valid characters in cron expressions
  const validChars = /^[\d/*,\-]+$/;

  // Validate each field
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const constraint = fieldConstraints[i];

    // Check for valid characters
    if (!validChars.test(field)) {
      return {
        isValid: false,
        message: `Invalid characters in ${constraint.name} field`,
      };
    }

    // Handle special characters
    if (field === "*") {
      continue; // Asterisk is valid for all fields
    }

    // Handle lists (comma-separated values)
    if (field.includes(",")) {
      const values = field.split(",");
      for (const value of values) {
        if (!isValidRange(value, constraint.min, constraint.max)) {
          return {
            isValid: false,
            message: `Invalid value in ${constraint.name} field: ${value}`,
          };
        }
      }
      continue;
    }

    // Handle ranges (with hyphens)
    if (field.includes("-")) {
      const [start, end] = field.split("-").map(Number);
      if (start == null || end == null || start < constraint.min || end > constraint.max || start > end) {
        return {
          isValid: false,
          message: `Invalid range in ${constraint.name} field: ${field}`,
        };
      }
      continue;
    }

    // Handle steps (with forward slash)
    if (field.includes("/")) {
      const [range, step] = field.split("/");
      if (range !== "*" && !isValidRange(range, constraint.min, constraint.max)) {
        return {
          isValid: false,
          message: `Invalid range in ${constraint.name} field: ${range}`,
        };
      }
      if (!isValidRange(step, 1, constraint.max)) {
        return {
          isValid: false,
          message: `Invalid step value in ${constraint.name} field: ${step}`,
        };
      }
      continue;
    }

    // Handle plain numbers
    if (!isValidRange(field, constraint.min, constraint.max)) {
      return {
        isValid: false,
        message: `Invalid value in ${constraint.name} field: ${field}`,
      };
    }
  }

  return { isValid: true, message: "Valid cron expression" };
}

function isValidRange(value: string | number, min: number, max: number): boolean {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}
function IsValidPort(port: number | string): boolean {
  return isValidRange(port, 1, 65535);
}

export interface MonitorItem {
  id: number;
  tag: string;
  name: string;
  description: string | null;
  monitor_type: string | null;
  image: string | null;
  category_name: string | null;
  day_degraded_minimum_count: number | null;
  day_down_minimum_count: number | null;
  include_degraded_in_downtime: string;
  [key: string]: unknown;
}

function SortMonitor(monitorSort: number[] | undefined, resp: MonitorItem[]): MonitorItem[] {
  let monitors: MonitorItem[] = [];
  if (!!monitorSort && monitorSort.length > 0) {
    monitors = monitorSort
      .map((id: number) => resp.find((m: MonitorItem) => m.id == id))
      .filter((m): m is MonitorItem => !!m);
    //append any new monitors
    monitors = [...monitors, ...resp.filter((m: MonitorItem) => !monitorSort.includes(m.id))];
  } else {
    monitors = resp;
  }
  return monitors;
}
//js function to generate 32 character random string
function RandomString(length: number): string {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

interface GameItem {
  id: string;
  [key: string]: unknown;
}

/**
 * Retreive game's data from its id.
 * @param {string} id Id
 * @return Returns game's data if found, undefined instead.
 */
function GetGameFromId(list: GameItem[], id: string): GameItem | undefined {
  return list.find((game: GameItem) => game.id === id);
}
type StatusCounts = Pick<TimestampStatusCount, "countOfUp" | "countOfDown" | "countOfDegraded" | "countOfMaintenance">;

// Canonical Overall Status collapse: the worst state wins, and maintenance
// never masks an active problem. See docs/adr/0007-problem-first-overall-status.md.
function CollapseStatusCounts(counts: StatusCounts): StatusType {
  const total = counts.countOfUp + counts.countOfDown + counts.countOfDegraded + counts.countOfMaintenance;
  if (total === 0) return GC.NO_DATA;
  if (counts.countOfDown > 0) return GC.DOWN;
  if (counts.countOfDegraded > 0) return GC.DEGRADED;
  if (counts.countOfMaintenance > 0) return GC.MAINTENANCE;
  return GC.UP;
}

function GetStatusSummary(item: TimestampStatusCount): string {
  const total = item.countOfUp + item.countOfDown + item.countOfDegraded + item.countOfMaintenance;

  switch (CollapseStatusCounts(item)) {
    case GC.DOWN:
      return (item.countOfDown / total) * 100 >= 75
        ? PAGE_STATUS_MESSAGES.MAJOR_OUTAGE
        : PAGE_STATUS_MESSAGES.PARTIAL_OUTAGE;
    case GC.DEGRADED:
      return (item.countOfDegraded / total) * 100 >= 75
        ? PAGE_STATUS_MESSAGES.DEGRADED_PERFORMANCE
        : PAGE_STATUS_MESSAGES.PARTIAL_DEGRADED;
    case GC.MAINTENANCE:
      return PAGE_STATUS_MESSAGES.UNDER_MAINTENANCE;
    case GC.UP:
      return PAGE_STATUS_MESSAGES.ALL_OPERATIONAL;
    default:
      return PAGE_STATUS_MESSAGES.NO_DATA;
  }
}

function GetStatusColor(item: TimestampStatusCount): string {
  switch (CollapseStatusCounts(item)) {
    case GC.DOWN:
      return "text-down";
    case GC.DEGRADED:
      return "text-degraded";
    case GC.MAINTENANCE:
      return "text-maintenance";
    case GC.UP:
      return "text-up";
    default:
      return "text-muted-foreground";
  }
}

function GetStatusBgColor(item: TimestampStatusCount): string {
  let textColor = GetStatusColor(item);
  return textColor.replace("text-", "bg-");
}
// Get initials from monitor name for avatar fallback
function GetInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
export {
  AllRecordTypes,
  ValidateIpAddress,
  IsValidHost,
  IsValidNameServer,
  IsValidDnsResolver,
  IsValidURL,
  IsValidPort,
  CollapseStatusCounts,
  GetStatusSummary,
  GetStatusColor,
  GetStatusBgColor,
  FormatValue,
  IsCustomUnit,
  DayHasReading,
  ParseLatency,
  GetInitials,
};

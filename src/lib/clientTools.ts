import type { TimestampStatusCount } from "$lib/server/types/db";
import { PAGE_STATUS_MESSAGES } from "$lib/global-constants";

function ParseLatency(latencyMs: number): string {
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
function GetStatusSummary(item: TimestampStatusCount): string {
  const total = item.countOfUp + item.countOfDown + item.countOfDegraded + item.countOfMaintenance;
  if (total === 0) return PAGE_STATUS_MESSAGES.NO_DATA;

  const maintenancePercent = (item.countOfMaintenance / total) * 100;
  const downPercent = (item.countOfDown / total) * 100;
  const degradedPercent = (item.countOfDegraded / total) * 100;

  if (maintenancePercent > 0) {
    return PAGE_STATUS_MESSAGES.UNDER_MAINTENANCE;
  } else if (downPercent >= 75) {
    return PAGE_STATUS_MESSAGES.MAJOR_OUTAGE;
  } else if (downPercent >= 50) {
    return PAGE_STATUS_MESSAGES.PARTIAL_OUTAGE;
  } else if (item.countOfDown > 0) {
    return PAGE_STATUS_MESSAGES.PARTIAL_OUTAGE;
  } else if (degradedPercent >= 75) {
    return PAGE_STATUS_MESSAGES.DEGRADED_PERFORMANCE;
  } else if (degradedPercent >= 50) {
    return PAGE_STATUS_MESSAGES.PARTIAL_DEGRADED;
  } else if (item.countOfDegraded > 0) {
    return PAGE_STATUS_MESSAGES.PARTIAL_DEGRADED;
  } else if (item.countOfUp === total) {
    return PAGE_STATUS_MESSAGES.ALL_OPERATIONAL;
  }

  return PAGE_STATUS_MESSAGES.NO_DATA;
}

function GetStatusColor(item: TimestampStatusCount): string {
  const total = item.countOfUp + item.countOfDown + item.countOfDegraded + item.countOfMaintenance;
  if (total === 0) return "text-muted-foreground";

  const maintenancePercent = (item.countOfMaintenance / total) * 100;
  const downPercent = (item.countOfDown / total) * 100;

  if (maintenancePercent > 0) return "text-maintenance";
  if (downPercent > 0) return "text-down";
  if (item.countOfDegraded > 0) return "text-degraded";
  return "text-up";
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
  IsValidURL,
  IsValidPort,
  GetStatusSummary,
  GetStatusColor,
  GetStatusBgColor,
  ParseLatency,
  GetInitials,
};

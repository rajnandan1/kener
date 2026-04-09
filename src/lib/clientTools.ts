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

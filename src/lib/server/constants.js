// @ts-nocheck
// Define your constants
import dotenv from "dotenv";
dotenv.config();
const ENV = process.env.NODE_ENV;
const MONITOR = "./config/monitors.yaml";
const SITE = "./config/site.yaml";
const UP = "UP";
const DOWN = "DOWN";
const DEGRADED = "DEGRADED";
const NO_DATA = "NO_DATA";
const API_TIMEOUT = 10 * 1000; // 10 seconds
const AnalyticsProviders = {
  GA: "https://unpkg.com/@analytics/google-analytics@1.0.7/dist/@analytics/google-analytics.min.js",
  AMPLITUDE: "https://unpkg.com/@analytics/amplitude@0.1.3/dist/@analytics/amplitude.min.js",
  MIXPANEL: "https://unpkg.com/@analytics/mixpanel@0.4.0/dist/@analytics/mixpanel.min.js",
};
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
// Export the constants
const REALTIME = "realtime";
const TIMEOUT = "timeout";
const ERROR = "error";
const MANUAL = "manual";
const WEBHOOK = "webhook";
const DEFAULT_STATUS = "default_status";
const SIGNAL = "signal";
const INVITE_VERIFY_EMAIL = "invite_verify_email";

export {
  MONITOR,
  UP,
  DOWN,
  SITE,
  DEGRADED,
  API_TIMEOUT,
  ENV,
  AnalyticsProviders,
  AllRecordTypes,
  REALTIME,
  TIMEOUT,
  ERROR,
  MANUAL,
  NO_DATA,
  WEBHOOK,
  DEFAULT_STATUS,
  SIGNAL,
  INVITE_VERIFY_EMAIL,
};

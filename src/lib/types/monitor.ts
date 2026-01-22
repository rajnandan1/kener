// Shared domain types: safe to import from both server and client.

export type MonitorTag = string;

export type MonitorStatus = "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE" | "NO_DATA";

export const MONITOR_TYPES = [
  "API",
  "PING",
  "TCP",
  "DNS",
  "NONE",
  "GROUP",
  "SSL",
  "SQL",
  "HEARTBEAT",
  "GAMEDIG",
] as const;
export type MonitorType = (typeof MONITOR_TYPES)[number];

export interface Monitor {
  id: string;
  tag: MonitorTag;
  name: string;
  status: MonitorStatus;
  updatedAtUtc: number; // UTC seconds
}

export interface MonitorPublicView {
  tag: MonitorTag;
  name: string;
  status: MonitorStatus;
}

export interface DayWiseStatus {
  timestamp: number;
  date: string;
  degraded_percentage: number;
  down_percentage: number;
  status: "up" | "degraded" | "down";
  opacity: 1 | 2 | 3 | 4;
}

export interface NumberWithChange {
  currentNumber: number;
  previousNumber: number;
  change: number;
  changePercentage: number;
}

/**
 * Generic summary data for incidents/maintenances dashboard cards
 */
export interface IncidentTypeSummary {
  /** Current status: ongoing or no_ongoing */
  hasOngoing: boolean;
  /** Count of ongoing items */
  ongoingCount: number;
  /** Upcoming item timestamp (for maintenances), null otherwise */
  upcomingTimestamp: number | null;
  /** Last item timestamp or null if never */
  lastTimestamp: number | null;
  /** Raw numbers with change data */
  stats: NumberWithChange;
}

/**
 * Hourly uptime data for sparkbar charts
 */
export interface HourlyUptime {
  timestamp: number;
  uptime: number;
}

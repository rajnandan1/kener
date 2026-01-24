// Badge styles supported by badge-maker
export const BADGE_STYLES = ["flat", "plastic", "flat-square", "for-the-badge", "social"] as const;
export type BadgeStyle = (typeof BADGE_STYLES)[number];

// Status types
export type StatusType = "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE" | "NO_DATA";

// Incident states
export type IncidentState = "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";

// Page status messages for overall system status
export const PAGE_STATUS_MESSAGES = {
  UNDER_MAINTENANCE: "Under Maintenance",
  ALL_OPERATIONAL: "All Systems Operational",
  DEGRADED_PERFORMANCE: "Degraded Performance",
  PARTIAL_DEGRADED: "Partial Degraded Performance",
  PARTIAL_OUTAGE: "Partial System Outage",
  MAJOR_OUTAGE: "Major System Outage",
  NO_DATA: "No Status Available",
} as const;

// Helper to validate and get badge style
export function getBadgeStyle(style: string | null): BadgeStyle {
  if (style && BADGE_STYLES.includes(style as BadgeStyle)) {
    return style as BadgeStyle;
  }
  return "flat";
}

export default {
  UP: "UP",
  DOWN: "DOWN",
  DEGRADED: "DEGRADED",
  INCIDENT: "INCIDENT",
  MAINTENANCE: "MAINTENANCE",
  NO_DATA: "NO_DATA",
  REALTIME: "realtime",
  TIMEOUT: "timeout",
  ERROR: "error",
  MANUAL: "manual",
  WEBHOOK: "webhook",
  DEFAULT_STATUS: "default_status",
  SIGNAL: "signal",
  INVITE_VERIFY_EMAIL: "invite_verify_email",
  ERROR_NO_SETUP: "Set up not done yet. Create a user first.",
  INVESTIGATING: "INVESTIGATING",
  IDENTIFIED: "IDENTIFIED",
  MONITORING: "MONITORING",
  RESOLVED: "RESOLVED",
  YES: "YES",
  NO: "NO",
  TRIGGERED: "TRIGGERED",
  CRITICAL: "CRITICAL",
  CLOSED: "CLOSED",
  WARNING: "WARNING",
  defaultNumeratorStr: "up + maintenance + degraded",
  defaultDenominatorStr: "up + down + degraded + maintenance",
} as const;

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
  ALERT: "ALERT",
  REALTIME: "REALTIME",
  TIMEOUT: "TIMEOUT",
  ERROR: "ERROR",
  MANUAL: "MANUAL",
  WEBHOOK: "WEBHOOK",
  DEFAULT_STATUS: "DEFAULT",
  SIGNAL: "SIGNAL",
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
  DEFAULT_UP_COLOR: "#28a745",
  DEFAULT_DOWN_COLOR: "#dc3545",
  DEFAULT_DEGRADED_COLOR: "#ffc107",
  DEFAULT_MAINTENANCE_COLOR: "#17a2b8",
  ONGOING: "ONGOING",
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  READY: "READY",
  ACTIVE: "ACTIVE",
  STATUS: "STATUS",
  LATENCY: "LATENCY",
  UPTIME: "UPTIME",
  DOCS_URL: "https://kener.ing/docs",
  MAX_UPLOAD_BYTES: 2 * 1024 * 1024, // 2MB
  MAX_IMAGE_DIMENSION: 4096,
  MAX_INPUT_PIXELS: 4096 * 4096,
} as const;

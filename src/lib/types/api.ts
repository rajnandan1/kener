// Types for request/response payloads.
// Keep these decoupled from DB models (DTOs) so you can evolve DB without breaking the API.

import type { MonitorRecordTyped } from "$lib/server/types/db";
import type { MonitorPublicView } from "$lib/types/monitor";
import type GC from "$lib/global-constants";

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export type GetMonitorsResponse = ApiResponse<{ monitors: MonitorPublicView[] }>;

// Status API types
export interface StatusResponse {
  status: "OK";
}

// Unauthorized response
export interface UnauthorizedResponse {
  error: {
    code: string;
    message: string;
  };
}

// Site Data API types
export interface SiteDataItem {
  key: string;
  value: unknown;
  data_type: string;
}

export interface GetSiteDataResponse {
  site_data: SiteDataItem[];
}

export interface GetSiteDataKeyResponse {
  key: string;
  value: unknown;
  data_type: string;
}

export interface UpdateSiteDataKeyRequest {
  value: unknown;
}

export interface UpdateSiteDataKeyResponse {
  key: string;
  value: unknown;
  data_type: string;
}

export interface NotFoundResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface BadRequestResponse {
  error: {
    code: string;
    message: string;
  };
}

// Monitor API types
export interface MonitorSettings {
  uptime_formula_numerator?: string;
  uptime_formula_denominator?: string;
}

export interface MonitorTypeData {
  [key: string]: unknown;
}

export interface MonitorResponse {
  id: number;
  tag: string;
  name: string;
  description: string | null;
  image: string | null;
  cron: string | null;
  default_status: string | null;
  status: string | null;
  category_name: string | null;
  monitor_type: string;
  type_data: MonitorTypeData | null;
  include_degraded_in_downtime: string;
  is_hidden: string;
  confirmation_threshold?: number | null;
  monitor_settings_json: MonitorSettings | null;
  created_at: string;
  updated_at: string;
}

export interface GetMonitorsListResponse {
  monitors: MonitorRecordTyped[];
}

export interface GetMonitorResponse {
  monitor: MonitorRecordTyped;
}

export interface CreateMonitorRequest {
  tag: string;
  name: string;
  description?: string | null;
  image?: string | null;
  cron?: string | null;
  default_status?: string | null;
  status?: string | null;
  category_name?: string | null;
  monitor_type?: string | null;
  type_data?: MonitorTypeData | null;
  include_degraded_in_downtime?: string;
  is_hidden?: string;
  confirmation_threshold?: number | null;
  monitor_settings_json?: MonitorSettings | null;
  external_url?: string | null;
}

export interface CreateMonitorResponse {
  monitor: MonitorRecordTyped;
}

export interface UpdateMonitorRequest {
  name?: string;
  description?: string | null;
  image?: string | null;
  cron?: string | null;
  default_status?: string | null;
  status?: string | null;
  category_name?: string | null;
  monitor_type?: string | null;
  type_data?: MonitorTypeData | null;
  include_degraded_in_downtime?: string;
  is_hidden?: string;
  confirmation_threshold?: number | null;
  monitor_settings_json?: MonitorSettings | null;
  external_url?: string | null;
}

export interface UpdateMonitorResponse {
  monitor: MonitorRecordTyped;
}

export interface DeleteMonitorResponse {
  message: string;
}

// Monitoring Data API types
export interface MonitoringDataPoint {
  monitor_tag: string;
  timestamp: number;
  status: string | null;
  latency: number | null;
  type: string | null;
}

export interface GetMonitoringDataResponse {
  data: MonitoringDataPoint[];
}

export interface GetMonitoringDataPointResponse {
  data: MonitoringDataPoint;
}

export interface UpdateMonitoringDataRangeRequest {
  start_ts: number;
  end_ts: number;
  status: "UP" | "DOWN" | "DEGRADED";
  latency: number;
  deviation?: number;
}

export interface UpdateMonitoringDataRangeResponse {
  message: string;
  updated_count: number;
}

export interface UpdateMonitoringDataPointRequest {
  status?: "UP" | "DOWN" | "DEGRADED";
  latency?: number;
}

export interface UpdateMonitoringDataPointResponse {
  data: MonitoringDataPoint;
}

// Incident API types
export interface IncidentMonitor {
  monitor_tag: string;
  impact: string;
}

export interface IncidentResponse {
  id: number;
  title: string;
  start_date_time: number;
  end_date_time: number | null;
  state: string;
  incident_source: string;
  monitors: IncidentMonitor[];
  created_at: string;
  updated_at: string;
  /** Absolute URL of the public incident page */
  url: string;
}

export interface IncidentDetailResponse extends IncidentResponse {
  incident_type: string;
}

export interface GetIncidentsListResponse {
  incidents: IncidentResponse[];
}

export interface GetIncidentResponse {
  incident: IncidentDetailResponse;
}

export interface CreateIncidentRequest {
  title: string;
  start_date_time: number;
  end_date_time?: number | null;
  monitors?: IncidentMonitor[];
}

export interface CreateIncidentResponse {
  incident: IncidentDetailResponse;
}

export interface UpdateIncidentRequest {
  title?: string;
  start_date_time?: number;
  end_date_time?: number | null;
  monitors?: IncidentMonitor[];
}

export interface UpdateIncidentResponse {
  incident: IncidentDetailResponse;
}

export interface DeleteIncidentResponse {
  message: string;
}

// Incident Comment API types
export interface CommentResponse {
  id: number;
  incident_id: number;
  comment: string;
  timestamp: number;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface GetCommentsListResponse {
  comments: CommentResponse[];
}

export interface GetCommentResponse {
  comment: CommentResponse;
}

export interface CreateCommentRequest {
  comment: string;
  timestamp?: number;
  state: string;
}

export interface CreateCommentResponse {
  comment: CommentResponse;
}

export interface UpdateCommentRequest {
  comment?: string;
  timestamp?: number;
  state?: string;
}

export interface UpdateCommentResponse {
  comment: CommentResponse;
}

export interface DeleteCommentResponse {
  message: string;
}

// Maintenance API types
export interface MaintenanceMonitor {
  monitor_tag: string;
  impact: "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE";
}

export interface MaintenanceResponse {
  id: number;
  title: string;
  description: string | null;
  start_date_time: number;
  rrule: string;
  duration_seconds: number;
  status: "ACTIVE" | "INACTIVE";
  monitors: MaintenanceMonitor[];
  created_at: string;
  updated_at: string;
  /**
   * Absolute URL of the public page for this maintenance.
   * Note: the public /maintenances/<id> route is keyed by maintenance EVENT id
   * by default, so this URL carries ?type=maintenance. Link via this field,
   * never by concatenating `id` onto a path. See docs/adr/0002.
   */
  url: string;
}

export interface GetMaintenancesListResponse {
  maintenances: MaintenanceResponse[];
}

export interface GetMaintenanceResponse {
  maintenance: MaintenanceResponse;
}

export interface CreateMaintenanceRequest {
  title: string;
  description?: string | null;
  start_date_time: number;
  rrule: string;
  duration_seconds: number;
  monitors?: MaintenanceMonitor[];
}

export interface CreateMaintenanceResponse {
  maintenance: MaintenanceResponse;
}

export interface UpdateMaintenanceRequest {
  title?: string;
  description?: string | null;
  start_date_time?: number;
  rrule?: string;
  duration_seconds?: number;
  status?: "ACTIVE" | "INACTIVE";
  monitors?: MaintenanceMonitor[];
}

export interface UpdateMaintenanceResponse {
  maintenance: MaintenanceResponse;
}

// Maintenance Event API types
export interface MaintenanceEventResponse {
  id: number;
  maintenance_id: number;
  start_date_time: number;
  end_date_time: number;
  status: "SCHEDULED" | "READY" | "ONGOING" | "COMPLETED" | "CANCELLED";
  created_at: string;
  updated_at: string;
  /** Absolute URL of the public page for this maintenance event */
  url: string;
}

export interface GetMaintenanceEventsListResponse {
  events: MaintenanceEventResponse[];
  page: number;
  limit: number;
}

export interface GetMaintenanceEventResponse {
  event: MaintenanceEventResponse;
}

export interface UpdateMaintenanceEventRequest {
  /** Window edit mode: both times required. Cannot be combined with `status`. */
  start_date_time?: number;
  end_date_time?: number;
  /**
   * Transition mode: COMPLETED (from ONGOING) or CANCELLED (from SCHEDULED/READY/ONGOING).
   * Cannot be combined with time fields. Transitioning an ONGOING event moves its
   * end_date_time to the moment of the transition.
   */
  status?: "COMPLETED" | "CANCELLED";
}

export interface UpdateMaintenanceEventResponse {
  event: MaintenanceEventResponse;
}

export interface DeleteMaintenanceEventResponse {
  message: string;
}

export interface DeleteMaintenanceResponse {
  message: string;
}

// Combined Maintenance Event with Maintenance details
export interface MaintenanceEventDetailResponse {
  maintenance_id: number;
  event_id: number;
  event_start_date_time: number;
  event_end_date_time: number;
  event_status: "SCHEDULED" | "READY" | "ONGOING" | "COMPLETED" | "CANCELLED";
  maintenance_title: string;
  maintenance_description: string | null;
  maintenance_status: "ACTIVE" | "INACTIVE";
  maintenance_rrule: string;
  maintenance_duration_seconds: number;
  monitors: MaintenanceMonitor[];
  /** Absolute URL of the public page for this maintenance event */
  url: string;
}

export interface GetMaintenanceEventsDetailListResponse {
  events: MaintenanceEventDetailResponse[];
  page: number;
  limit: number;
  total: number;
}

// ============ Pages API Types ============

export interface PageSettingsIncidentsOngoing {
  show: boolean;
}

export interface PageSettingsIncidentsResolved {
  show: boolean;
  max_count: number;
  days_in_past: number;
}

export interface PageSettingsIncidents {
  enabled: boolean;
  ongoing: PageSettingsIncidentsOngoing;
  resolved: PageSettingsIncidentsResolved;
}

export interface PageSettingsMaintenancesPast {
  show: boolean;
  max_count: number;
  days_in_past: number;
}

export interface PageSettingsMaintenancesUpcoming {
  show: boolean;
  max_count: number;
  days_in_future: number;
}

export interface PageSettingsMaintenancesOngoing {
  show: boolean;
  past: PageSettingsMaintenancesPast;
  upcoming: PageSettingsMaintenancesUpcoming;
}

export interface PageSettingsMaintenances {
  enabled: boolean;
  ongoing: PageSettingsMaintenancesOngoing;
}

export interface PageSettingsHistoryDays {
  desktop: number;
  mobile: number;
}

/**
 * Recursive partial, so patch payloads can update any subset of nested fields.
 * Recursion applies only to plain object maps; arrays and other special object
 * types pass through unchanged.
 */
export type DeepPartial<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends Record<string, any> ? DeepPartial<T[K]> : T[K];
};

/**
 * Patch payload for page_settings: any subset of nested fields. Provided
 * fields are deep-merged into the current settings; omitted fields are left
 * untouched.
 */
export type PageSettingsPatch = DeepPartial<PageSettings>;

export type PageMonitorLayoutStyle = (typeof GC.MONITOR_LAYOUT_STYLES)[number];

export interface PageSettings {
  incidents: PageSettingsIncidents;
  include_maintenances: PageSettingsMaintenances;
  /** Days of status history shown on the page, per device class (1-365). */
  monitor_status_history_days: PageSettingsHistoryDays;
  monitor_layout_style: PageMonitorLayoutStyle;
  /** Per-page meta/social overrides; stored as camelCase keys internally. */
  meta_page_title?: string;
  meta_page_description?: string;
  social_page_preview_image?: string;
}

export interface PageMonitorResponse {
  monitor_tag: string;
}

export interface PageResponse {
  id: number;
  /**
   * The page's path segment. The home page (stored path is empty) renders as
   * the addressable token `~home`; its public URL is the site root.
   * See docs/adr/0004-home-page-api-token.md.
   */
  page_path: string;
  page_title: string;
  page_header: string;
  page_subheader: string | null;
  page_logo: string | null;
  page_settings: PageSettings;
  monitors: PageMonitorResponse[];
  created_at: string;
  updated_at: string;
}

export interface GetPagesListResponse {
  pages: PageResponse[];
}

export interface GetPageResponse {
  page: PageResponse;
}

export interface CreatePageRequest {
  page_path: string;
  page_title: string;
  page_header: string;
  page_subheader?: string | null;
  page_logo?: string | null;
  page_settings?: PageSettingsPatch;
  monitors?: string[];
}

export interface CreatePageResponse {
  page: PageResponse;
}

export interface UpdatePageRequest {
  page_path?: string;
  page_title?: string;
  page_header?: string;
  page_subheader?: string | null;
  page_logo?: string | null;
  page_settings?: PageSettingsPatch;
  monitors?: string[];
}

export interface UpdatePageResponse {
  page: PageResponse;
}

export interface DeletePageResponse {
  message: string;
}

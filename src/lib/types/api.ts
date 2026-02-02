// Types for request/response payloads.
// Keep these decoupled from DB models (DTOs) so you can evolve DB without breaking the API.

import type { MonitorPublicView } from "$lib/types/monitor";

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
  day_degraded_minimum_count: number | null;
  day_down_minimum_count: number | null;
  include_degraded_in_downtime: string;
  is_hidden: string;
  monitor_settings_json: MonitorSettings | null;
  created_at: string;
  updated_at: string;
}

export interface GetMonitorsListResponse {
  monitors: MonitorResponse[];
}

export interface GetMonitorResponse {
  monitor: MonitorResponse;
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
  day_degraded_minimum_count?: number | null;
  day_down_minimum_count?: number | null;
  include_degraded_in_downtime?: string;
  is_hidden?: string;
  monitor_settings_json?: MonitorSettings | null;
}

export interface CreateMonitorResponse {
  monitor: MonitorResponse;
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
  day_degraded_minimum_count?: number | null;
  day_down_minimum_count?: number | null;
  include_degraded_in_downtime?: string;
  is_hidden?: string;
  monitor_settings_json?: MonitorSettings | null;
}

export interface UpdateMonitorResponse {
  monitor: MonitorResponse;
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
}

export interface IncidentDetailResponse extends IncidentResponse {
  status: string;
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
  status: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  created_at: string;
  updated_at: string;
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
  start_date_time: number;
  end_date_time: number;
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
  event_status: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  maintenance_title: string;
  maintenance_description: string | null;
  maintenance_status: "ACTIVE" | "INACTIVE";
  maintenance_rrule: string;
  maintenance_duration_seconds: number;
  monitors: MaintenanceMonitor[];
}

export interface GetMaintenanceEventsDetailListResponse {
  events: MaintenanceEventDetailResponse[];
  page: number;
  limit: number;
  total: number;
}

// Server-only database types (based on migrations schema)
import type { Knex } from "knex";

// ============ monitoring_data table ============
export interface MonitoringData {
  monitor_tag: string;
  timestamp: number;
  status: string | null;
  latency: number | null;
  type: string | null;
  error_message?: string | null;
}

export interface MonitoringDataInsert {
  monitor_tag: string;
  timestamp: number;
  status: string;
  latency: number;
  type: string;
  error_message?: string | null;
}

export interface AggregatedMonitoringData {
  DEGRADED: number;
  UP: number;
  DOWN: number;
  avg_latency: number | null;
  max_latency: number | null;
  min_latency: number | null;
}

// ============ monitor_alerts table ============
export interface MonitorAlert {
  id: number;
  monitor_tag: string;
  monitor_status: string;
  alert_status: string;
  health_checks: number;
  incident_number: number;
  created_at: Date;
  updated_at: Date;
}

export interface MonitorAlertInsert {
  monitor_tag: string;
  monitor_status: string;
  alert_status: string;
  health_checks: number;
  config_id?: number;
}

// ============ site_data table ============
export interface SiteData {
  id: number;
  key: string;
  value: string;
  data_type: string;
  created_at: Date;
  updated_at: Date;
}

// ============ monitors table ============
export interface MonitorRecord {
  id: number;
  tag: string;
  name: string;
  description: string | null;
  image: string | null;
  cron: string | null;
  default_status: string;
  status: string | null;
  category_name: string | null;
  monitor_type: string;
  down_trigger?: string | null;
  degraded_trigger?: string | null;
  type_data?: string | null;
  external_url?: string | null;
  day_degraded_minimum_count?: number | null;
  day_down_minimum_count?: number | null;
  include_degraded_in_downtime?: string;
  is_hidden: string;
  monitor_settings_json: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface MonitorSettings {
  uptime_formula_numerator?: string;
  uptime_formula_denominator?: string;
}

export interface TimestampStatusCount {
  ts: number;
  countOfUp: number;
  countOfDown: number;
  countOfDegraded: number;
  countOfMaintenance: number;
  avgLatency: number;
}
export interface UptimeCalculatorResult {
  uptime: string;
  avgLatency: string;
}

export interface MonitorRecordTyped {
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
  down_trigger?: string | null;
  degraded_trigger?: string | null;
  type_data: Record<string, unknown> | null;
  day_degraded_minimum_count?: number | null;
  day_down_minimum_count?: number | null;
  include_degraded_in_downtime?: string;
  is_hidden: string;
  monitor_settings_json: MonitorSettings | null;
  created_at?: Date;
  updated_at?: Date;
  external_url?: string | null;
}

export interface MonitorRecordInsert {
  tag: string;
  name: string;
  description?: string | null;
  image?: string | null;
  cron?: string | null;
  default_status?: string | null;
  status?: string | null;
  category_name?: string | null;
  monitor_type?: string | null;
  down_trigger?: string | null;
  degraded_trigger?: string | null;
  type_data?: string | null;
  day_degraded_minimum_count?: number | null;
  day_down_minimum_count?: number | null;
  include_degraded_in_downtime?: string;
  is_hidden?: string;
  monitor_settings_json?: string | null;
  external_url?: string | null;
}

// ============ triggers table ============
export interface TriggerRecord {
  id: number;
  name: string;
  trigger_type: string | null;
  trigger_desc: string | null;
  trigger_status: string | null;
  trigger_meta: string;
  created_at: Date;
  updated_at: Date;
}

// Template JSON types for each template type
export interface EmailTemplateJson {
  email_subject: string;
  email_body: string; // HTML string
}

export interface WebhookTemplateJson {
  webhook_body: string; // JSON string
}

export interface SlackTemplateJson {
  slack_body: string; // JSON string
}

export interface DiscordTemplateJson {
  discord_body: string; // JSON string
}

export interface TriggerHeader {
  key: string;
  value: string;
}
export interface TriggerMeta extends EmailTemplateJson, WebhookTemplateJson, SlackTemplateJson, DiscordTemplateJson {
  url: string;
  headers: TriggerHeader[];
  to: string;
  from: string;
}

export interface TriggerRecordInsert {
  name: string;
  trigger_type?: string | null;
  trigger_desc?: string | null;
  trigger_status?: string | null;
  trigger_meta?: string | null;
}

// ============ general_email_templates table ============
export interface GeneralEmailTemplateRecord {
  template_id: string;
  template_subject: string | null;
  template_html_body: string | null;
  template_text_body: string | null;
}

export interface GeneralEmailTemplateRecordInsert {
  template_id: string;
  template_subject?: string | null;
  template_html_body?: string | null;
  template_text_body?: string | null;
}

// ============ users table ============
export interface UserRecord {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  is_active: number;
  is_verified: number;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserRecordInsert {
  email: string;
  name: string;
  password_hash: string;
  is_active?: number;
  is_verified?: number;
  role?: string;
}

export interface UserRecordPublic {
  id: number;
  email: string;
  name: string;
  is_active: number;
  is_verified: number;
  role: string;
  created_at: Date;
  updated_at: Date;
}

// ============ api_keys table ============
export interface ApiKeyRecord {
  id: number;
  name: string;
  hashed_key: string;
  masked_key: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKeyRecordInsert {
  name: string;
  hashed_key: string;
  masked_key: string;
  status?: string;
}

// ============ incidents table ============
export interface IncidentRecord {
  id: number;
  title: string;
  start_date_time: number;
  end_date_time: number | null;
  created_at: Date;
  updated_at: Date;
  status: string;
  state: string;
  incident_type: string;
  incident_source: string;
}

export interface IncidentMonitorImpact {
  monitor_tag: string;
  monitor_impact: string;
  monitor_name: string;
  monitor_image: string | null;
}

export interface IncidentForMonitorList {
  id: number;
  title: string;
  start_date_time: number;
  end_date_time: number | null;
  created_at: Date;
  updated_at: Date;
  status: string;
  monitors: IncidentMonitorImpact[];
}

export interface IncidentRecordInsert {
  title: string;
  start_date_time: number;
  end_date_time?: number | null;
  status?: string;
  state?: string;
  incident_type?: string;
  incident_source?: string;
}

// ============ incident_monitors table ============
export interface IncidentMonitorRecord {
  id: number;
  monitor_tag: string;
  monitor_impact: string | null;
  created_at: Date;
  updated_at: Date;
  incident_id: number;
}

export interface IncidentMonitorRecordInsert {
  monitor_tag: string;
  monitor_impact?: string | null;
  incident_id: number;
}

// ============ incident_comments table ============
export interface IncidentCommentRecord {
  id: number;
  comment: string;
  incident_id: number;
  commented_at: number;
  created_at: Date;
  updated_at: Date;
  status: string;
  state: string;
}

export interface IncidentCommentRecordInsert {
  comment: string;
  incident_id: number;
  commented_at: number;
  status?: string;
  state?: string;
}

// ============ invitations table ============
export interface InvitationRecord {
  id: number;
  invitation_token: string;
  invitation_type: string;
  invited_user_id: number | null;
  invited_by_user_id: number;
  invitation_meta: string | null;
  invitation_expiry: Date;
  invitation_status: string;
  created_at: Date;
  updated_at: Date;
}

export interface InvitationRecordInsert {
  invitation_token: string;
  invitation_type: string;
  invited_user_id?: number | null;
  invited_by_user_id: number;
  invitation_meta?: string | null;
  invitation_expiry: Date;
  invitation_status?: string;
}

// ============ Filter types ============
export interface IncidentFilter {
  status?: string;
  start?: number;
  end?: number;
  state?: string;
  id?: number;
  incident_type?: string;
  incident_source?: string;
}

export interface TriggerFilter {
  status?: string;
}

// ============ Count result ============
export interface CountResult {
  count: number | string;
}

// ============ images table ============
export interface ImageRecord {
  id: string;
  data: string; // base64 encoded image data
  mime_type: string;
  original_name: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ImageRecordInsert {
  id: string;
  data: string;
  mime_type: string;
  original_name?: string | null;
  width?: number | null;
  height?: number | null;
  size?: number | null;
}

// ============ pages table ============
export interface PageRecord {
  id: number;
  page_path: string;
  page_title: string;
  page_header: string;
  page_subheader: string | null;
  page_logo: string | null;
  page_settings_json: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PageRecordInsert {
  page_path: string;
  page_title: string;
  page_header: string;
  page_subheader?: string | null;
  page_logo?: string | null;
  page_settings_json?: string | null;
}

export interface PageSettingsType {
  incidents: {
    enabled: boolean;
    ongoing: {
      show: boolean;
    };
    resolved: {
      show: boolean;
      maxCount: number;
      daysInPast: number;
    };
  };
  include_maintenances: {
    enabled: boolean;
    ongoing: {
      show: boolean;
      past: {
        show: boolean;
        maxCount: number;
        daysInPast: number;
      };
      upcoming: {
        show: boolean;
        maxCount: number;
        daysInFuture: number;
      };
    };
  };
}

export interface PageRecordTyped {
  id: number;
  page_path: string;
  page_title: string;
  page_header: string;
  page_subheader: string | null;
  page_logo: string | null;
  page_settings: PageSettingsType | null;
  created_at: Date;
  updated_at: Date;
}

// ============ pages_monitors table ============
export interface PageMonitorRecord {
  page_id: number;
  monitor_tag: string;
  monitor_settings_json: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PageMonitorRecordInsert {
  page_id: number;
  monitor_tag: string;
  monitor_settings_json?: string | null;
}

export interface PageMonitorRecordTyped {
  page_id: number;
  monitor_tag: string;
  monitor_settings: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

// ============ Page Filter ============
export interface PageFilter {
  id?: number;
  page_path?: string;
}

// ============ maintenances table ============
// Uses iCalendar RRULE for scheduling
// Reference: http://www.kanzaki.com/docs/ical/rrule.html
export interface MaintenanceRecord {
  id: number;
  title: string;
  description: string | null;
  start_date_time: number; // Unix timestamp - when the first occurrence starts
  rrule: string; // iCalendar RRULE string (e.g., FREQ=WEEKLY;BYDAY=SU or FREQ=MINUTELY;COUNT=1)
  duration_seconds: number; // Duration of each maintenance window in seconds
  status: "ACTIVE" | "INACTIVE";
  created_at: Date;
  updated_at: Date;
}

export interface MaintenanceRecordInsert {
  title: string;
  description?: string | null;
  start_date_time: number;
  rrule: string;
  duration_seconds: number;
  status?: "ACTIVE" | "INACTIVE";
}

// ============ maintenance_monitors table ============
export interface MaintenanceMonitorRecord {
  id: number;
  maintenance_id: number;
  monitor_tag: string;
  monitor_impact: "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE";
  created_at: Date;
  updated_at: Date;
}

export interface MaintenanceMonitorDetailRecord {
  id: number;
  maintenance_id: number;
  monitor_tag: string;
  monitor_impact: "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE";
  monitor_name: string;
  monitor_image: string | null;
  monitor_description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MaintenanceMonitorDetailRecord {
  id: number;
  maintenance_id: number;
  monitor_tag: string;
  monitor_impact: "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE";
  monitor_name: string;
  monitor_image: string | null;
  monitor_description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MaintenanceMonitorRecordInsert {
  maintenance_id: number;
  monitor_tag: string;

  monitor_impact?: "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE";
}

// ============ maintenances_events table ============
export interface MaintenanceEventRecord {
  id: number;
  maintenance_id: number;
  start_date_time: number;
  end_date_time: number;
  status: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  created_at: Date;
  updated_at: Date;
}

export interface MaintenanceEventRecordDetailed {
  id: number;
  maintenance_id: number;
  start_date_time: number;
  end_date_time: number;
  status: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  created_at: Date;
  updated_at: Date;
  title: string;
  description: string | null;
}

export interface MaintenanceEventRecordInsert {
  maintenance_id: number;
  start_date_time: number;
  end_date_time: number;
  status?: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
}

// ============ Maintenance Filter ============
export interface MaintenanceFilter {
  id?: number;
  status?: "ACTIVE" | "INACTIVE";
}

export interface MaintenanceEventFilter {
  id?: number;
  maintenance_id?: number;
  status?: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
}

export interface MaintenanceMonitorImpact {
  monitor_tag: string;
  monitor_name: string;
  monitor_image: string | null;
  monitor_impact: string;
}

export interface MaintenanceEventsMonitorList {
  id: number;
  title: string;
  description: string | null;
  start_date_time: number; // Unix timestamp - when the first occurrence starts
  end_date_time: number; // Unix timestamp - when the first occurrence ends
  monitors: MaintenanceMonitorImpact[];
  created_at: Date;
  updated_at: Date;
}

// ============ monitor_alerts_config table ============
export type AlertForType = "STATUS" | "LATENCY" | "UPTIME";
export type AlertSeverityType = "CRITICAL" | "WARNING";
export type YesNoType = "YES" | "NO";

export interface MonitorAlertConfigRecord {
  id: number;
  monitor_tag: string;
  alert_for: AlertForType;
  alert_value: string;
  failure_threshold: number;
  success_threshold: number;
  alert_description: string | null;
  create_incident: YesNoType;
  is_active: YesNoType;
  severity: AlertSeverityType;
  created_at: Date;
  updated_at: Date;
}

export interface MonitorAlertConfigInsert {
  monitor_tag: string;
  alert_for: AlertForType;
  alert_value: string;
  failure_threshold: number;
  success_threshold: number;
  alert_description?: string | null;
  create_incident?: YesNoType;
  is_active?: YesNoType;
  severity?: AlertSeverityType;
}

export interface MonitorAlertConfigUpdate {
  alert_for?: AlertForType;
  alert_value?: string;
  failure_threshold?: number;
  success_threshold?: number;
  alert_description?: string | null;
  create_incident?: YesNoType;
  is_active?: YesNoType;
  severity?: AlertSeverityType;
}

export interface MonitorAlertConfigFilter {
  id?: number;
  monitor_tag?: string;
  alert_for?: AlertForType;
  is_active?: YesNoType;
}

// ============ monitor_alerts_config_triggers table ============
export interface MonitorAlertConfigTriggerRecord {
  monitor_alerts_id: number;
  trigger_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface MonitorAlertConfigTriggerInsert {
  monitor_alerts_id: number;
  trigger_id: number;
}

// ============ Composite types for monitor_alerts_config ============
export interface MonitorAlertConfigWithTriggers extends MonitorAlertConfigRecord {
  triggers: TriggerRecord[];
}

export interface MonitorAlertConfigCreateInput {
  monitor_tag: string;
  alert_for: AlertForType;
  alert_value: string;
  failure_threshold: number;
  success_threshold: number;
  alert_description?: string | null;
  create_incident?: YesNoType;
  is_active?: YesNoType;
  severity?: AlertSeverityType;
  trigger_ids?: number[];
}

export interface MonitorAlertConfigUpdateInput {
  id: number;
  alert_for?: AlertForType;
  alert_value?: string;
  failure_threshold?: number;
  success_threshold?: number;
  alert_description?: string | null;
  create_incident?: YesNoType;
  is_active?: YesNoType;
  severity?: AlertSeverityType;
  trigger_ids?: number[];
}

// ============ monitor_alerts_v2 table ============
export type MonitorAlertStatusType = "TRIGGERED" | "RESOLVED";

export interface MonitorAlertV2Record {
  id: number;
  config_id: number;
  incident_id: number | null;
  alert_status: MonitorAlertStatusType;
  created_at: Date;
  updated_at: Date;
}

export interface MonitorAlertV2Insert {
  config_id: number;
  incident_id?: number | null;
  alert_status: MonitorAlertStatusType;
}

export interface MonitorAlertV2Update {
  incident_id?: number | null;
  alert_status?: MonitorAlertStatusType;
}

export interface MonitorAlertV2Filter {
  id?: number;
  config_id?: number;
  incident_id?: number;
  alert_status?: MonitorAlertStatusType;
}

// Composite type with config details
export interface MonitorAlertV2WithConfig extends MonitorAlertV2Record {
  config: MonitorAlertConfigRecord;
}

// ============ subscription_config table ============
export interface SubscriptionEventsEnabled {
  incidentUpdatesAll: boolean;
  maintenanceUpdatesAll: boolean;
  monitorUpdatesAll: boolean;
}

export interface SubscriptionMethodsEnabled {
  email: boolean;
  webhook: boolean;
  slack: boolean;
  discord: boolean;
}

export interface SubscriptionMethodTriggers {
  email: number | null;
  webhook: number | null;
  slack: number | null;
  discord: number | null;
}

export interface SubscriptionConfigRecord {
  id: number;
  events_enabled: string;
  methods_enabled: string;
  method_triggers: string;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionConfigParsed {
  id: number;
  events_enabled: SubscriptionEventsEnabled;
  methods_enabled: SubscriptionMethodsEnabled;
  method_triggers: SubscriptionMethodTriggers;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionConfigUpdate {
  events_enabled?: string;
  methods_enabled?: string;
  method_triggers?: string;
}

// ============ New Subscription System (v2) ============

export type SubscriptionMethodType = "email";
export type SubscriptionEventType = "incidents" | "maintenances";
export type SubscriptionStatus = "ACTIVE" | "INACTIVE";
export type SubscriberUserStatus = "PENDING" | "ACTIVE" | "INACTIVE";

// ============ subscriber_users table ============
export interface SubscriberUserRecord {
  id: number;
  email: string;
  status: SubscriberUserStatus;
  verification_code: string | null;
  verification_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriberUserRecordInsert {
  email: string;
  status?: SubscriberUserStatus;
  verification_code?: string | null;
  verification_expires_at?: Date | null;
}

// ============ subscriber_methods table ============
export interface SubscriberMethodRecord {
  id: number;
  subscriber_user_id: number;
  method_type: SubscriptionMethodType;
  method_value: string;
  status: SubscriptionStatus;
  meta: string | null; // JSON for extra config
  created_at: Date;
  updated_at: Date;
}

export interface SubscriberMethodRecordInsert {
  subscriber_user_id: number;
  method_type: SubscriptionMethodType;
  method_value: string;
  status?: SubscriptionStatus;
  meta?: string | null;
}

// ============ user_subscriptions_v2 table ============
export interface UserSubscriptionV2Record {
  id: number;
  subscriber_user_id: number;
  subscriber_method_id: number;
  event_type: SubscriptionEventType;

  status: SubscriptionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface UserSubscriptionV2RecordInsert {
  subscriber_user_id: number;
  subscriber_method_id: number;
  event_type: SubscriptionEventType;

  status?: SubscriptionStatus;
}

export interface UserSubscriptionV2Filter {
  subscriber_user_id?: number;
  subscriber_method_id?: number;
  event_type?: SubscriptionEventType;

  status?: SubscriptionStatus;
}

// ============ Old types (kept for compatibility) ============

export interface UserSubscriptionRecord {
  id: number;
  subscriber_id: number;
  subscription_method: SubscriptionMethodType;
  event_type: SubscriptionEventType;

  status: SubscriptionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface UserSubscriptionRecordInsert {
  subscriber_id: number;
  subscription_method: SubscriptionMethodType;
  event_type: SubscriptionEventType;

  status?: SubscriptionStatus;
}

export interface UserSubscriptionFilter {
  subscriber_id?: number;
  subscription_method?: SubscriptionMethodType;
  event_type?: SubscriptionEventType;

  status?: SubscriptionStatus;
}

// Aggregated view for admin
export interface SubscriberSummary {
  id: number;
  subscriber_send: string;
  subscriber_type: string;
  subscriber_status: string;
  created_at: Date;
  subscription_count: number;
  event_types: SubscriptionEventType[];
}

// Template JSON types for each template type
export interface EmailTemplateJson {
  email_subject: string;
  email_body: string; // HTML string
}

export interface WebhookTemplateJson {
  webhook_body: string; // JSON string
}

export interface SlackTemplateJson {
  slack_body: string; // JSON string
}

export interface DiscordTemplateJson {
  discord_body: string; // JSON string
}

export interface TriggerHeader {
  key: string;
  value: string;
}
export interface TriggerMeta extends EmailTemplateJson, WebhookTemplateJson, SlackTemplateJson, DiscordTemplateJson {
  url: string;
  headers: TriggerHeader[];
  to: string;
  from: string;
}

export interface SubscriptionsConfig {
  enable: boolean;
  methods: {
    emails: {
      incidents: boolean;
      maintenances: boolean;
    };
  };
}

export interface AlertVariableMap {
  alert_id: string;
  alert_name: string;
  alert_for: string;
  alert_value: string;
  alert_status: string;
  alert_severity: string;
  alert_message: string;
  alert_source: string;
  alert_timestamp: string;
  alert_cta_url: string;
  alert_cta_text: string;
  alert_incident_id?: string;
  alert_failure_threshold: number;
  alert_success_threshold: number;
  is_resolved: boolean;
  is_triggered: boolean;
}
export interface SiteDataForNotification {
  site_url: string;
  site_name: string;
  site_logo_url: string;
  colors_up: string;
  colors_down: string;
  colors_degraded: string;
  colors_maintenance: string;
}
export interface SubscriptionVariableMap {
  title: string;
  cta_url: string;
  cta_text: string;
  update_text: string;
  update_subject: string;
}

export interface EmailCodeVariableMap {
  email_code: string;
  email_subject: string;
  action: string;
}

export interface SMTPConfiguration {
  smtp_host: string;
  smtp_port?: string | number;
  smtp_secure?: boolean;
  smtp_user: string;
  smtp_pass: string;
  smtp_sender: string;
}
export interface WebhookConfiguration {
  url: string;
  headers: Record<string, string>;
}

export interface ResendAPIConfiguration {
  resend_api_key: string;
  resend_sender_email: string;
}

export type TemplateVariableMap = SubscriptionVariableMap | AlertVariableMap | EmailCodeVariableMap;

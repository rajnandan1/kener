import type { MonitorAlertConfigRecord, MonitorAlertV2Record, TriggerMetaEmailJson } from "../types/db";
import type {
  AlertVariableMap,
  ResendAPIConfiguration,
  SiteDataForNotification,
  SMTPConfiguration,
  TemplateVariableMap,
} from "./types.js";
import GC from "../../global-constants.js";
import type { SiteDataTransformed } from "../controllers/siteDataController.js";
import { GetSMTPFromENV } from "../controllers/controller.js";

export function alertToVariables(config: MonitorAlertConfigRecord, alert: MonitorAlertV2Record): AlertVariableMap {
  // Ensure created_at is a Date object
  const createdAtDate = alert.created_at instanceof Date ? alert.created_at : new Date(alert.created_at);
  const alert_name = `Alert ${config.monitor_tag} for ${config.alert_for} ${config.alert_value} ${alert.alert_status} at ${createdAtDate.toISOString()}`;

  return {
    alert_id: String(alert.id),
    alert_name: alert_name,
    alert_for: config.alert_for,
    alert_value: config.alert_value,
    alert_status: alert.alert_status,
    alert_severity: config.severity,
    alert_message: config.alert_description || "",
    alert_source: "ALERT",
    alert_timestamp: createdAtDate.toISOString(),
    alert_cta_url: "https://kener.ing/docs/home",
    alert_cta_text: "View Documentation",
    alert_incident_id: alert.incident_id ? String(alert.incident_id) : undefined,
    alert_failure_threshold: config.failure_threshold,
    alert_success_threshold: config.success_threshold,
    is_resolved: alert.alert_status === GC.RESOLVED,
    is_triggered: alert.alert_status === GC.TRIGGERED,
  };
}

export function siteDataToVariables(siteData: SiteDataTransformed): SiteDataForNotification {
  return {
    site_url: siteData.siteURL || "",
    site_name: siteData.siteName || "",
    site_logo_url: siteData.logo || "",
    colors_up: siteData.colors.UP,
    colors_down: siteData.colors.DOWN,
    colors_degraded: siteData.colors.DEGRADED,
    colors_maintenance: siteData.colors.MAINTENANCE,
  };
}

//return SMTPConfiguration or ResendAPIConfiguration given TriggerMetaEmailJson
export function getEmailConfigFromTriggerMeta(
  triggerMeta: TriggerMetaEmailJson,
): SMTPConfiguration | ResendAPIConfiguration {
  if (triggerMeta.email_type.toUpperCase() === "SMTP") {
    return {
      smtp_host: triggerMeta.smtp_host || "",
      smtp_port: Number(triggerMeta.smtp_port) || 587,
      smtp_secure: triggerMeta.smtp_secure,
      smtp_user: triggerMeta.smtp_user || "",
      smtp_pass: triggerMeta.smtp_pass || "",
      smtp_sender: triggerMeta.from || "",
    };
  } else {
    return {
      resend_api_key: process.env.RESEND_API_KEY || "",
      resend_sender_email: triggerMeta.from || "",
    };
  }
}

//get preferred email type from environment variable or default to SMTP

export function getPreferredEmailConfiguration(): SMTPConfiguration | ResendAPIConfiguration {
  let smtpData = GetSMTPFromENV();
  if (smtpData) {
    return {
      smtp_host: smtpData.smtp_host,
      smtp_port: smtpData.smtp_port,
      smtp_secure: smtpData.smtp_secure,
      smtp_user: smtpData.smtp_user,
      smtp_pass: smtpData.smtp_pass,
      smtp_sender: smtpData.smtp_from_email,
    };
  } else {
    return {
      resend_api_key: process.env.RESEND_API_KEY || "",
      resend_sender_email: process.env.RESEND_SENDER_EMAIL || "",
    };
  }
}

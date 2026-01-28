import type { MonitorAlertConfigRecord, MonitorAlertV2Record } from "../types/db";
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

export interface SiteDataForNotification {
  siteURL: string;
  siteName: string;
  logo: string;
  colors: {
    UP: string;
    DOWN: string;
    DEGRADED: string;
    MAINTENANCE: string;
  };
}

export interface AlertAction {
  text: string;
  url: string;
}

export interface AlertData {
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
  site_name: string;
  site_logo_url: string;
  site_url: string;
  is_resolved: boolean;
  is_triggered: boolean;
}

export default function variables(siteData: SiteDataForNotification, data: AlertData): AlertView {
  let siteURL = siteData.siteURL;
  let siteName = siteData.siteName;
  if (siteURL.endsWith("/")) {
    siteURL = siteURL.slice(0, -1);
  }

  if (!siteData.logo.startsWith("http")) {
    siteData.logo = `${siteURL}${!!process.env.KENER_BASE_PATH ? process.env.KENER_BASE_PATH : ""}${siteData.logo}`;
  }
  let view = {
    site_name: siteName,
    logo_url: siteData.logo,
    site_url: siteURL,
    alert_name: data.alert_name,
    status: data.status,
    is_resolved: data.status === "RESOLVED",
    is_triggered: data.status === "TRIGGERED",
    description: data.description,
    action_text: data.actions[0].text,
    action_url: data.actions[0].url,
    metric: data.details.metric,
    severity: data.severity,
    id: data.id,
    current_value: data.details.current_value,
    threshold: data.details.threshold,
    source: data.source,
    timestamp: data.timestamp,
  };

  return view;
}

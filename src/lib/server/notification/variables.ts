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
  id: string;
  alert_name: string;
  status: string;
  severity: string;
  description: string;
  source: string;
  timestamp: string;
  actions: AlertAction[];
  details: {
    metric: string;
    current_value: number;
    threshold: number;
  };
}

export interface AlertView {
  site_name: string;
  logo_url: string;
  site_url: string;
  alert_name: string;
  status: string;
  is_resolved: boolean;
  is_triggered: boolean;
  description: string;
  action_text: string;
  action_url: string;
  metric: string;
  severity: string;
  id: string;
  current_value: number;
  threshold: number;
  source: string;
  timestamp: string;
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

import { describe, expect, it } from "vitest";
import Mustache from "mustache";
import { alertToVariables } from "./notification_utils.js";
import emailTemplate from "../templates/email_alert_template.js";
import type { MonitorAlertConfigRecord, MonitorAlertV2Record } from "../types/db";
import type { SiteDataForNotification } from "./types.js";

const config: MonitorAlertConfigRecord = {
  id: 1,
  monitor_tag: "config-tag",
  alert_for: "STATUS",
  alert_value: "DOWN",
  failure_threshold: 1,
  success_threshold: 1,
  alert_description: "desc",
  create_incident: "NO",
  is_active: "YES",
  severity: "WARNING",
  created_at: new Date("2026-09-02T13:26:00.514Z"),
  updated_at: new Date("2026-09-02T13:26:00.514Z"),
};

const alert: MonitorAlertV2Record = {
  id: 7,
  config_id: 1,
  monitor_tag: null,
  incident_id: null,
  alert_status: "TRIGGERED",
  created_at: new Date("2026-09-02T13:26:00.514Z"),
  updated_at: new Date("2026-09-02T13:26:00.514Z"),
};

const site: SiteDataForNotification = {
  site_url: "https://status.example.com/",
  site_name: "Example",
  site_logo_url: "",
  colors_up: "",
  colors_down: "",
  colors_degraded: "",
  colors_maintenance: "",
};

describe("alertToVariables", () => {
  it("alert_name is only the monitor tag (#830)", () => {
    expect(alertToVariables(config, alert, site, "my-api").alert_name).toBe("my-api");
  });

  it("falls back to the config monitor tag, then 'unknown'", () => {
    expect(alertToVariables(config, alert, site).alert_name).toBe("config-tag");
    expect(alertToVariables({ ...config, monitor_tag: null }, alert, site).alert_name).toBe("unknown");
  });

  it("default email subject still renders the full headline", () => {
    const vars = alertToVariables(config, alert, site, "my-api");
    expect(Mustache.render(emailTemplate.email_subject, { ...vars, ...site })).toBe(
      "Alert my-api for STATUS DOWN TRIGGERED at 2026-09-02T13:26:00.514Z",
    );
  });
});

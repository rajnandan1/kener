import { describe, expect, it } from "vitest";
import Mustache from "mustache";
import { alertToVariables } from "./notification_utils.js";
import emailTemplate from "../templates/email_alert_template.js";
import discordTemplate from "../templates/discord_alert_template.js";
import slackTemplate from "../templates/slack_alert_template.js";
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

// What the old alert_name used to be; the default templates must still render it.
const HEADLINE = "Alert my-api for STATUS DOWN TRIGGERED at 2026-09-02T13:26:00.514Z";
// JSON templates are rendered without HTML escaping, same as the senders do.
const raw = { escape: (text: string) => text };

describe("alertToVariables", () => {
  it("alert_name is only the monitor tag (#830)", () => {
    expect(alertToVariables(config, alert, site, "my-api").alert_name).toBe("my-api");
  });

  it("falls back to the config monitor tag, then 'unknown'", () => {
    expect(alertToVariables(config, alert, site).alert_name).toBe("config-tag");
    expect(alertToVariables({ ...config, monitor_tag: null }, alert, site).alert_name).toBe("unknown");
  });

  it("every default template still renders the full headline", () => {
    const vars = { ...alertToVariables(config, alert, site, "my-api"), ...site };

    expect(Mustache.render(emailTemplate.email_subject, vars)).toBe(HEADLINE);
    expect(Mustache.render(emailTemplate.email_body, vars)).toContain(`<h1 class="alert-title">${HEADLINE}</h1>`);

    const discord = JSON.parse(Mustache.render(discordTemplate.discord_body, vars, {}, raw));
    expect(discord.embeds[0].title).toBe(HEADLINE);

    // The Slack template carries raw newlines inside strings, so compare the rendered text, not parsed JSON.
    expect(Mustache.render(slackTemplate.slack_body, vars, {}, raw)).toContain(`"text": "*${HEADLINE}*"`);
  });
});

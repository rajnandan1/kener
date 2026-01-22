import variables, { type SiteDataForNotification, type AlertData } from "./variables.js";
import { SlackJSONTemplate } from "../../anywhere.js";
import Mustache from "mustache";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import version from "../../version.js";
import type { TriggerRecord, MonitorRecord } from "../types/db.js";

interface SlackTriggerMeta {
  has_slack_body?: boolean;
  slack_body?: string;
}

class Slack {
  url: string;
  headers: Record<string, string>;
  method: string;
  siteData: SiteDataForNotification;
  monitorData: MonitorRecord | undefined;
  trigger_meta: SlackTriggerMeta;

  constructor(
    url: string,
    siteData: SiteDataForNotification,
    trigger_meta: SlackTriggerMeta,
    monitorData?: MonitorRecord,
  ) {
    const kenerHeader = {
      "Content-Type": "application/json",
      "User-Agent": `Kener/${version()}`,
    };

    this.url = url;
    this.headers = Object.assign(kenerHeader, {});
    this.method = "POST";
    this.siteData = siteData;
    this.monitorData = monitorData;
    this.trigger_meta = trigger_meta;

    if (!!this.trigger_meta.has_slack_body && !!this.trigger_meta.slack_body) {
      let envSecrets = GetRequiredSecrets(this.trigger_meta.slack_body);
      for (let i = 0; i < envSecrets.length; i++) {
        const secret = envSecrets[i];
        if (secret.replace !== undefined && this.trigger_meta.slack_body) {
          this.trigger_meta.slack_body = ReplaceAllOccurrences(
            this.trigger_meta.slack_body,
            secret.find,
            secret.replace,
          );
        }
      }
    }
  }

  transformData(alert: AlertData): string {
    let view = variables(this.siteData, alert);

    let slackTemplate = SlackJSONTemplate;
    if (!!this.trigger_meta.has_slack_body && !!this.trigger_meta.slack_body) {
      slackTemplate = this.trigger_meta.slack_body;
    }
    return Mustache.render(slackTemplate, view);
  }

  async send(data: AlertData): Promise<Response | { error: string }> {
    try {
      const response = await fetch(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.transformData(data),
      });
      if (!response.ok) {
        throw new Error(`Error from slack`);
      }
      return response;
    } catch (error: unknown) {
      console.error("Error sending webhook", error);
      return { error: (error as Error).message };
    }
  }
}

export default Slack;

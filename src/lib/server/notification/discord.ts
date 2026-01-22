import Mustache from "mustache";
import { DiscordJSONTemplate } from "../../anywhere.js";
import variables, { type SiteDataForNotification, type AlertData } from "./variables.js";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import version from "../../version.js";
import type { TriggerRecord, MonitorRecord } from "../types/db.js";

interface DiscordTriggerMeta {
  has_discord_body?: boolean;
  discord_body?: string;
}

class Discord {
  url: string;
  headers: Record<string, string>;
  method: string;
  siteData: SiteDataForNotification;
  monitorData: MonitorRecord | undefined;
  trigger_meta: DiscordTriggerMeta;

  constructor(
    url: string,
    siteData: SiteDataForNotification,
    trigger_meta: DiscordTriggerMeta,
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

    if (!!this.trigger_meta.has_discord_body && !!this.trigger_meta.discord_body) {
      let envSecrets = GetRequiredSecrets(this.trigger_meta.discord_body);
      for (let i = 0; i < envSecrets.length; i++) {
        const secret = envSecrets[i];
        if (secret.replace !== undefined && this.trigger_meta.discord_body) {
          this.trigger_meta.discord_body = ReplaceAllOccurrences(
            this.trigger_meta.discord_body,
            secret.find,
            secret.replace,
          );
        }
      }
    }
  }

  transformData(data: AlertData): string {
    let view = variables(this.siteData, data);

    let discordTemplate = DiscordJSONTemplate;
    if (!!this.trigger_meta.has_discord_body && !!this.trigger_meta.discord_body) {
      discordTemplate = this.trigger_meta.discord_body;
    }
    return Mustache.render(discordTemplate, view);
  }

  async send(data: AlertData): Promise<Response | { error: string }> {
    try {
      const toSend = this.transformData(data);

      const response = await fetch(this.url, {
        method: this.method,
        headers: this.headers,
        body: toSend,
      });
      if (!response.ok) {
        throw new Error(`Error from discord`);
      }
      return response;
    } catch (error: unknown) {
      console.error("Error sending webhook", error);
      return { error: (error as Error).message };
    }
  }
}

export default Discord;

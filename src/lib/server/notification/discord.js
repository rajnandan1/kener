// @ts-nocheck
import Mustache from "mustache";
import { DiscordJSONTemplate } from "../../anywhere.js";
import variables from "./variables.js";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import version from "../../version.js";

class Discord {
  url;
  headers;
  method;
  siteData;
  monitorData;
  trigger_meta;

  constructor(url, siteData, monitorData, trigger_meta) {
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
        this.trigger_meta.discord_body = ReplaceAllOccurrences(
          this.trigger_meta.discord_body,
          secret.find,
          secret.replace,
        );
      }
    }
  }

  transformData(data) {
    let view = variables(this.siteData, data);

    let discordTemplate = DiscordJSONTemplate;
    if (!!this.trigger_meta.has_discord_body && !!this.trigger_meta.discord_body) {
      discordTemplate = this.trigger_meta.discord_body;
    }
    return Mustache.render(discordTemplate, view);
  }

  async send(data) {
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
    } catch (error) {
      console.error("Error sending webhook", error);
      return error;
    }
  }
}

export default Discord;

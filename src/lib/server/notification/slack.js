// @ts-nocheck
import variables from "./variables.js";
import { SlackJSONTemplate } from "../../anywhere.js";
import Mustache from "mustache";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import version from "../../version.js";

class Slack {
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

    if (!!this.trigger_meta.has_slack_body && !!this.trigger_meta.slack_body) {
      let envSecrets = GetRequiredSecrets(this.trigger_meta.slack_body);
      for (let i = 0; i < envSecrets.length; i++) {
        const secret = envSecrets[i];
        this.trigger_meta.slack_body = ReplaceAllOccurrences(this.trigger_meta.slack_body, secret.find, secret.replace);
      }
    }
  }

  transformData(alert) {
    let view = variables(this.siteData, alert);

    let slackTemplate = SlackJSONTemplate;
    if (!!this.trigger_meta.has_slack_body && !!this.trigger_meta.slack_body) {
      slackTemplate = this.trigger_meta.slack_body;
    }
    return Mustache.render(slackTemplate, view);
  }

  async send(data) {
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
    } catch (error) {
      console.error("Error sending webhook", error);
      return error;
    }
  }
}

export default Slack;

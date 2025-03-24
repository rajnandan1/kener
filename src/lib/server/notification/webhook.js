// @ts-nocheck

import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import Mustache from "mustache";
import { WebhookJSONTemplate } from "../../anywhere.js";
import variables from "./variables.js";
import version from "../../version.js";

class Webhook {
  url;
  headers;
  method;
  siteData;
  monitorData;
  trigger_meta;

  constructor(trigger_meta, method, siteData, monitorData) {
    const kenerHeader = {
      "Content-Type": "application/json",
      "User-Agent": `Kener/${version()}`,
    };
    let headers = trigger_meta.headers;
    this.trigger_meta = trigger_meta;
    this.url = trigger_meta.url;
    this.headers = kenerHeader;
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      this.headers[header.key] = header.value;
    }
    this.method = "POST";
    this.siteData = siteData;
    this.monitorData = monitorData;

    let envSecrets = GetRequiredSecrets(
      `${this.url} ${JSON.stringify(this.headers)} ${JSON.stringify(this.trigger_meta.webhook_body)}`,
    );
    //replace secrets in url and headers

    for (let i = 0; i < envSecrets.length; i++) {
      const secret = envSecrets[i];
      this.url = ReplaceAllOccurrences(this.url, secret.find, secret.replace);
      this.headers = JSON.parse(ReplaceAllOccurrences(JSON.stringify(this.headers), secret.find, secret.replace));
    }

    if (!!this.trigger_meta.has_webhook_body && !!this.trigger_meta.webhook_body) {
      envSecrets = GetRequiredSecrets(this.trigger_meta.webhook_body);
      for (let i = 0; i < envSecrets.length; i++) {
        const secret = envSecrets[i];
        this.trigger_meta.webhook_body = ReplaceAllOccurrences(
          this.trigger_meta.webhook_body,
          secret.find,
          secret.replace,
        );
      }
    }
  }

  transformData(data) {
    let view = variables(this.siteData, data);

    if (!!!this.trigger_meta.has_webhook_body || !!!this.trigger_meta.webhook_body) {
      return Mustache.render(WebhookJSONTemplate, view);
    }

    //have to keep this for backward compatibility
    let body = this.trigger_meta.webhook_body;
    body = ReplaceAllOccurrences(body, "${id}", data.id);
    body = ReplaceAllOccurrences(body, "${alert_name}", data.alert_name);
    body = ReplaceAllOccurrences(body, "${severity}", data.severity);
    body = ReplaceAllOccurrences(body, "${status}", data.status);
    body = ReplaceAllOccurrences(body, "${source}", data.source);
    body = ReplaceAllOccurrences(body, "${timestamp}", data.timestamp);
    body = ReplaceAllOccurrences(body, "${description}", data.description);
    body = ReplaceAllOccurrences(body, "${metric}", data.details.metric);
    body = ReplaceAllOccurrences(body, "${current_value}", data.details.current_value);
    body = ReplaceAllOccurrences(body, "${threshold}", data.details.threshold);
    body = ReplaceAllOccurrences(body, "${action_text}", data.actions[0].text);
    body = ReplaceAllOccurrences(body, "${action_url}", data.actions[0].url);
    //have to keep this for backward compatibility

    return Mustache.render(body, view);
  }

  type() {
    return "webhook";
  }

  async send(data) {
    try {
      const response = await fetch(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.transformData(data),
      });
      if (!response.ok) {
        throw new Error(`Error from webhook`);
      }
      return response;
    } catch (error) {
      console.error("Error sending webhook", error);
      return error;
    }
  }
}

export default Webhook;

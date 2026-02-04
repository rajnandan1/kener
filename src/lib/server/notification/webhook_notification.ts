import type { WebhookTemplateJson } from "../types/db";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import Mustache from "mustache";
import type { SiteDataForNotification, TemplateVariableMap } from "./types.js";

export default async function send(
  webhookBody: string,
  variables: Record<string, string | number | boolean>,
  webhookURL: string,
  headers?: string,
) {
  // Process trigger meta for environment secrets
  let envSecrets = GetRequiredSecrets(webhookBody + headers);

  for (let i = 0; i < envSecrets.length; i++) {
    const secret = envSecrets[i];
    if (secret.replace !== undefined) {
      webhookBody = ReplaceAllOccurrences(webhookBody, secret.find, secret.replace);
      if (headers) {
        headers = ReplaceAllOccurrences(headers, secret.find, secret.replace);
      }
    }
  }

  const defaultHeaders = [{ key: "user-agent", value: "Kener/4.0.0" }];

  try {
    if (headers) {
      const parsedHeaders: Array<{ key: string; value: string }> = JSON.parse(headers);
      for (const header of parsedHeaders) {
        //if key exist in defaultHeaders, replace the value
        const existingHeader = defaultHeaders.find((h) => h.key.toLowerCase() === header.key.toLowerCase());
        if (existingHeader) {
          existingHeader.value = header.value;
        } else {
          defaultHeaders.push(header);
        }
      }
    }
  } catch (e) {
    console.log(e);
  }

  let webhookBodyJson = JSON.parse(webhookBody) as WebhookTemplateJson;

  // Render the webhook body with Mustache (disable HTML escaping for JSON/plain text)
  const renderedBody = Mustache.render(webhookBodyJson.webhook_body, { ...variables }, {}, { escape: (text) => text });

  // Build headers object
  const headersObj: Record<string, string> = {
    "Content-Type": "application/json",
  };

  for (const header of defaultHeaders) {
    if (header.key && header.value) {
      headersObj[header.key] = header.value;
    }
  }

  try {
    const response = await fetch(webhookURL, {
      method: "POST",
      headers: headersObj,
      body: renderedBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Webhook request failed with status ${response.status}: ${errorText}`);
      return { error: `Webhook request failed with status ${response.status}`, details: errorText };
    }

    const responseData = await response.text();
    return { success: true, status: response.status, data: responseData };
  } catch (error) {
    console.error("Error sending webhook", error);
    return { error: "Error sending webhook", details: error };
  }
}

import type { WebhookTemplateJson } from "../types/db";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import Mustache from "mustache";
import type { SiteDataForNotification, TemplateVariableMap } from "./types.js";

export default async function send(
  discordBody: string,
  variables: Record<string, string | number | boolean>,
  discordURL: string,
) {
  // Process trigger meta for environment secrets
  let envSecrets = GetRequiredSecrets(discordBody + discordURL);

  for (let i = 0; i < envSecrets.length; i++) {
    const secret = envSecrets[i];
    if (secret.replace !== undefined) {
      discordBody = ReplaceAllOccurrences(discordBody, secret.find, secret.replace);
      discordURL = ReplaceAllOccurrences(discordURL, secret.find, secret.replace);
    }
  }

  const defaultHeaders = [
    { key: "user-agent", value: "Kener/4.0.0" },
    { key: "accept", value: "application/json" },
    { key: "content-type", value: "application/json" },
  ];

  // Render the webhook body with Mustache (disable HTML escaping for JSON/plain text)
  const renderedBody = Mustache.render(discordBody, { ...variables }, {}, { escape: (text) => text });

  // Build headers object
  const headersObj: Record<string, string> = {};

  for (const header of defaultHeaders) {
    if (header.key && header.value) {
      headersObj[header.key] = header.value;
    }
  }

  try {
    const response = await fetch(discordURL, {
      method: "POST",
      headers: headersObj,
      body: renderedBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Discord webhook request failed with status ${response.status}: ${errorText}`);
      return { error: `Discord webhook request failed with status ${response.status}`, details: errorText };
    }

    const responseData = await response.text();
    return { success: true, status: response.status, data: responseData };
  } catch (error) {
    console.error("Error sending Discord notification", error);
    return { error: "Error sending Discord notification", details: error };
  }
}

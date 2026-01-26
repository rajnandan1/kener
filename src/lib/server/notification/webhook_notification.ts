import type { TemplateRecord, TriggerRecordParsed, TriggerMetaWebhookJson, WebhookTemplateJson } from "../types/db";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import Mustache from "mustache";
import type { SiteDataForNotification, TemplateVariableMap } from "./types.js";

export default async function send(
  triggerRecord: TriggerRecordParsed<TriggerMetaWebhookJson>,
  variables: TemplateVariableMap,
  template: TemplateRecord,
  siteData: SiteDataForNotification,
  url?: string,
  headers?: { key: string; value: string }[],
) {
  // Process trigger meta for environment secrets
  let metaStringified = JSON.stringify(triggerRecord.trigger_meta);
  let envSecrets = GetRequiredSecrets(metaStringified);

  for (let i = 0; i < envSecrets.length; i++) {
    const secret = envSecrets[i];
    if (secret.replace !== undefined) {
      metaStringified = ReplaceAllOccurrences(metaStringified, secret.find, secret.replace);
    }
  }

  let trigger_meta_json = JSON.parse(metaStringified) as TriggerMetaWebhookJson;

  // Process template for environment secrets
  let webhookBody = template.template_json;
  let envSecretsTemplate = GetRequiredSecrets(webhookBody);

  for (let i = 0; i < envSecretsTemplate.length; i++) {
    const secret = envSecretsTemplate[i];
    if (secret.replace !== undefined) {
      webhookBody = ReplaceAllOccurrences(webhookBody, secret.find, secret.replace);
    }
  }

  let webhookBodyJson = JSON.parse(webhookBody) as WebhookTemplateJson;

  // Get URL and headers from trigger meta or override params
  const webhookUrl = url || trigger_meta_json.url;
  const webhookHeaders = headers || trigger_meta_json.headers || [];

  // Render the webhook body with Mustache (disable HTML escaping for JSON/plain text)
  const renderedBody = Mustache.render(
    webhookBodyJson.webhook_body,
    { ...variables, ...siteData },
    {},
    { escape: (text) => text },
  );

  // Build headers object
  const headersObj: Record<string, string> = {
    "Content-Type": "application/json",
  };

  for (const header of webhookHeaders) {
    if (header.key && header.value) {
      headersObj[header.key] = header.value;
    }
  }

  try {
    const response = await fetch(webhookUrl, {
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

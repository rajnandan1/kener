import type { TemplateRecord, TriggerRecordParsed, TriggerMetaSlackJson, SlackTemplateJson } from "../types/db";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import Mustache from "mustache";
import type { SiteDataForNotification, TemplateVariableMap } from "./types.js";

export default async function send(
  triggerRecord: TriggerRecordParsed<TriggerMetaSlackJson>,
  variables: TemplateVariableMap,
  template: TemplateRecord,
  siteData: SiteDataForNotification,
  url?: string,
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

  let trigger_meta_json = JSON.parse(metaStringified) as TriggerMetaSlackJson;

  // Process template for environment secrets
  let slackBody = template.template_json;
  let envSecretsTemplate = GetRequiredSecrets(slackBody);

  for (let i = 0; i < envSecretsTemplate.length; i++) {
    const secret = envSecretsTemplate[i];
    if (secret.replace !== undefined) {
      slackBody = ReplaceAllOccurrences(slackBody, secret.find, secret.replace);
    }
  }

  let slackBodyJson = JSON.parse(slackBody) as SlackTemplateJson;

  // Get URL from trigger meta or override param
  const slackUrl = url || trigger_meta_json.url;

  // Render the slack body with Mustache (disable HTML escaping)
  const renderedBody = Mustache.render(
    slackBodyJson.slack_body,
    { ...variables, ...siteData },
    {},
    { escape: (text) => text },
  );

  try {
    const response = await fetch(slackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: renderedBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Slack webhook request failed with status ${response.status}: ${errorText}`);
      return { error: `Slack webhook request failed with status ${response.status}`, details: errorText };
    }

    const responseData = await response.text();
    return { success: true, status: response.status, data: responseData };
  } catch (error) {
    console.error("Error sending Slack notification", error);
    return { error: "Error sending Slack notification", details: error };
  }
}

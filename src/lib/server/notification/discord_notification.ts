import type { TemplateRecord, TriggerRecordParsed, TriggerMetaDiscordJson, DiscordTemplateJson } from "../types/db";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import Mustache from "mustache";
import type { SiteDataForNotification, TemplateVariableMap } from "./types.js";

export default async function send(
  triggerRecord: TriggerRecordParsed<TriggerMetaDiscordJson>,
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

  let trigger_meta_json = JSON.parse(metaStringified) as TriggerMetaDiscordJson;

  // Process template for environment secrets
  let discordBody = template.template_json;
  let envSecretsTemplate = GetRequiredSecrets(discordBody);

  for (let i = 0; i < envSecretsTemplate.length; i++) {
    const secret = envSecretsTemplate[i];
    if (secret.replace !== undefined) {
      discordBody = ReplaceAllOccurrences(discordBody, secret.find, secret.replace);
    }
  }

  let discordBodyJson = JSON.parse(discordBody) as DiscordTemplateJson;

  // Get URL from trigger meta or override param
  const discordUrl = url || trigger_meta_json.url;

  // Render the discord body with Mustache (disable HTML escaping)
  const renderedBody = Mustache.render(
    discordBodyJson.discord_body,
    { ...variables, ...siteData },
    {},
    { escape: (text) => text },
  );

  try {
    const response = await fetch(discordUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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

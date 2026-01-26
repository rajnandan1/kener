import type {
  TriggerRecord,
  TemplateRecord,
  TemplateJsonType,
  TriggerRecordParsed,
  TriggerMetaEmailJson,
  EmailTemplateJson,
} from "../types/db";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import Mustache from "mustache";
import striptags from "striptags";
import { Resend, type CreateEmailOptions } from "resend";
import type { SiteDataForNotification, TemplateVariableMap } from "./types.js";

export default async function send(
  triggerRecord: TriggerRecordParsed<TriggerMetaEmailJson>,
  variables: TemplateVariableMap,
  template: TemplateRecord,
  siteData: SiteDataForNotification,
  to?: string[],
) {
  // Implementation for sending email notification using the provided triggerRecord, variables, and template

  let metaStringified = JSON.stringify(triggerRecord.trigger_meta);
  let envSecrets = GetRequiredSecrets(metaStringified);

  for (let i = 0; i < envSecrets.length; i++) {
    const secret = envSecrets[i];
    if (secret.replace !== undefined) {
      metaStringified = ReplaceAllOccurrences(metaStringified, secret.find, secret.replace);
    }
  }

  let trigger_meta_json = JSON.parse(metaStringified) as TriggerMetaEmailJson;
  let emailBody = template.template_json;
  let emailBodyJson = JSON.parse(emailBody) as EmailTemplateJson;

  let envSecretsTemplate = GetRequiredSecrets(emailBody);

  for (let i = 0; i < envSecretsTemplate.length; i++) {
    const secret = envSecretsTemplate[i];
    if (secret.replace !== undefined) {
      emailBody = ReplaceAllOccurrences(emailBody, secret.find, secret.replace);
    }
  }

  let toAddresses = trigger_meta_json.to;
  if (to) {
    toAddresses = to;
  }
  const from = trigger_meta_json.from;
  const subject = Mustache.render(emailBodyJson.email_subject, { ...variables, ...siteData });
  const htmlBody = Mustache.render(emailBodyJson.email_body, { ...variables, ...siteData });
  const textBody = striptags(htmlBody);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      const emailBody: CreateEmailOptions = {
        from: from,
        to: toAddresses,
        subject: subject,
        html: htmlBody,
        text: textBody,
      };
      return await resend.emails.send(emailBody);
    } catch (error) {
      console.error("Error sending webhook", error);
      return error;
    }
  } catch (error) {
    console.error("Error sending email", error);
    return error;
  }
}

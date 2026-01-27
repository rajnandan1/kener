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
import type {
  ResendAPIConfiguration,
  SiteDataForNotification,
  SMTPConfiguration,
  TemplateVariableMap,
} from "./types.js";
import getSMTPTransport from "./smtps.js";

export default async function send(
  triggerRecord: SMTPConfiguration | ResendAPIConfiguration,
  variables: TemplateVariableMap,
  template: TemplateRecord,
  siteData: SiteDataForNotification,
  to: string[],
) {
  // Implementation for sending email notification using the provided triggerRecord, variables, and template

  let emailBody = template.template_json;
  let emailBodyJson = JSON.parse(emailBody) as EmailTemplateJson;

  let envSecretsTemplate = GetRequiredSecrets(emailBody);

  for (let i = 0; i < envSecretsTemplate.length; i++) {
    const secret = envSecretsTemplate[i];
    if (secret.replace !== undefined) {
      emailBody = ReplaceAllOccurrences(emailBody, secret.find, secret.replace);
    }
  }

  const subject = Mustache.render(emailBodyJson.email_subject, { ...variables, ...siteData });
  const htmlBody = Mustache.render(emailBodyJson.email_body, { ...variables, ...siteData });
  const textBody = striptags(htmlBody);

  try {
    //check if triggerRecord is of type ResendAPIConfiguration
    if ("resend_api_key" in triggerRecord) {
      const resend = new Resend(triggerRecord.resend_api_key);
      const emailBody: CreateEmailOptions = {
        from: triggerRecord.resend_sender_email,
        to: to,
        subject: subject,
        html: htmlBody,
        text: textBody,
      };
      return await resend.emails.send(emailBody);
    } else {
      // SMTP Configuration
      const transport = getSMTPTransport(triggerRecord as SMTPConfiguration);
      const mailOptions = {
        from: triggerRecord.smtp_sender, // sender address
        to: to, // recipient address(es)
        subject: subject, // email subject
        text: textBody, // plain text body
        html: htmlBody, // HTML body (if any)
      };
      return await transport.sendMail(mailOptions);
    }
  } catch (error) {
    console.error("Error sending email", error);
    return error;
  }
}

import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import Mustache from "mustache";
import striptags from "striptags";
import { Resend, type CreateEmailOptions } from "resend";
import type { SMTPConfiguration } from "./types.js";
import getSMTPTransport from "./smtps.js";
import { GetSMTPFromENV } from "../controllers/commonController.js";
import { IsEmailSetup, IsResendSetup } from "../controllers/emailController.js";

export default async function send(
  emailBody: string,
  emailSubject: string,
  variables: Record<string, string | number | boolean>,
  to: string[],
  from?: string,
) {
  // Implementation for sending email notification using the provided triggerRecord, variables, and template

  let envSecretsTemplate = GetRequiredSecrets(emailBody + emailSubject);

  for (let i = 0; i < envSecretsTemplate.length; i++) {
    const secret = envSecretsTemplate[i];
    if (secret.replace !== undefined) {
      emailBody = ReplaceAllOccurrences(emailBody, secret.find, secret.replace);
      emailSubject = ReplaceAllOccurrences(emailSubject, secret.find, secret.replace);
    }
  }

  const subject = Mustache.render(emailSubject, variables);
  const htmlBody = Mustache.render(emailBody, variables);
  const textBody = striptags(htmlBody);

  try {
    let isEmailSetupDone = IsEmailSetup();
    if (!isEmailSetupDone) {
      throw new Error("Email not configured properly. Please check SMTP or Resend configuration.");
    }
    let isResend = IsResendSetup();
    let mySMTPData = GetSMTPFromENV();
    if (isResend) {
      //check if triggerRecord is of type ResendAPIConfiguration
      const resend = new Resend(process.env.RESEND_API_KEY || "");
      const emailBody: CreateEmailOptions = {
        from: from || process.env.RESEND_SENDER_EMAIL || "",
        to: to,
        subject: subject,
        html: htmlBody,
        text: textBody,
      };
      return await resend.emails.send(emailBody);
    } else if (mySMTPData) {
      // SMTP Configuration
      const transport = getSMTPTransport(mySMTPData as SMTPConfiguration);
      const mailOptions = {
        from: from || mySMTPData.smtp_sender, // sender address
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

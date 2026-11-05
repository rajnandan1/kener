import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import Mustache from "mustache";
import { HtmlToText, PlainTextVariables } from "./htmlToText.js";
import { Resend, type CreateEmailOptions } from "resend";
import type { SMTPConfiguration } from "./types.js";
import getSMTPTransport from "./smtps.js";
import { GetSMTPFromENV } from "../controllers/commonController.js";
import { IsEmailSetup, IsResendSetup } from "../controllers/emailController.js";
import db from "../db/db.js";

export interface InlineImage {
  cid: string;
  filename: string;
  content: Buffer;
  contentType: string;
}

// A template shows an uploaded image with <img src="cid:IMAGE_ID">; the id is the one the upload returned.
const CID_REFERENCE = /cid:([A-Za-z0-9._-]+)/g;

/**
 * The uploaded images an email's HTML refers to by `cid:`, each once, to send as inline attachments
 * under that Content-ID. A reference to an image that does not exist is logged and left out.
 */
export async function GetInlineImages(html: string): Promise<InlineImage[]> {
  const ids = [...new Set([...html.matchAll(CID_REFERENCE)].map((match) => match[1]))];
  const images: InlineImage[] = [];
  for (const id of ids) {
    const image = await db.getImageById(id);
    if (!image) {
      console.warn(`Email refers to cid:${id}, but no uploaded image has that id; it is sent without the image`);
      continue;
    }
    images.push({
      cid: id,
      filename: image.original_name || id,
      content: Buffer.from(image.data, "base64"),
      contentType: image.mime_type,
    });
  }
  return images;
}

export default async function send(
  emailBody: string,
  emailSubject: string,
  variables: Record<string, string | number | boolean>,
  to: string[],
  from?: string,
  emailTextBody?: string,
) {
  // Implementation for sending email notification using the provided triggerRecord, variables, and template

  let envSecretsTemplate = GetRequiredSecrets(emailBody + emailSubject + (emailTextBody || ""));

  for (let i = 0; i < envSecretsTemplate.length; i++) {
    const secret = envSecretsTemplate[i];
    if (secret.replace !== undefined) {
      emailBody = ReplaceAllOccurrences(emailBody, secret.find, secret.replace);
      emailSubject = ReplaceAllOccurrences(emailSubject, secret.find, secret.replace);
      if (emailTextBody !== undefined) {
        emailTextBody = ReplaceAllOccurrences(emailTextBody, secret.find, secret.replace);
      }
    }
  }

  // Only the HTML part is HTML. The subject and the text part are plain text: escaping them would show
  // &lt;p&gt; or &amp;, so they render unescaped, and a variable that holds HTML (an update's text) goes
  // into the text part as readable text.
  const plain = { escape: (value: unknown) => String(value) };
  const subject = Mustache.render(emailSubject, variables, undefined, plain);
  const htmlBody = Mustache.render(emailBody, variables);
  const textBody = emailTextBody
    ? Mustache.render(emailTextBody, PlainTextVariables(variables), undefined, plain)
    : HtmlToText(htmlBody);

  try {
    let isEmailSetupDone = IsEmailSetup();
    if (!isEmailSetupDone) {
      throw new Error("Email not configured properly. Please check SMTP or Resend configuration.");
    }
    const inlineImages = await GetInlineImages(htmlBody);
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
      if (inlineImages.length > 0) {
        emailBody.attachments = inlineImages.map(({ cid, filename, content, contentType }) => ({
          contentId: cid,
          filename,
          content,
          contentType,
        }));
      }
      let resp = await resend.emails.send(emailBody);
      if (!!resp.error) {
        throw new Error(`Resend API error: ${resp.error.message}`);
      }
      return resp;
    } else if (mySMTPData) {
      // SMTP Configuration
      const transport = getSMTPTransport(mySMTPData as SMTPConfiguration);
      const mailOptions = {
        from: from || mySMTPData.smtp_sender, // sender address
        to: to, // recipient address(es)
        subject: subject, // email subject
        text: textBody, // plain text body
        html: htmlBody, // HTML body (if any)
        // A cid attachment is sent inline, for the HTML to show where it refers to it.
        attachments: inlineImages.map(({ cid, filename, content, contentType }) => ({
          cid,
          filename,
          content,
          contentType,
        })),
      };
      return await transport.sendMail(mailOptions);
    } else {
      throw new Error("No valid email configuration found. Please check your SMTP or Resend settings.");
    }
  } catch (error) {
    console.error("Error sending email", error);
    throw error;
  }
}

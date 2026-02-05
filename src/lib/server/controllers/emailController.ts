import {
  GetMinuteStartNowTimestampUTC,
  GetMinuteStartTimestampUTC,
  GetNowTimestampUTC,
  ReplaceAllOccurrences,
  ValidateEmail,
} from "../tool.js";
import { Resend } from "resend";
import getSMTPTransport from "../notification/smtps.js";

import { GetSMTPFromENV } from "./commonController.js";

export const IsResendSetup = () => {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_SENDER_EMAIL;
};

export const IsEmailSetup = () => {
  return !!GetSMTPFromENV || IsResendSetup();
};
export const SendEmailWithTemplate = async (
  template: string,
  data: Record<string, string>,
  email: string,
  subject: string,
  emailText: string,
): Promise<unknown> => {
  //for each key in data, replace the key in template with value
  for (const key in data) {
    if (Object.hasOwnProperty.call(data, key)) {
      const value = data[key];
      template = ReplaceAllOccurrences(template, `{{${key}}}`, value);
    }
  }

  const senderEmail = process.env.RESEND_SENDER_EMAIL || "";
  const resendKey = process.env.RESEND_API_KEY;

  let mail = {
    from: senderEmail,
    to: [email],
    subject: subject,
    text: emailText,
    html: template,
  };

  let smtpData = GetSMTPFromENV();

  try {
    if (!!smtpData) {
      const transporter = getSMTPTransport(smtpData);
      const mailOptions = {
        from: smtpData.smtp_sender,
        to: email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      };
      return await transporter.sendMail(mailOptions);
    } else {
      const resend = new Resend(resendKey);
      return await resend.emails.send(mail);
    }
  } catch (error) {
    console.error("Error sending email via SMTP", error);
    throw new Error("Error sending email via SMTP");
  }
};

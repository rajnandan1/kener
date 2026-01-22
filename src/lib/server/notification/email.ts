import { Resend } from "resend";
import getSMTPTransport from "./smtps.js";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import version from "../../version.js";
import Mustache from "mustache";
import variables, { type SiteDataForNotification, type AlertData } from "./variables.js";
import { EmailHTMLTemplate } from "../../anywhere.js";
import type { TriggerRecord, MonitorRecord } from "../types/db.js";

interface EmailMeta {
  to: string;
  from: string;
  email_type?: "resend" | "smtp";
  smtp_host?: string;
  smtp_port?: string | number;
  smtp_secure?: boolean;
  smtp_user?: string;
  smtp_pass?: string;
  has_email_body?: boolean;
  email_body?: string;
}

interface EmailRequest {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}

class Email {
  to: string;
  from: string;
  siteData: SiteDataForNotification;
  monitorData: MonitorRecord | undefined;
  meta: EmailMeta;

  constructor(meta: EmailMeta, siteData: SiteDataForNotification, monitorData?: MonitorRecord) {
    this.to = meta.to;
    this.from = meta.from;
    this.siteData = siteData;
    this.monitorData = monitorData;

    let metaString = JSON.stringify(meta);

    let envSecrets = GetRequiredSecrets(`${JSON.stringify(meta)}`);

    for (let i = 0; i < envSecrets.length; i++) {
      const secret = envSecrets[i];
      if (secret.replace !== undefined) {
        metaString = ReplaceAllOccurrences(metaString, secret.find, secret.replace);
      }
    }

    this.meta = JSON.parse(metaString);

    // Process secrets in email_body if custom template is used
    if (!!this.meta.has_email_body && !!this.meta.email_body) {
      envSecrets = GetRequiredSecrets(this.meta.email_body);
      for (let i = 0; i < envSecrets.length; i++) {
        const secret = envSecrets[i];
        if (secret.replace !== undefined && this.meta.email_body) {
          this.meta.email_body = ReplaceAllOccurrences(this.meta.email_body, secret.find, secret.replace);
        }
      }
    }
  }

  transformData(data: AlertData): EmailRequest {
    let ctaLink = data.actions[0].url;
    let emailApiRequest: EmailRequest = {
      from: this.from,
      to: this.to.split(",").map((email: string) => email.trim()),
      subject: `[${data.status}] ${data.alert_name}  at ${data.timestamp}`,
      text: `Alert ${data.alert_name} has been ${data.status} at ${data.timestamp}. Click here to view the alert: ${ctaLink}`,
      html: "",
    };

    // Use custom template if provided, otherwise use default
    if (!!this.meta.has_email_body && !!this.meta.email_body) {
      const view = {
        ...variables(this.siteData, data),
        color_up: this.siteData.colors.UP,
        color_down: this.siteData.colors.DOWN,
        color_degraded: this.siteData.colors.DEGRADED,
        color_maintenance: this.siteData.colors.MAINTENANCE,
      };
      emailApiRequest.html = Mustache.render(this.meta.email_body, view);
    } else {
      // Use default EmailHTMLTemplate with Mustache
      const view = {
        ...variables(this.siteData, data),
        color_up: this.siteData.colors.UP,
        color_down: this.siteData.colors.DOWN,
        color_degraded: this.siteData.colors.DEGRADED,
        color_maintenance: this.siteData.colors.MAINTENANCE,
      };
      emailApiRequest.html = Mustache.render(EmailHTMLTemplate, view);
    }

    return emailApiRequest;
  }

  type() {
    return "email";
  }

  async send(data: AlertData): Promise<unknown> {
    let emailBody = this.transformData(data); // object containing email data (to, subject, text, html, etc)
    if (!this.meta.email_type || this.meta.email_type === "resend") {
      const resend = new Resend(process.env.RESEND_API_KEY);
      try {
        return await resend.emails.send(emailBody);
      } catch (error) {
        console.error("Error sending webhook", error);
        return error;
      }
    }
    if (this.meta.email_type === "smtp") {
      // Configure the SMTP transporter using environment variables
      const transporter = getSMTPTransport(this.meta as Parameters<typeof getSMTPTransport>[0]);

      const mailOptions = {
        from: emailBody.from, // sender address
        to: Array.isArray(emailBody.to) ? emailBody.to.join(",") : emailBody.to, // recipient address(es)
        subject: emailBody.subject, // email subject
        text: emailBody.text, // plain text body
        html: emailBody.html, // HTML body (if any)
      };

      try {
        return await transporter.sendMail(mailOptions);
      } catch (error: unknown) {
        console.error("Error sending email via SMTP", error);
        return { error: (error as Error).message };
      }
    }
  }
}

export default Email;

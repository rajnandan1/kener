import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { HashString } from "../tool.js";
import type { TriggerRecord, MonitorRecord } from "../types/db.js";

interface SMTPMeta {
  smtp_host: string;
  smtp_port?: string | number;
  smtp_secure?: boolean;
  smtp_user: string;
  smtp_pass: string;
}

const transports: Record<string, Transporter> = {};

export default function getSMTPTransport(meta: SMTPMeta): Transporter {
  //convert meta to string and generate has id

  let transportId = "smtp_" + HashString(JSON.stringify(meta));

  if (!!transports[transportId]) {
    return transports[transportId];
  }

  let options: nodemailer.TransportOptions & {
    host: string;
    port: number;
    secure?: boolean;
    auth?: { user: string; pass: string };
    tls: { rejectUnauthorized: boolean };
  } = {
    host: meta.smtp_host,
    port: Number(meta.smtp_port) || 587,
    secure: meta.smtp_secure, // true for 465, false for other ports
    auth: {
      user: meta.smtp_user,
      pass: meta.smtp_pass,
    },
    tls: {
      rejectUnauthorized: !!meta.smtp_secure, // false if smtp_secure is 0
    },
  };

  if (meta.smtp_user === "-" || meta.smtp_pass === "-") {
    delete options.auth;
  }

  const transporter = nodemailer.createTransport(options);
  transports[transportId] = transporter;

  return transporter;
}

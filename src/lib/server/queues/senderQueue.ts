/**
 * Sender Queue - handles individual email sending
 * Receives email configuration, variables, template, and recipient email
 */

import { Queue, Worker, Job, type JobsOptions } from "bullmq";
import q from "./q.js";
import sendEmail from "../notification/email_notification.js";
import type { TemplateRecord } from "../types/db.js";
import type {
  SMTPConfiguration,
  ResendAPIConfiguration,
  SiteDataForNotification,
  SubscriptionVariableMap,
  WebhookConfiguration,
} from "../notification/types.js";

let senderQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "senderQueue";
const jobNamePrefix = "sendJob";

const getQueue = () => {
  if (!senderQueue) {
    senderQueue = q.createQueue(queueName);
  }
  return senderQueue;
};

const addWorker = () => {
  if (worker) return worker;

  worker = q.createWorker(getQueue(), async (job: Job): Promise<void> => {
    const { details } = job.data as { details: NotificationObject };

    try {
      if (details.type === "email" && details.emailConfig && details.emailTo) {
        const { emailConfig, variables, template, templateSiteVars, emailTo } = details;
        await sendEmail(emailConfig, variables, template, templateSiteVars, [emailTo]);
        console.log(`📧 Email sent to ${emailTo}`);
      }
    } catch (error) {
      // console.error(`Failed to send email to ${toEmail}:`, error);
      throw error; // Re-throw to trigger retry
    }
  });

  worker.on("completed", (job: Job) => {
    // const { toEmail } = job.data as SenderJobData;
    // console.log(`✅ Email job completed for ${toEmail}`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    const toEmail = job?.data?.toEmail || "unknown";
    console.error(`❌ Email job failed for ${toEmail}:`, err.message);
  });

  return worker;
};

/**
 * Push an email sending job to the queue
 */

export interface NotificationObject {
  emailConfig?: SMTPConfiguration | ResendAPIConfiguration;
  variables: SubscriptionVariableMap;
  template: TemplateRecord;
  templateSiteVars: SiteDataForNotification;
  emailTo?: string;
  id: string;
  type: string;
}
export const push = async (details: NotificationObject, options?: JobsOptions) => {
  if (!options) {
    options = {};
  }

  const queue = getQueue();
  addWorker();

  // Use deduplication to prevent duplicate emails
  const deDupId = details.id;
  if (!options.deduplication) {
    options.deduplication = {
      id: deDupId,
    };
  }

  await queue.add(`${jobNamePrefix}_${details.emailTo}`, details, options);
};

/**
 * Graceful shutdown
 */
export const shutdown = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};

export default {
  push,
  shutdown,
};

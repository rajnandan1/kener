/**
 * Email Queue - handles individual email sending
 * Receives template, variables, and single recipient email
 * Each job sends to exactly one recipient for privacy
 */

import { Queue, Worker, Job, type JobsOptions } from "bullmq";
import q from "./q.js";
import sendEmail from "../notification/email_notification.js";
import { CreateMD5Hash } from "../controllers/commonController.js";

let emailQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "emailQueue";
const jobNamePrefix = "emailJob";

export interface EmailJobData {
  toEmails: string[];
  templateHtmlBody: string;
  templateSubject: string;
  variables: Record<string, string | number | boolean>;
  fromEmail?: string;
}

const getQueue = () => {
  if (!emailQueue) {
    emailQueue = q.createQueue(queueName);
  }
  return emailQueue;
};

const addWorker = () => {
  if (worker) return worker;

  worker = q.createWorker(getQueue(), async (job: Job): Promise<void> => {
    const { toEmails, templateHtmlBody, templateSubject, variables, fromEmail } = job.data as EmailJobData;

    try {
      await sendEmail(
        templateHtmlBody,
        templateSubject,
        variables,
        toEmails, // Single recipient array
        fromEmail,
      );
      console.log(`📧 Email sent to ${toEmails}`);
    } catch (error) {
      console.error(`Failed to send email to ${toEmails}:`, error);
      throw error; // Re-throw to trigger retry
    }
  });

  worker.on("completed", (job: Job) => {
    // Completed silently
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    const toEmails = job?.data?.toEmail || "unknown";
    console.error(`❌ Email job failed`, err.message);
  });

  return worker;
};

/**
 * Push an email sending job to the queue
 * @param jobData - Email job data with single recipient
 * @param options - BullMQ job options
 */
export const push = async (jobData: EmailJobData, options?: JobsOptions) => {
  if (!options) {
    options = {};
  }
  options.removeOnComplete = {
    age: 300, // keep up to 5 minutes
    count: 100, // keep up to 100 jobs
  };
  options.removeOnFail = {
    age: 24 * 3600, // keep up to 24 hours
  };

  const queue = getQueue();
  addWorker();

  // Use deduplication to prevent duplicate emails to same recipient
  const deDupId = `email-${CreateMD5Hash(jobData.toEmails.join(","))}-${Date.now()}`;
  if (!options.deduplication) {
    options.deduplication = {
      id: deDupId,
    };
  }

  await queue.add(`${jobNamePrefix}-send`, jobData, options);
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

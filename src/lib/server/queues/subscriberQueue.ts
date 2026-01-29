/**
 * Subscriber Queue - receives subscription variable data and trigger id
 * Finds all subscribers for a given trigger and sends emails via senderQueue
 */

import { Queue, Worker, Job, type JobsOptions } from "bullmq";
import q from "./q.js";
import { GetAllSiteData } from "../controllers/controller.js";
import { siteDataToVariables } from "../notification/notification_utils.js";
import type { SubscriptionVariableMap } from "../notification/types.js";
import { GetGeneralEmailTemplateById } from "../controllers/generalTemplateController.js";
import { GetActiveEmailsForEventType } from "../controllers/userSubscriptionsController.js";
import emailQueue from "./emailQueue.js";
let subscriberQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "subscriberQueue";
const jobNamePrefix = "subscriberJob";

interface SubscriberJobData {
  variables: SubscriptionVariableMap;
}

const getQueue = () => {
  if (!subscriberQueue) {
    subscriberQueue = q.createQueue(queueName);
  }
  return subscriberQueue;
};

const addWorker = () => {
  if (worker) return worker;

  worker = q.createWorker(getQueue(), async (job: Job): Promise<void> => {
    const { variables } = job.data as SubscriberJobData;

    try {
      // Get site data for template variables
      const siteData = await GetAllSiteData();
      const templateSiteVars = siteDataToVariables(siteData);

      const template = await GetGeneralEmailTemplateById("subscription_update");
      if (!template) {
        throw new Error("Subscription email template not found");
      }
      const emailVars = {
        ...templateSiteVars,
        ...variables,
      };

      const eventType = variables.event_type;

      // Get active subscriber emails for this event type
      const subscriberEmails = await GetActiveEmailsForEventType(eventType);

      if (subscriberEmails.length === 0) {
        console.log(`📭 No active subscribers for event type: ${eventType}`);
        return;
      }

      // Queue individual emails for each subscriber (for privacy - no shared recipients)
      for (const email of subscriberEmails) {
        await emailQueue.push({
          toEmails: [email],
          templateHtmlBody: template.template_html_body || "",
          templateSubject: template.template_subject || "Event Update",
          variables: emailVars,
        });
      }

      console.log(`📮 Queued ${subscriberEmails.length} subscription email(s) for event: ${eventType}`);
    } catch (error) {
      console.error("Error processing subscriber queue job:", error);
      throw error;
    }
  });

  worker.on("completed", (job: Job) => {
    // const { monitor_tags } = job.data as SubscriberJobData;
    // console.log(`✅ Subscriber job completed for monitors: ${monitor_tags.join(", ")}`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.error("❌ Subscriber job failed:", err.message);
  });

  return worker;
};

/**
 * Push a subscriber notification job to the queue
 */
export const push = async (variables: SubscriptionVariableMap, options?: JobsOptions) => {
  if (!options) {
    options = {};
  }

  const queue = getQueue();
  addWorker();

  // Use deduplication to prevent duplicate notifications
  const deDupId = `subscriber-${variables.event_type}-${variables.update_id}-${Date.now()}`;
  if (!options.deduplication) {
    options.deduplication = {
      id: deDupId,
    };
  }

  await queue.add(
    `${jobNamePrefix}_${variables.update_id}`,
    {
      variables,
    },
    options,
  );
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

/**
 * Subscriber Queue - receives subscription variable data and the monitors the update is about
 * Finds the subscribers of those monitors and sends emails via senderQueue
 */

import { Queue, Worker, Job, type JobsOptions } from "bullmq";
import q from "./q.js";
import { GetAllSiteData } from "../controllers/controller.js";
import { siteDataToVariables } from "../notification/notification_utils.js";
import type { SubscriptionVariableMap } from "../notification/types.js";
import { GetGeneralEmailTemplateById } from "../controllers/generalTemplateController.js";
import { GetSiteDataByKey } from "../controllers/siteDataController.js";
import { GetActiveEmailsForMonitors, IsEmailSubscriptionEnabled } from "../controllers/userSubscriptionsController.js";
import type { SubscriptionsConfig } from "../types/db.js";
import emailQueue from "./emailQueue.js";
let subscriberQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "subscriberQueue";
const jobNamePrefix = "subscriberJob";

interface SubscriberJobData {
  variables: SubscriptionVariableMap;
  monitor_tags: string[];
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
    const { variables, monitor_tags } = job.data as SubscriberJobData;

    try {
      const settings = (await GetSiteDataByKey("subscriptionsSettings")) as SubscriptionsConfig | null;
      if (!IsEmailSubscriptionEnabled(settings)) {
        return;
      }

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

      // Only the subscribers of the monitors this update is about
      const subscriberEmails = await GetActiveEmailsForMonitors(monitor_tags);

      if (subscriberEmails.length === 0) {
        console.log(`📭 No active subscribers for ${eventType} update ${variables.update_id}`);
        return;
      }

      // Queue individual emails for each subscriber (for privacy - no shared recipients)
      for (const email of subscriberEmails) {
        await emailQueue.push({
          toEmails: [email],
          templateHtmlBody: template.template_html_body || "",
          templateSubject: template.template_subject || "Event Update",
          templateTextBody: template.template_text_body || "",
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
 * Push a subscriber notification job to the queue. It reaches the subscribers of `monitorTags` only.
 */
export const push = async (variables: SubscriptionVariableMap, monitorTags: string[], options?: JobsOptions) => {
  if (!options) {
    options = {};
  }
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
      monitor_tags: monitorTags,
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

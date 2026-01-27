/**
 * Subscriber Queue - receives subscription variable data and trigger id
 * Finds all subscribers for a given trigger and sends emails via senderQueue
 */

import { Queue, Worker, Job, type JobsOptions } from "bullmq";
import q from "./q.js";
import db from "../db/db.js";
import { CreateHash, CreateMD5Hash, GetAllSiteData } from "../controllers/controller.js";
import { siteDataToVariables, getPreferredEmailConfiguration } from "../notification/notification_utils.js";
import { GetTemplateByEmailType } from "../controllers/emailTemplateConfigController.js";
import senderQueue from "./senderQueue.js";
import type { SubscriptionVariableMap } from "../notification/types.js";
import { GetSubscriptionMethodsByEntity } from "../controllers/userSubscriptionsController.js";

let subscriberQueue: Queue | null = null;
let worker: Worker | null = null;
const queueName = "subscriberQueue";
const jobNamePrefix = "subscriberJob";

interface SubscriberJobData {
  variables: SubscriptionVariableMap;
  entity_type: string;
  entity_id: string;
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
    const { variables, entity_type, entity_id } = job.data as SubscriberJobData;

    try {
      // Get site data for template variables
      const siteData = await GetAllSiteData();
      const templateSiteVars = siteDataToVariables(siteData);

      //given entity_type = 'incident' and entity_id get subscription method details

      let subscribers = await GetSubscriptionMethodsByEntity(entity_type, entity_id);
      if (subscribers.length === 0) {
        console.log(`No active subscribers found for ${entity_type} with ID: ${entity_id}`);
        return;
      }

      //get template for email
      const emailTemplate = await GetTemplateByEmailType("subscription_update");

      for (const subscriber of subscribers) {
        const methodDetails = subscriber.method;
        if (methodDetails.method_type === "email" && emailTemplate) {
          const emailID = methodDetails.method_value;
          const methodId = methodDetails.id;
          const messageHash = CreateMD5Hash(
            JSON.stringify({
              variables,
            }),
          );
          await senderQueue.push({
            emailConfig: getPreferredEmailConfiguration(),
            variables,
            template: emailTemplate,
            templateSiteVars,
            emailTo: emailID,
            type: "email",
            id: `${entity_type}-${entity_id}-${methodId}-${messageHash}`,
          });
        }
      }

      // console.log(`📮 Queued ${subscriberEmails.length} subscription emails for monitors: ${monitor_tags.join(", ")}`);
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
export const push = async (variables: SubscriptionVariableMap, monitor_tags: string[], options?: JobsOptions) => {
  if (!options) {
    options = {};
  }

  const queue = getQueue();
  addWorker();

  // Use deduplication to prevent duplicate notifications
  const deDupId = `subscriber-${monitor_tags.join("-")}-${variables.update_subject}-${Date.now()}`;
  if (!options.deduplication) {
    options.deduplication = {
      id: deDupId,
    };
  }

  await queue.add(
    `${jobNamePrefix}_${monitor_tags.join("_")}`,
    {
      variables,
      monitor_tags,
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

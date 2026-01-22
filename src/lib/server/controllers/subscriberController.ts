import type {
  MonitorRecordInsert,
  TriggerRecordInsert,
  MonitoringDataInsert,
  MonitorAlertInsert,
  IncidentFilter,
  MonitorFilter,
  TriggerFilter,
  SubscriberRecordInsert,
  UserRecordInsert,
  UserRecord,
  MonitorRecordTyped,
  MonitorRecord,
  SubscriberRecord,
  SubscriptionRecord,
  SubscriptionTriggerRecord,
} from "../types/db.js";
import db from "../db/db.js";
import type { PaginationInput } from "../../types/common.js";

interface SubscriptionTriggerInput {
  subscription_trigger_type: string;
  subscription_trigger_status?: string;
  config: string;
}

export const CreateNewSubscription = async (
  subscriber_id: number,
  monitors: string[],
): Promise<{ message: string; count: number }> => {
  if (!monitors || monitors.length === 0) {
    throw new Error("No monitors found");
  }

  await db.removeAllDataFromSubscriptions(subscriber_id);

  for (let i = 0; i < monitors.length; i++) {
    let tag = monitors[i];
    let subscription = {
      subscriber_id: subscriber_id,
      subscriptions_status: "ACTIVE",
      subscriptions_monitors: tag,
      subscriptions_meta: "",
    };
    await db.insertSubscription(subscription);
  }

  return {
    message: "Subscriptions created successfully",
    count: monitors.length,
  };
};

// fetch the single subscription_trigger (only type=email supported)
export const GetSubscriptionTriggerByEmail = async (): Promise<SubscriptionTriggerRecord | null> => {
  return await db.getSubscriptionTriggerByType("email");
};

// create a subscription_trigger record for email type
export const CreateSubscriptionTrigger = async (data: SubscriptionTriggerInput): Promise<SubscriptionTriggerInput> => {
  // only email supported
  if (data.subscription_trigger_type !== "email") {
    throw new Error("Only email trigger type is supported");
  }

  //update subscription_trigger_status and subscription_trigger_id given subscription_trigger_type, if not present insert otherwise update
  let subscriptionTrigger = await db.getSubscriptionTriggerByType(data.subscription_trigger_type);
  if (!subscriptionTrigger) {
    await db.insertSubscriptionTrigger({
      subscription_trigger_type: data.subscription_trigger_type,
      subscription_trigger_status: "ACTIVE",
      config: data.config,
    });
  } else {
    await db.updateSubscriptionTrigger({
      id: subscriptionTrigger.id,
      subscription_trigger_status: data.subscription_trigger_status || "ACTIVE",
      subscription_trigger_type: subscriptionTrigger.subscription_trigger_type,
      config: data.config,
    } as SubscriptionTriggerRecord);
  }

  return {
    subscription_trigger_type: data.subscription_trigger_type,
    subscription_trigger_status: data.subscription_trigger_status,
    config: data.config,
  };
};

//updateSubscriptionTriggerStatus
export const UpdateSubscriptionTriggerStatus = async (id: number, status: string): Promise<number> => {
  return await db.updateSubscriptionTriggerStatus(id, status);
};

// Get subscribers paginated
export const GetSubscribersPaginated = async (
  data: PaginationInput,
): Promise<{ subscriptions: unknown[]; total: number }> => {
  const page = parseInt(String(data.page)) || 1;
  const limit = parseInt(String(data.limit)) || 10;
  const subscriptions = (await db.getSubscriptionsPaginated(page, limit)) as (SubscriptionRecord & {
    subscriber?: unknown;
    monitor?: unknown;
  })[];
  const total = await db.getTotalSubscriptionCount();

  //all monitor tags
  let allTags = subscriptions.map((subscription) => subscription.subscriptions_monitors);
  //get all monitors by tags
  let monitors = await db.getMonitorsByTags(allTags);
  let tagMonitor: Record<string, { name: string; tag: string; image: string | null }> = {};
  //convert monitors to map in tagMonitor
  for (let i = 0; i < monitors.length; i++) {
    let m = monitors[i];
    tagMonitor[monitors[i].tag] = {
      name: m.name,
      tag: m.tag,
      image: m.image,
    };
  }
  let subscriberIDObj: Record<number, { id: number; email: string; status: string }> = {};
  //for each subscription get subscriber details
  for (let i = 0; i < subscriptions.length; i++) {
    let subsID = subscriptions[i].subscriber_id;
    if (!subscriberIDObj[subsID]) {
      const subscriber = await db.getSubscriberById(subscriptions[i].subscriber_id);
      if (subscriber) {
        subscriberIDObj[subsID] = {
          id: subscriber.id,
          email: subscriber.subscriber_send,
          status: subscriber.subscriber_status,
        };
      }
    }
    subscriptions[i].subscriber = subscriberIDObj[subsID];
    subscriptions[i].monitor = tagMonitor[subscriptions[i].subscriptions_monitors];
  }

  return {
    subscriptions: subscriptions,
    total: Number(total),
  };
};

//updateSubscriptionStatus
export const UpdateSubscriptionStatus = async (subscription_id: number, status: string): Promise<number> => {
  return await db.updateSubscriptionStatus(subscription_id, status);
};

export const CreateNewSubscriber = async (data: SubscriberRecordInsert): Promise<SubscriberRecord | undefined> => {
  await db.insertSubscriber(data);
  return await GetSubscriberByEmailAndType(data.subscriber_send, data.subscriber_type);
};

export const GetSubscriberByEmailAndType = async (
  email: string,
  type: string,
): Promise<SubscriberRecord | undefined> => {
  return await db.getSubscriberByDetails(email, type);
};

//get subscriber by id
export const GetSubscriberByID = async (id: number): Promise<Omit<SubscriberRecord, "updated_at"> | undefined> => {
  return await db.getSubscriberById(id);
};

//remove all subscriptions for a subscriber
export const RemoveAllSubscriptions = async (subscriber_id: number): Promise<number> => {
  return await db.removeAllDataFromSubscriptions(subscriber_id);
};

//updateSubscriberMeta given id
export const UpdateSubscriberMeta = async (id: number, meta: string): Promise<number> => {
  return await db.updateSubscriberMeta(id, meta);
};

//updateSubscriberStatus
export const UpdateSubscriberStatus = async (id: number, status: string): Promise<number> => {
  return await db.updateSubscriberStatus(id, status);
};

//delete subscriber by id
export const DeleteSubscriberByID = async (id: number): Promise<number> => {
  return await db.deleteSubscriberById(id);
};

//get subscriptions by subscriber id
export const GetSubscriptionsBySubscriberID = async (subscriber_id: number): Promise<SubscriptionRecord[]> => {
  return await db.getSubscriptionsBySubscriberId(subscriber_id);
};

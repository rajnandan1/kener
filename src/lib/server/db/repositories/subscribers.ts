import { BaseRepository, type CountResult } from "./base.js";
import { GetDbType } from "../../tool.js";
import type {
  SubscriberRecord,
  SubscriberRecordInsert,
  SubscriptionRecord,
  SubscriptionRecordInsert,
  SubscriptionTriggerRecord,
  SubscriptionTriggerRecordInsert,
} from "../../types/db.js";

/**
 * Repository for subscribers, subscriptions, and subscription triggers operations
 */
export class SubscribersRepository extends BaseRepository {
  // ============ Subscribers ============

  async insertSubscriber(data: SubscriberRecordInsert): Promise<number[]> {
    return await this.knex("subscribers").insert({
      subscriber_send: data.subscriber_send,
      subscriber_meta: data.subscriber_meta,
      subscriber_type: data.subscriber_type,
      subscriber_status: data.subscriber_status,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  async updateSubscriberMeta(id: number, subscriber_meta: string | null): Promise<number> {
    return await this.knex("subscribers").where({ id }).update({
      subscriber_meta,
      updated_at: this.knex.fn.now(),
    });
  }

  async updateSubscriberStatus(id: number, subscriber_status: string): Promise<number> {
    return await this.knex("subscribers").where({ id }).update({
      subscriber_status,
      updated_at: this.knex.fn.now(),
    });
  }

  async deleteSubscriberById(id: number): Promise<number> {
    return await this.knex("subscribers").where({ id }).del();
  }

  async getAllActiveSubscribers(): Promise<SubscriberRecord[]> {
    return await this.knex("subscribers").where("subscriber_status", "ACTIVE");
  }

  async getSubscriberByDetails(
    subscriber_send: string,
    subscriber_type: string,
  ): Promise<SubscriberRecord | undefined> {
    return await this.knex("subscribers").where({ subscriber_send, subscriber_type }).first();
  }

  async getSubscribersByType(subscriber_type: string): Promise<SubscriberRecord[]> {
    return await this.knex("subscribers").where("subscriber_type", subscriber_type).orderBy("id", "desc");
  }

  async getSubscriberById(id: number): Promise<Omit<SubscriberRecord, "updated_at"> | undefined> {
    return await this.knex("subscribers")
      .select("id", "subscriber_send", "subscriber_meta", "subscriber_type", "subscriber_status", "created_at")
      .where("id", id)
      .first();
  }

  async getSubscribersPaginated(
    page: number,
    limit: number,
  ): Promise<
    Array<{
      id: number;
      subscriber_send: string;
      subscriber_status: string;
      created_at: Date;
      subscriptions_monitors: string[];
    }>
  > {
    const subquery = this.knex("subscribers")
      .select("id")
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit)
      .as("paginated_subscribers");

    const dbType = GetDbType();
    const aggregationFunction = dbType === "postgresql" ? "STRING_AGG" : "GROUP_CONCAT";

    const results = await this.knex("subscribers as s")
      .select(
        "s.id",
        "s.subscriber_send",
        "s.subscriber_status",
        "s.created_at",
        this.knex.raw(`${aggregationFunction}(sub.subscriptions_monitors, ',') as monitors_agg`),
      )
      .innerJoin(subquery, "s.id", "paginated_subscribers.id")
      .leftJoin("subscriptions as sub", "s.id", "sub.subscriber_id")
      .groupBy("s.id", "s.subscriber_send", "s.subscriber_status", "s.created_at")
      .orderBy("s.created_at", "desc");

    return results.map(
      (row: {
        id: number;
        subscriber_send: string;
        subscriber_status: string;
        created_at: Date;
        monitors_agg: string | null;
      }) => ({
        id: row.id,
        subscriber_send: row.subscriber_send,
        subscriber_status: row.subscriber_status,
        created_at: row.created_at,
        subscriptions_monitors: row.monitors_agg ? row.monitors_agg.split(",") : [],
      }),
    );
  }

  async getSubscribersCount(): Promise<number | string> {
    const result = await this.knex("subscribers").count("* as count").first<CountResult>();
    return result?.count || 0;
  }

  // ============ Subscriptions ============

  async insertSubscription(data: SubscriptionRecordInsert): Promise<number[]> {
    return await this.knex("subscriptions").insert({
      subscriber_id: data.subscriber_id,
      subscriptions_status: data.subscriptions_status,
      subscriptions_monitors: data.subscriptions_monitors,
      subscriptions_meta: data.subscriptions_meta,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  async removeAllDataFromSubscriptions(subscriber_id: number): Promise<number> {
    return await this.knex("subscriptions").where({ subscriber_id }).del();
  }

  async getSubscriptionsBySubscriberId(subscriber_id: number): Promise<SubscriptionRecord[]> {
    return await this.knex("subscriptions").where("subscriber_id", subscriber_id).orderBy("id", "desc");
  }

  async updateSubscriptionStatus(id: number, subscriptions_status: string): Promise<number> {
    return await this.knex("subscriptions").where({ id }).update({
      subscriptions_status,
      updated_at: this.knex.fn.now(),
    });
  }

  async getSubscriptionsForMonitor(monitor_tag: string): Promise<
    Array<{
      subscriber_send: string;
      subscriber_type: string;
      subscriber_meta: string | null;
      subscriptions_meta: string | null;
    }>
  > {
    return await this.knex("subscriptions as s")
      .join("subscribers as sub", "s.subscriber_id", "sub.id")
      .where("s.subscriptions_status", "ACTIVE")
      .where("sub.subscriber_status", "ACTIVE")
      .whereRaw("s.subscriptions_monitors = ? OR s.subscriptions_monitors = 'ALL'", [monitor_tag])
      .select("sub.subscriber_send", "sub.subscriber_type", "sub.subscriber_meta", "s.subscriptions_meta");
  }

  async getSubscriptionsPaginated(page: number, limit: number): Promise<Array<Omit<SubscriptionRecord, "updated_at">>> {
    return await this.knex("subscriptions")
      .select(
        "id",
        "subscriber_id",
        "subscriptions_status",
        "subscriptions_monitors",
        "subscriptions_meta",
        "created_at",
      )
      .orderBy("id", "desc")
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async getTotalSubscriptionCount(): Promise<number | string> {
    const result = await this.knex("subscriptions").count("* as count").first<CountResult>();
    return result?.count || 0;
  }

  async getSubscriberEmails(monitor_tags: string[]): Promise<Array<{ subscriber_send: string }>> {
    return await this.knex("subscriptions")
      .join("subscribers", "subscribers.id", "subscriptions.subscriber_id")
      .distinct("subscribers.subscriber_send as subscriber_send")
      .where("subscriptions.subscriptions_status", "ACTIVE")
      .whereIn("subscriptions.subscriptions_monitors", monitor_tags)
      .orderBy("subscriber_send");
  }

  // ============ Subscription Triggers ============

  async insertSubscriptionTrigger(data: SubscriptionTriggerRecordInsert): Promise<number[]> {
    return await this.knex("subscription_triggers").insert({
      subscription_trigger_type: data.subscription_trigger_type,
      subscription_trigger_status: data.subscription_trigger_status,
      config: data.config,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  async getSubscriptionTriggerById(id: number): Promise<SubscriptionTriggerRecord | undefined> {
    return await this.knex("subscription_triggers").where({ id }).first();
  }

  async getAllSubscriptionTriggers(): Promise<SubscriptionTriggerRecord[]> {
    return await this.knex("subscription_triggers").orderBy("id", "desc");
  }

  async getSubscriptionTriggerByType(subscription_trigger_type: string): Promise<SubscriptionTriggerRecord | null> {
    return await this.knex("subscription_triggers")
      .where("subscription_trigger_type", subscription_trigger_type)
      .first();
  }

  async updateSubscriptionTrigger(data: SubscriptionTriggerRecord): Promise<number> {
    return await this.knex("subscription_triggers").where({ id: data.id }).update({
      subscription_trigger_type: data.subscription_trigger_type,
      subscription_trigger_status: data.subscription_trigger_status,
      config: data.config,
      updated_at: this.knex.fn.now(),
    });
  }

  async updateSubscriptionTriggerStatus(id: number, subscription_trigger_status: string): Promise<number> {
    return await this.knex("subscription_triggers").where({ id }).update({
      subscription_trigger_status,
      updated_at: this.knex.fn.now(),
    });
  }

  async deleteSubscriptionTriggerByType(subscription_trigger_type: string): Promise<number> {
    return await this.knex("subscription_triggers").where({ subscription_trigger_type }).del();
  }

  async deleteSubscriptionTriggerById(id: number): Promise<number> {
    return await this.knex("subscription_triggers").where({ id }).del();
  }
}

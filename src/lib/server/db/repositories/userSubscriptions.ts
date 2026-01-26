import type { Knex } from "knex";
import type {
  UserSubscriptionRecord,
  UserSubscriptionRecordInsert,
  UserSubscriptionFilter,
  SubscriptionMethodType,
  SubscriptionEventType,
  SubscriptionEntityType,
  SubscriberRecord,
  SubscriberSummary,
} from "../../types/db.js";
import type { CountResult } from "./base.js";

/**
 * Repository for user subscriptions operations
 */
export class UserSubscriptionsRepository {
  constructor(private knex: Knex) {}

  // ============ User Subscriptions ============

  /**
   * Insert a new user subscription
   */
  async insertUserSubscription(data: UserSubscriptionRecordInsert): Promise<number[]> {
    return await this.knex("user_subscriptions").insert({
      subscriber_id: data.subscriber_id,
      subscription_method: data.subscription_method,
      event_type: data.event_type,
      entity_type: data.entity_type ?? null,
      entity_id: data.entity_id ?? null,
      status: data.status ?? "ACTIVE",
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  /**
   * Get user subscription by ID
   */
  async getUserSubscriptionById(id: number): Promise<UserSubscriptionRecord | undefined> {
    return await this.knex("user_subscriptions").where({ id }).first();
  }

  /**
   * Get user subscriptions by filter
   */
  async getUserSubscriptions(filter: UserSubscriptionFilter): Promise<UserSubscriptionRecord[]> {
    const query = this.knex("user_subscriptions");

    if (filter.subscriber_id !== undefined) {
      query.where("subscriber_id", filter.subscriber_id);
    }
    if (filter.subscription_method !== undefined) {
      query.where("subscription_method", filter.subscription_method);
    }
    if (filter.event_type !== undefined) {
      query.where("event_type", filter.event_type);
    }
    if (filter.entity_type !== undefined) {
      if (filter.entity_type === null) {
        query.whereNull("entity_type");
      } else {
        query.where("entity_type", filter.entity_type);
      }
    }
    if (filter.entity_id !== undefined) {
      query.where("entity_id", filter.entity_id);
    }
    if (filter.status !== undefined) {
      query.where("status", filter.status);
    }

    return await query.orderBy("created_at", "desc");
  }

  /**
   * Get all subscriptions for a subscriber
   */
  async getSubscriptionsBySubscriberId(subscriber_id: number): Promise<UserSubscriptionRecord[]> {
    return await this.knex("user_subscriptions").where({ subscriber_id }).orderBy("created_at", "desc");
  }

  /**
   * Update user subscription status
   */
  async updateUserSubscriptionStatus(id: number, status: "ACTIVE" | "INACTIVE"): Promise<number> {
    return await this.knex("user_subscriptions").where({ id }).update({
      status,
      updated_at: this.knex.fn.now(),
    });
  }

  /**
   * Delete user subscription
   */
  async deleteUserSubscription(id: number): Promise<number> {
    return await this.knex("user_subscriptions").where({ id }).del();
  }

  /**
   * Delete all subscriptions for a subscriber
   */
  async deleteAllSubscriptionsBySubscriberId(subscriber_id: number): Promise<number> {
    return await this.knex("user_subscriptions").where({ subscriber_id }).del();
  }

  /**
   * Check if a subscription already exists
   */
  async subscriptionExists(
    subscriber_id: number,
    subscription_method: SubscriptionMethodType,
    event_type: SubscriptionEventType,
    entity_type: string | null,
    entity_id: string | null,
  ): Promise<boolean> {
    const query = this.knex("user_subscriptions").where({ subscriber_id, subscription_method, event_type });

    if (entity_type === null) {
      query.whereNull("entity_type");
    } else {
      query.where("entity_type", entity_type);
    }

    if (entity_id === null) {
      query.whereNull("entity_id");
    } else {
      query.where("entity_id", entity_id);
    }

    const result = await query.first();
    return !!result;
  }

  // ============ Admin Subscriber Listing ============

  /**
   * Get subscribers by method type with pagination
   */
  async getSubscribersByMethodPaginated(
    method: SubscriptionMethodType,
    page: number,
    limit: number,
  ): Promise<SubscriberSummary[]> {
    // Get unique subscriber IDs that have subscriptions with this method
    const subquery = this.knex("user_subscriptions")
      .distinct("subscriber_id")
      .where("subscription_method", method)
      .as("filtered_subscribers");

    const knexInstance = this.knex;
    const results = await this.knex("subscribers as s")
      .select(
        "s.id",
        "s.subscriber_send",
        "s.subscriber_type",
        "s.subscriber_status",
        "s.created_at",
        this.knex.raw("COUNT(us.id) as subscription_count"),
      )
      .innerJoin(subquery, "s.id", "filtered_subscribers.subscriber_id")
      .leftJoin("user_subscriptions as us", function () {
        this.on("s.id", "=", "us.subscriber_id").andOn("us.subscription_method", "=", knexInstance.raw("?", [method]));
      })
      .groupBy("s.id", "s.subscriber_send", "s.subscriber_type", "s.subscriber_status", "s.created_at")
      .orderBy("s.created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit);

    // Now get event types for each subscriber
    const subscriberIds = results.map((r: { id: number }) => r.id);
    const eventTypesMap = new Map<number, SubscriptionEventType[]>();

    if (subscriberIds.length > 0) {
      const eventTypesData = await this.knex("user_subscriptions")
        .select("subscriber_id", "event_type")
        .whereIn("subscriber_id", subscriberIds)
        .where("subscription_method", method)
        .distinct();

      for (const row of eventTypesData) {
        if (!eventTypesMap.has(row.subscriber_id)) {
          eventTypesMap.set(row.subscriber_id, []);
        }
        eventTypesMap.get(row.subscriber_id)!.push(row.event_type as SubscriptionEventType);
      }
    }

    return results.map(
      (row: {
        id: number;
        subscriber_send: string;
        subscriber_type: string;
        subscriber_status: string;
        created_at: Date;
        subscription_count: number | string;
      }) => ({
        id: row.id,
        subscriber_send: row.subscriber_send,
        subscriber_type: row.subscriber_type,
        subscriber_status: row.subscriber_status,
        created_at: row.created_at,
        subscription_count: Number(row.subscription_count),
        event_types: eventTypesMap.get(row.id) || [],
      }),
    );
  }

  /**
   * Get count of subscribers by method type
   */
  async getSubscribersCountByMethod(method: SubscriptionMethodType): Promise<number> {
    const result = await this.knex("user_subscriptions")
      .countDistinct("subscriber_id as count")
      .where("subscription_method", method)
      .first<CountResult>();
    return Number(result?.count || 0);
  }

  /**
   * Get subscriber with all their subscriptions for a specific method
   */
  async getSubscriberWithSubscriptions(
    subscriber_id: number,
    method: SubscriptionMethodType,
  ): Promise<{
    subscriber: SubscriberRecord | undefined;
    subscriptions: UserSubscriptionRecord[];
  }> {
    const subscriber = (await this.knex("subscribers").where({ id: subscriber_id }).first()) as
      | SubscriberRecord
      | undefined;

    const subscriptions = (await this.knex("user_subscriptions")
      .where({ subscriber_id, subscription_method: method })
      .orderBy("created_at", "desc")) as UserSubscriptionRecord[];

    return { subscriber, subscriptions };
  }

  /**
   * Get all active subscriptions for a specific event type and entity
   * Useful for sending notifications
   */
  async getActiveSubscriptionsForEvent(
    event_type: SubscriptionEventType,
    entity_type: string | null,
    entity_id: string | null,
  ): Promise<Array<UserSubscriptionRecord & { subscriber: SubscriberRecord }>> {
    const query = this.knex("user_subscriptions as us")
      .select("us.*", "s.subscriber_send", "s.subscriber_meta", "s.subscriber_type", "s.subscriber_status")
      .join("subscribers as s", "us.subscriber_id", "=", "s.id")
      .where("us.event_type", event_type)
      .where("us.status", "ACTIVE")
      .where("s.subscriber_status", "ACTIVE");

    // Match subscriptions that either:
    // 1. Subscribe to "all" (entity_type is null)
    // 2. Subscribe to this specific entity
    if (entity_type && entity_id) {
      query.andWhere(function () {
        this.whereNull("us.entity_type").orWhere(function () {
          this.where("us.entity_type", entity_type).where("us.entity_id", entity_id);
        });
      });
    } else {
      query.whereNull("us.entity_type");
    }

    const results = await query;

    return results.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      subscriber_id: row.subscriber_id as number,
      subscription_method: row.subscription_method as SubscriptionMethodType,
      event_type: row.event_type as SubscriptionEventType,
      entity_type: row.entity_type as SubscriptionEntityType,
      entity_id: row.entity_id as string | null,
      status: row.status as "ACTIVE" | "INACTIVE",
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
      subscriber: {
        id: row.subscriber_id as number,
        subscriber_send: row.subscriber_send as string,
        subscriber_meta: row.subscriber_meta as string | null,
        subscriber_type: row.subscriber_type as string,
        subscriber_status: row.subscriber_status as string,
        created_at: row.created_at as Date,
        updated_at: row.updated_at as Date,
      },
    }));
  }
}

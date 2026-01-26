import { BaseRepository } from "./base.js";
import type {
  SubscriberUserRecord,
  SubscriberUserRecordInsert,
  SubscriberUserStatus,
  SubscriberMethodRecord,
  SubscriberMethodRecordInsert,
  SubscriptionMethodType,
  SubscriptionStatus,
  UserSubscriptionV2Record,
  UserSubscriptionV2RecordInsert,
  UserSubscriptionV2Filter,
  SubscriptionEventType,
  SubscriptionEntityType,
} from "../../types/db.js";
import { GetDbType } from "../../tool.js";

/**
 * Repository for the new subscription system v2
 * Tables: subscriber_users, subscriber_methods, user_subscriptions_v2
 */
export class SubscriptionSystemRepository extends BaseRepository {
  // ============ Subscriber Users ============

  async createSubscriberUser(data: SubscriberUserRecordInsert): Promise<SubscriberUserRecord> {
    const dbType = GetDbType();
    const insertData = {
      email: data.email.toLowerCase().trim(),
      status: data.status || "PENDING",
      verification_code: data.verification_code || null,
      verification_expires_at: data.verification_expires_at || null,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    };

    if (dbType === "postgresql") {
      const [user] = await this.knex("subscriber_users").insert(insertData).returning("*");
      return user;
    } else {
      const result = await this.knex("subscriber_users").insert(insertData);
      const id = result[0];
      return (await this.getSubscriberUserById(id))!;
    }
  }

  async getSubscriberUserById(id: number): Promise<SubscriberUserRecord | undefined> {
    return await this.knex("subscriber_users").where("id", id).first();
  }

  async getSubscriberUserByEmail(email: string): Promise<SubscriberUserRecord | undefined> {
    return await this.knex("subscriber_users").where("email", email.toLowerCase().trim()).first();
  }

  async updateSubscriberUser(id: number, data: Partial<SubscriberUserRecordInsert>): Promise<number> {
    const updateData: Record<string, unknown> = {
      updated_at: this.knex.fn.now(),
    };
    if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
    if (data.status !== undefined) updateData.status = data.status;
    if (data.verification_code !== undefined) updateData.verification_code = data.verification_code;
    if (data.verification_expires_at !== undefined) updateData.verification_expires_at = data.verification_expires_at;

    return await this.knex("subscriber_users").where("id", id).update(updateData);
  }

  async deleteSubscriberUser(id: number): Promise<number> {
    return await this.knex("subscriber_users").where("id", id).del();
  }

  async getSubscriberUsersCount(status?: SubscriberUserStatus): Promise<number> {
    let query = this.knex("subscriber_users").count("id as count");
    if (status) {
      query = query.where("status", status);
    }
    const result = await query.first();
    return Number(result?.count || 0);
  }

  async getSubscriberUsersPaginated(
    page: number,
    limit: number,
    status?: SubscriberUserStatus,
  ): Promise<SubscriberUserRecord[]> {
    let query = this.knex("subscriber_users").select("*");
    if (status) {
      query = query.where("status", status);
    }
    return await query
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit);
  }

  // ============ Subscriber Methods ============

  async createSubscriberMethod(data: SubscriberMethodRecordInsert): Promise<SubscriberMethodRecord> {
    const dbType = GetDbType();
    const insertData = {
      subscriber_user_id: data.subscriber_user_id,
      method_type: data.method_type,
      method_value: data.method_value.trim(),
      status: data.status || "ACTIVE",
      meta: data.meta || null,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    };

    if (dbType === "postgresql") {
      const [method] = await this.knex("subscriber_methods").insert(insertData).returning("*");
      return method;
    } else {
      const result = await this.knex("subscriber_methods").insert(insertData);
      const id = result[0];
      return (await this.getSubscriberMethodById(id))!;
    }
  }

  async getSubscriberMethodById(id: number): Promise<SubscriberMethodRecord | undefined> {
    return await this.knex("subscriber_methods").where("id", id).first();
  }

  async getSubscriberMethodsByUserId(subscriberUserId: number): Promise<SubscriberMethodRecord[]> {
    return await this.knex("subscriber_methods")
      .where("subscriber_user_id", subscriberUserId)
      .orderBy("created_at", "asc");
  }

  async getSubscriberMethodByUserAndType(
    subscriberUserId: number,
    methodType: SubscriptionMethodType,
    methodValue?: string,
  ): Promise<SubscriberMethodRecord | undefined> {
    let query = this.knex("subscriber_methods")
      .where("subscriber_user_id", subscriberUserId)
      .andWhere("method_type", methodType);

    if (methodValue) {
      query = query.andWhere("method_value", methodValue.trim());
    }

    return await query.first();
  }

  async updateSubscriberMethod(id: number, data: Partial<SubscriberMethodRecordInsert>): Promise<number> {
    const updateData: Record<string, unknown> = {
      updated_at: this.knex.fn.now(),
    };
    if (data.method_value !== undefined) updateData.method_value = data.method_value.trim();
    if (data.status !== undefined) updateData.status = data.status;
    if (data.meta !== undefined) updateData.meta = data.meta;

    return await this.knex("subscriber_methods").where("id", id).update(updateData);
  }

  async deleteSubscriberMethod(id: number): Promise<number> {
    return await this.knex("subscriber_methods").where("id", id).del();
  }

  async getActiveMethodsByType(methodType: SubscriptionMethodType): Promise<SubscriberMethodRecord[]> {
    return await this.knex("subscriber_methods").where("method_type", methodType).andWhere("status", "ACTIVE");
  }

  // ============ User Subscriptions V2 ============

  async createUserSubscriptionV2(data: UserSubscriptionV2RecordInsert): Promise<UserSubscriptionV2Record> {
    const dbType = GetDbType();
    const insertData = {
      subscriber_user_id: data.subscriber_user_id,
      subscriber_method_id: data.subscriber_method_id,
      event_type: data.event_type,
      entity_type: data.entity_type || null,
      entity_id: data.entity_id || null,
      status: data.status || "ACTIVE",
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    };

    if (dbType === "postgresql") {
      const [sub] = await this.knex("user_subscriptions_v2").insert(insertData).returning("*");
      return sub;
    } else {
      const result = await this.knex("user_subscriptions_v2").insert(insertData);
      const id = result[0];
      return (await this.getUserSubscriptionV2ById(id))!;
    }
  }

  async getUserSubscriptionV2ById(id: number): Promise<UserSubscriptionV2Record | undefined> {
    return await this.knex("user_subscriptions_v2").where("id", id).first();
  }

  async getUserSubscriptionsV2(filter: UserSubscriptionV2Filter): Promise<UserSubscriptionV2Record[]> {
    let query = this.knex("user_subscriptions_v2").select("*");

    if (filter.subscriber_user_id !== undefined) {
      query = query.where("subscriber_user_id", filter.subscriber_user_id);
    }
    if (filter.subscriber_method_id !== undefined) {
      query = query.where("subscriber_method_id", filter.subscriber_method_id);
    }
    if (filter.event_type !== undefined) {
      query = query.where("event_type", filter.event_type);
    }
    if (filter.entity_type !== undefined) {
      if (filter.entity_type === null) {
        query = query.whereNull("entity_type");
      } else {
        query = query.where("entity_type", filter.entity_type);
      }
    }
    if (filter.entity_id !== undefined) {
      query = query.where("entity_id", filter.entity_id);
    }
    if (filter.status !== undefined) {
      query = query.where("status", filter.status);
    }

    return await query.orderBy("created_at", "desc");
  }

  async updateUserSubscriptionV2(id: number, data: Partial<UserSubscriptionV2RecordInsert>): Promise<number> {
    const updateData: Record<string, unknown> = {
      updated_at: this.knex.fn.now(),
    };
    if (data.status !== undefined) updateData.status = data.status;

    return await this.knex("user_subscriptions_v2").where("id", id).update(updateData);
  }

  async deleteUserSubscriptionV2(id: number): Promise<number> {
    return await this.knex("user_subscriptions_v2").where("id", id).del();
  }

  async subscriptionV2Exists(
    subscriberUserId: number,
    subscriberMethodId: number,
    eventType: SubscriptionEventType,
    entityType: SubscriptionEntityType,
    entityId: string | null,
  ): Promise<boolean> {
    let query = this.knex("user_subscriptions_v2")
      .where("subscriber_user_id", subscriberUserId)
      .andWhere("subscriber_method_id", subscriberMethodId)
      .andWhere("event_type", eventType);

    if (entityType === null) {
      query = query.whereNull("entity_type");
    } else {
      query = query.where("entity_type", entityType);
    }

    if (entityId === null) {
      query = query.whereNull("entity_id");
    } else {
      query = query.where("entity_id", entityId);
    }

    const result = await query.first();
    return !!result;
  }

  // ============ Complex Queries ============

  /**
   * Get all subscriptions for a user with method details
   */
  async getSubscriptionsWithMethodsForUser(subscriberUserId: number): Promise<
    Array<{
      subscription: UserSubscriptionV2Record;
      method: SubscriberMethodRecord;
    }>
  > {
    const rows = await this.knex("user_subscriptions_v2 as us")
      .join("subscriber_methods as sm", "us.subscriber_method_id", "sm.id")
      .where("us.subscriber_user_id", subscriberUserId)
      .andWhere("us.status", "ACTIVE")
      .select("us.*", "sm.method_type", "sm.method_value", "sm.status as method_status", "sm.meta as method_meta");

    return rows.map((row) => ({
      subscription: {
        id: row.id,
        subscriber_user_id: row.subscriber_user_id,
        subscriber_method_id: row.subscriber_method_id,
        event_type: row.event_type,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      method: {
        id: row.subscriber_method_id,
        subscriber_user_id: row.subscriber_user_id,
        method_type: row.method_type,
        method_value: row.method_value,
        status: row.method_status,
        meta: row.method_meta,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    }));
  }

  /**
   * Get subscribers for a specific event (for sending notifications)
   */
  async getSubscribersForEvent(
    eventType: SubscriptionEventType,
    entityType?: SubscriptionEntityType,
    entityId?: string,
  ): Promise<
    Array<{
      user: SubscriberUserRecord;
      method: SubscriberMethodRecord;
      subscription: UserSubscriptionV2Record;
    }>
  > {
    let query = this.knex("user_subscriptions_v2 as us")
      .join("subscriber_users as su", "us.subscriber_user_id", "su.id")
      .join("subscriber_methods as sm", "us.subscriber_method_id", "sm.id")
      .where("us.event_type", eventType)
      .andWhere("us.status", "ACTIVE")
      .andWhere("su.status", "ACTIVE")
      .andWhere("sm.status", "ACTIVE");

    // Match subscriptions that are for this specific entity OR for "all" (entity_type is null)
    if (entityType && entityId) {
      query = query.andWhere(function () {
        this.whereNull("us.entity_type").orWhere(function () {
          this.where("us.entity_type", entityType).andWhere("us.entity_id", entityId);
        });
      });
    }

    const rows = await query.select(
      "su.id as user_id",
      "su.email as user_email",
      "su.status as user_status",
      "su.created_at as user_created_at",
      "sm.id as method_id",
      "sm.method_type",
      "sm.method_value",
      "sm.status as method_status",
      "sm.meta as method_meta",
      "us.id as sub_id",
      "us.event_type",
      "us.entity_type",
      "us.entity_id",
      "us.status as sub_status",
      "us.created_at as sub_created_at",
    );

    return rows.map((row) => ({
      user: {
        id: row.user_id,
        email: row.user_email,
        status: row.user_status,
        verification_code: null,
        verification_expires_at: null,
        created_at: row.user_created_at,
        updated_at: row.user_created_at,
      },
      method: {
        id: row.method_id,
        subscriber_user_id: row.user_id,
        method_type: row.method_type,
        method_value: row.method_value,
        status: row.method_status,
        meta: row.method_meta,
        created_at: row.sub_created_at,
        updated_at: row.sub_created_at,
      },
      subscription: {
        id: row.sub_id,
        subscriber_user_id: row.user_id,
        subscriber_method_id: row.method_id,
        event_type: row.event_type,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        status: row.sub_status,
        created_at: row.sub_created_at,
        updated_at: row.sub_created_at,
      },
    }));
  }

  /**
   * Get admin summary of all subscribers
   */
  async getSubscribersSummary(
    page: number,
    limit: number,
  ): Promise<
    Array<{
      user: SubscriberUserRecord;
      methods: SubscriberMethodRecord[];
      subscription_count: number;
    }>
  > {
    const users = await this.knex("subscriber_users")
      .select("*")
      .where("status", "ACTIVE")
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit);

    const result = [];
    for (const user of users) {
      const methods = await this.getSubscriberMethodsByUserId(user.id);
      const subCount = await this.knex("user_subscriptions_v2")
        .where("subscriber_user_id", user.id)
        .andWhere("status", "ACTIVE")
        .count("id as count")
        .first();

      result.push({
        user,
        methods,
        subscription_count: Number(subCount?.count || 0),
      });
    }

    return result;
  }

  // ============ Admin Methods for Listing by Method Type ============

  /**
   * Get count of unique users with methods of a specific type
   */
  async getMethodsCountByType(methodType: SubscriptionMethodType): Promise<number> {
    const result = await this.knex("subscriber_methods")
      .countDistinct("subscriber_user_id as count")
      .where("method_type", methodType)
      .andWhere("status", "ACTIVE")
      .first();
    return Number(result?.count || 0);
  }

  /**
   * Get subscribers by method type with pagination for admin
   */
  async getSubscribersByMethodTypeV2(
    methodType: SubscriptionMethodType,
    page: number,
    limit: number,
  ): Promise<
    Array<{
      id: number;
      email: string;
      method_value: string;
      method_id: number;
      status: string;
      created_at: Date;
      subscription_count: number;
      event_types: SubscriptionEventType[];
    }>
  > {
    // Get methods of this type with their users
    const methods = await this.knex("subscriber_methods as sm")
      .join("subscriber_users as su", "sm.subscriber_user_id", "su.id")
      .where("sm.method_type", methodType)
      .andWhere("sm.status", "ACTIVE")
      .andWhere("su.status", "ACTIVE")
      .select("su.id as user_id", "su.email", "sm.id as method_id", "sm.method_value", "sm.status", "sm.created_at")
      .orderBy("sm.created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit);

    // Get subscription counts and event types for each method
    const result = [];
    for (const method of methods) {
      const subCount = await this.knex("user_subscriptions_v2")
        .where("subscriber_method_id", method.method_id)
        .andWhere("status", "ACTIVE")
        .count("id as count")
        .first();

      const eventTypes = await this.knex("user_subscriptions_v2")
        .where("subscriber_method_id", method.method_id)
        .andWhere("status", "ACTIVE")
        .distinct("event_type")
        .pluck("event_type");

      result.push({
        id: method.user_id,
        email: method.email,
        method_value: method.method_value,
        method_id: method.method_id,
        status: method.status,
        created_at: method.created_at,
        subscription_count: Number(subCount?.count || 0),
        event_types: eventTypes as SubscriptionEventType[],
      });
    }

    return result;
  }

  /**
   * Get a specific subscriber's details for admin viewing
   */
  async getSubscriberDetailsByMethodId(methodId: number): Promise<{
    user: SubscriberUserRecord;
    method: SubscriberMethodRecord;
    subscriptions: UserSubscriptionV2Record[];
  } | null> {
    const method = await this.knex("subscriber_methods").where("id", methodId).first();
    if (!method) return null;

    const user = await this.knex("subscriber_users").where("id", method.subscriber_user_id).first();
    if (!user) return null;

    const subscriptions = await this.knex("user_subscriptions_v2")
      .where("subscriber_method_id", methodId)
      .andWhere("status", "ACTIVE")
      .orderBy("created_at", "desc");

    return { user, method, subscriptions };
  }
}

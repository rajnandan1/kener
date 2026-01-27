import db from "$lib/server/db/db.js";
import type {
  UserSubscriptionRecord,
  UserSubscriptionRecordInsert,
  UserSubscriptionFilter,
  SubscriptionMethodType,
  SubscriptionEventType,
  SubscriberSummary,
  SubscriberRecord,
  UserSubscriptionV2Record,
  SubscriberUserRecord,
  SubscriberMethodRecord,
  SubscriptionEntityType,
} from "$lib/server/types/db.js";

// ============ V2 Admin Functions ============

/**
 * Get subscribers by method type with pagination (for admin) - V2 version
 */
export async function GetSubscribersByMethod(
  method: SubscriptionMethodType,
  page: number = 1,
  limit: number = 25,
): Promise<{
  subscribers: Array<{
    id: number;
    subscriber_send: string;
    subscriber_type: string;
    subscriber_status: string;
    created_at: Date;
    subscription_count: number;
    event_types: SubscriptionEventType[];
  }>;
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}> {
  // Use V2 tables
  const rawSubscribers = await db.getSubscribersByMethodTypeV2(method, page, limit);
  const total = await db.getMethodsCountByType(method);
  const totalPages = Math.ceil(total / limit);

  // Map to expected format for compatibility with existing UI
  const subscribers = rawSubscribers.map((s) => ({
    id: s.method_id, // Use method_id as ID since that's what we need for details page
    subscriber_send: s.method_value,
    subscriber_type: method,
    subscriber_status: s.status,
    created_at: s.created_at,
    subscription_count: s.subscription_count,
    event_types: s.event_types,
  }));

  return {
    subscribers,
    total,
    totalPages,
    page,
    limit,
  };
}

/**
 * Get subscriber counts by method (for admin dashboard) - V2 version
 */
export async function GetSubscriberCountsByMethod(): Promise<{
  email: number;
  webhook: number;
  slack: number;
  discord: number;
}> {
  const [email, webhook, slack, discord] = await Promise.all([
    db.getMethodsCountByType("email"),
    db.getMethodsCountByType("webhook"),
    db.getMethodsCountByType("slack"),
    db.getMethodsCountByType("discord"),
  ]);

  return { email, webhook, slack, discord };
}

/**
 * Get subscriber details by method ID - V2 version
 */
export async function GetSubscriberWithSubscriptionsV2(methodId: number): Promise<{
  user: SubscriberUserRecord;
  method: SubscriberMethodRecord;
  subscriptions: UserSubscriptionV2Record[];
} | null> {
  return await db.getSubscriberDetailsByMethodId(methodId);
}

// ============ Legacy Functions (still using old tables for backward compatibility) ============

/**
 * Get subscriber with all their subscriptions for a specific method
 * @deprecated Use GetSubscriberWithSubscriptionsV2 instead
 */
export async function GetSubscriberWithSubscriptions(
  subscriberId: number,
  method: SubscriptionMethodType,
): Promise<{
  subscriber: SubscriberRecord | undefined;
  subscriptions: UserSubscriptionRecord[];
}> {
  return await db.getSubscriberWithSubscriptions(subscriberId, method);
}

/**
 * Get all subscriptions for a subscriber (all methods)
 */
export async function GetSubscriberAllSubscriptions(subscriberId: number): Promise<UserSubscriptionRecord[]> {
  return await db.getSubscriptionsBySubscriberIdNew(subscriberId);
}

/**
 * Create a new subscription for a subscriber
 */
export async function CreateUserSubscription(
  data: UserSubscriptionRecordInsert,
): Promise<{ success: boolean; error?: string }> {
  // Check if subscription already exists
  const exists = await db.subscriptionExists(
    data.subscriber_id,
    data.subscription_method,
    data.event_type,
    data.entity_type ?? null,
    data.entity_id ?? null,
  );

  if (exists) {
    return { success: false, error: "Subscription already exists" };
  }

  await db.insertUserSubscription(data);
  return { success: true };
}

/**
 * Delete a subscription - V2 version
 */
export async function DeleteUserSubscription(id: number): Promise<{ success: boolean; error?: string }> {
  // Try V2 first
  const subscriptionV2 = await db.getUserSubscriptionV2ById(id);
  if (subscriptionV2) {
    await db.deleteUserSubscriptionV2(id);
    return { success: true };
  }

  // Fall back to V1 for backward compatibility
  const subscription = await db.getUserSubscriptionById(id);
  if (!subscription) {
    return { success: false, error: "Subscription not found" };
  }

  await db.deleteUserSubscription(id);
  return { success: true };
}

/**
 * Update subscription status - V2 version
 */
export async function UpdateUserSubscriptionStatus(
  id: number,
  status: "ACTIVE" | "INACTIVE",
): Promise<{ success: boolean; error?: string }> {
  // Try V2 first
  const subscriptionV2 = await db.getUserSubscriptionV2ById(id);
  if (subscriptionV2) {
    await db.updateUserSubscriptionV2(id, { status });
    return { success: true };
  }

  // Fall back to V1 for backward compatibility
  const subscription = await db.getUserSubscriptionById(id);
  if (!subscription) {
    return { success: false, error: "Subscription not found" };
  }

  await db.updateUserSubscriptionStatus(id, status);
  return { success: true };
}

/**
 * Get subscriptions by filter
 */
export async function GetUserSubscriptions(filter: UserSubscriptionFilter): Promise<UserSubscriptionRecord[]> {
  return await db.getUserSubscriptions(filter);
}

/**
 * Get all active subscriptions for an event (for sending notifications)
 */
export async function GetActiveSubscriptionsForEvent(
  eventType: SubscriptionEventType,
  entityType: string | null = null,
  entityId: string | null = null,
): Promise<Array<UserSubscriptionRecord & { subscriber: SubscriberRecord }>> {
  return await db.getActiveSubscriptionsForEvent(eventType, entityType, entityId);
}

/**
 * Delete all subscriptions for a subscriber
 */
export async function DeleteAllSubscriptionsForSubscriber(
  subscriberId: number,
): Promise<{ success: boolean; deletedCount: number }> {
  const deletedCount = await db.deleteAllSubscriptionsBySubscriberId(subscriberId);
  return { success: true, deletedCount };
}

/**
 * Format event type for display
 */
export function FormatEventType(eventType: SubscriptionEventType): string {
  switch (eventType) {
    case "incidentUpdatesAll":
      return "Incident Updates";
    case "maintenanceUpdatesAll":
      return "Maintenance Updates";
    case "monitorUpdatesAll":
      return "Monitor Updates";
    default:
      return eventType;
  }
}

/**
 * Format entity type for display
 */
export function FormatEntityType(entityType: string | null): string {
  if (!entityType) return "All";
  switch (entityType) {
    case "monitor":
      return "Monitor";
    case "incident":
      return "Incident";
    case "maintenance":
      return "Maintenance";
    default:
      return entityType;
  }
}

//getSubscriptionMethodsByEntity
export async function GetSubscriptionMethodsByEntity(
  entity_type: string,
  entity_id: string,
): Promise<
  Array<{
    method: SubscriberMethodRecord;
    user: SubscriberUserRecord;
    subscription: UserSubscriptionV2Record;
  }>
> {
  return await db.getSubscriptionMethodsByEntity(entity_type as SubscriptionEntityType, entity_id);
}

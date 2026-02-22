import db from "$lib/server/db/db.js";
import type {
  UserSubscriptionRecord,
  UserSubscriptionRecordInsert,
  UserSubscriptionFilter,
  SubscriptionMethodType,
  SubscriptionEventType,
  SubscriberSummary,
  UserSubscriptionV2Record,
  SubscriberUserRecord,
  SubscriberMethodRecord,
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
}> {
  const [email] = await Promise.all([db.getMethodsCountByType("email")]);

  return { email };
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
 * Delete a subscription - V2 version
 */
export async function DeleteUserSubscription(id: number): Promise<{ success: boolean; error?: string }> {
  await db.deleteUserSubscriptionV2(id);
  return { success: true };
}

/**
 * Update subscription status - V2 version
 */
export async function UpdateUserSubscriptionStatus(
  id: number,
  status: "ACTIVE" | "INACTIVE",
): Promise<{ success: boolean; error?: string }> {
  await db.updateUserSubscriptionV2(id, { status });
  return { success: true };
}

/**
 * Format event type for display
 */
export function FormatEventType(eventType: SubscriptionEventType): string {
  switch (eventType) {
    case "incidents":
      return "Incident Updates";
    case "maintenances":
      return "Maintenance Updates";
    default:
      return eventType;
  }
}

// ============ Admin Subscriber Management Functions ============

export interface AdminSubscriberRecord {
  user_id: number;
  method_id: number;
  email: string;
  incidents_enabled: boolean;
  maintenances_enabled: boolean;
  incidents_subscription_id: number | null;
  maintenances_subscription_id: number | null;
  created_at: Date;
}

/**
 * Get paginated list of subscribers for admin view
 */
export async function GetAdminSubscribersPaginated(
  page: number = 1,
  limit: number = 10,
): Promise<{
  subscribers: AdminSubscriberRecord[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}> {
  // Get all active subscriber users with email methods
  const result = await db.getSubscribersByMethodTypeV2("email", page, limit);
  const total = await db.getMethodsCountByType("email");
  const totalPages = Math.ceil(total / limit);

  // Transform to admin record format with subscription statuses
  const subscribers: AdminSubscriberRecord[] = [];

  for (const item of result) {
    // Get subscriptions for this method
    const subscriptions = await db.getUserSubscriptionsV2({
      subscriber_method_id: item.method_id,
    });

    const incidentsSub = subscriptions.find((s) => s.event_type === "incidents");
    const maintenancesSub = subscriptions.find((s) => s.event_type === "maintenances");

    subscribers.push({
      user_id: item.id,
      method_id: item.method_id,
      email: item.email,
      incidents_enabled: incidentsSub?.status === "ACTIVE",
      maintenances_enabled: maintenancesSub?.status === "ACTIVE",
      incidents_subscription_id: incidentsSub?.id || null,
      maintenances_subscription_id: maintenancesSub?.id || null,
      created_at: item.created_at,
    });
  }

  return {
    subscribers,
    total,
    totalPages,
    page,
    limit,
  };
}

/**
 * Admin: Update a subscription's status
 */
export async function AdminUpdateSubscriptionStatus(
  methodId: number,
  eventType: SubscriptionEventType,
  enabled: boolean,
): Promise<{ success: boolean; error?: string }> {
  // Get method details to get user_id
  const methodDetails = await db.getSubscriberMethodById(methodId);
  if (!methodDetails) {
    return { success: false, error: "Method not found" };
  }

  // Get existing subscription
  const subs = await db.getUserSubscriptionsV2({
    subscriber_method_id: methodId,
    event_type: eventType,
  });

  if (enabled) {
    // Enable subscription
    if (subs.length === 0) {
      // Create new subscription
      await db.createUserSubscriptionV2({
        subscriber_user_id: methodDetails.subscriber_user_id,
        subscriber_method_id: methodId,
        event_type: eventType,
        status: "ACTIVE",
      });
    } else if (subs[0].status !== "ACTIVE") {
      // Reactivate existing
      await db.updateUserSubscriptionV2(subs[0].id, { status: "ACTIVE" });
    }
  } else {
    // Disable subscription
    if (subs.length > 0 && subs[0].status === "ACTIVE") {
      await db.updateUserSubscriptionV2(subs[0].id, { status: "INACTIVE" });
    }
  }

  return { success: true };
}

/**
 * Admin: Delete a subscriber completely (user, method, and all subscriptions)
 */
export async function AdminDeleteSubscriber(methodId: number): Promise<{ success: boolean; error?: string }> {
  // Get method to find user
  const method = await db.getSubscriberMethodById(methodId);
  if (!method) {
    return { success: false, error: "Subscriber not found" };
  }

  // Delete all subscriptions for this method
  const subscriptions = await db.getUserSubscriptionsV2({
    subscriber_method_id: methodId,
  });

  for (const sub of subscriptions) {
    await db.deleteUserSubscriptionV2(sub.id);
  }

  // Delete the method
  await db.deleteSubscriberMethod(methodId);

  // Check if user has any other methods
  const otherMethods = await db.getSubscriberMethodsByUserId(method.subscriber_user_id);
  if (otherMethods.length === 0) {
    // Delete the user too
    await db.deleteSubscriberUser(method.subscriber_user_id);
  }

  return { success: true };
}

/**
 * Admin: Add a new subscriber with specified subscriptions
 */
export async function AdminAddSubscriber(
  email: string,
  incidents: boolean,
  maintenances: boolean,
): Promise<{ success: boolean; error?: string; subscriber?: AdminSubscriberRecord }> {
  if (!ValidateEmail(email)) {
    return { success: false, error: "Invalid email address" };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  let user = await db.getSubscriberUserByEmail(normalizedEmail);
  if (!user) {
    // Create new user
    user = await db.createSubscriberUser({
      email: normalizedEmail,
      status: "ACTIVE",
    });
  } else if (user.status !== "ACTIVE") {
    // Activate existing user
    await db.updateSubscriberUser(user.id, { status: "ACTIVE" });
  }

  // Check if email method exists
  let method = await db.getSubscriberMethodByUserAndType(user.id, "email", normalizedEmail);
  if (!method) {
    method = await db.createSubscriberMethod({
      subscriber_user_id: user.id,
      method_type: "email",
      method_value: normalizedEmail,
      status: "ACTIVE",
    });
  } else if (method.status !== "ACTIVE") {
    await db.updateSubscriberMethod(method.id, { status: "ACTIVE" });
  }

  // Create/update subscriptions
  let incidentsSub = null;
  let maintenancesSub = null;

  if (incidents) {
    const existing = await db.getUserSubscriptionsV2({
      subscriber_method_id: method.id,
      event_type: "incidents",
    });
    if (existing.length === 0) {
      incidentsSub = await db.createUserSubscriptionV2({
        subscriber_user_id: user.id,
        subscriber_method_id: method.id,
        event_type: "incidents",
        status: "ACTIVE",
      });
    } else {
      await db.updateUserSubscriptionV2(existing[0].id, { status: "ACTIVE" });
      incidentsSub = existing[0];
    }
  }

  if (maintenances) {
    const existing = await db.getUserSubscriptionsV2({
      subscriber_method_id: method.id,
      event_type: "maintenances",
    });
    if (existing.length === 0) {
      maintenancesSub = await db.createUserSubscriptionV2({
        subscriber_user_id: user.id,
        subscriber_method_id: method.id,
        event_type: "maintenances",
        status: "ACTIVE",
      });
    } else {
      await db.updateUserSubscriptionV2(existing[0].id, { status: "ACTIVE" });
      maintenancesSub = existing[0];
    }
  }

  return {
    success: true,
    subscriber: {
      user_id: user.id,
      method_id: method.id,
      email: normalizedEmail,
      incidents_enabled: incidents,
      maintenances_enabled: maintenances,
      incidents_subscription_id: incidentsSub?.id || null,
      maintenances_subscription_id: maintenancesSub?.id || null,
      created_at: method.created_at,
    },
  };
}

/**
 * Get active email addresses for a given event type
 * Used for sending notification emails to subscribers
 */
export async function GetActiveEmailsForEventType(eventType: SubscriptionEventType): Promise<string[]> {
  const subscribers = await db.getSubscribersForEvent(eventType);

  // Filter for email method type and extract unique email addresses
  const emails = subscribers.filter((s) => s.method.method_type === "email").map((s) => s.method.method_value);

  // Return unique emails
  return [...new Set(emails)];
}

// ============ Public Subscription Functions ============

import { GenerateTokenWithExpiry, VerifyToken } from "./commonController.js";
import { GenerateRandomNumber, ValidateEmail, GetNowTimestampUTC } from "../tool.js";
import sendEmail from "../notification/email_notification.js";
import { GetAllSiteData } from "./controller.js";
import { siteDataToVariables } from "../notification/notification_utils.js";
import { GetGeneralEmailTemplateById } from "./generalTemplateController.js";

interface SubscriberTokenPayload {
  subscriber_user_id: number;
  subscriber_method_id: number;
  email: string;
  type: "subscriber";
}

/**
 * Verify subscriber token and return subscriber info
 */
export async function VerifySubscriberToken(token: string): Promise<{
  success: boolean;
  error?: string;
  user?: SubscriberUserRecord;
  method?: SubscriberMethodRecord;
  subscriptions?: { incidents: boolean; maintenances: boolean };
}> {
  const decoded = await VerifyToken(token);
  if (!decoded || (decoded as unknown as SubscriberTokenPayload).type !== "subscriber") {
    return { success: false, error: "Invalid or expired token" };
  }

  const payload = decoded as unknown as SubscriberTokenPayload;
  const user = await db.getSubscriberUserById(payload.subscriber_user_id);
  if (!user || user.status !== "ACTIVE") {
    return { success: false, error: "User not found or inactive" };
  }

  const method = await db.getSubscriberMethodById(payload.subscriber_method_id);
  if (!method || method.status !== "ACTIVE") {
    return { success: false, error: "Subscription method not found or inactive" };
  }

  // Get subscriptions
  const allSubs = await db.getUserSubscriptionsV2({
    subscriber_user_id: user.id,
    subscriber_method_id: method.id,
  });

  const subscriptions = {
    incidents: allSubs.some((s) => s.event_type === "incidents" && s.status === "ACTIVE"),
    maintenances: allSubs.some((s) => s.event_type === "maintenances" && s.status === "ACTIVE"),
  };

  return { success: true, user, method, subscriptions };
}

/**
 * Login/Register subscriber - send verification code
 */
export async function SubscriberLogin(email: string): Promise<{ success: boolean; error?: string }> {
  if (!ValidateEmail(email)) {
    return { success: false, error: "Invalid email address" };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const verificationCode = String(GenerateRandomNumber(6));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Check if user exists
  let user = await db.getSubscriberUserByEmail(normalizedEmail);

  if (!user) {
    // Create new user
    user = await db.createSubscriberUser({
      email: normalizedEmail,
      status: "PENDING",
      verification_code: verificationCode,
      verification_expires_at: expiresAt,
    });
  } else {
    // Update verification code
    await db.updateSubscriberUser(user.id, {
      verification_code: verificationCode,
      verification_expires_at: expiresAt,
    });
  }

  // Get email template
  const template = await GetGeneralEmailTemplateById("subscription_account_code");
  if (!template) {
    return { success: false, error: "Email template not found" };
  }

  // Get site data for variables
  const siteData = await GetAllSiteData();
  const siteVars = siteDataToVariables(siteData);

  // Prepare variables
  const emailVars = {
    ...siteVars,
    email_code: verificationCode,
  };

  // Send email
  try {
    await sendEmail(
      template.template_html_body || "",
      template.template_subject || "Your Verification Code",
      emailVars,
      [normalizedEmail],
      undefined,
      template.template_text_body || "",
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return { success: false, error: "Failed to send verification email" };
  }
}

/**
 * Verify OTP and return token
 */
export async function VerifySubscriberOTP(
  email: string,
  code: string,
): Promise<{ success: boolean; error?: string; token?: string }> {
  if (!ValidateEmail(email)) {
    return { success: false, error: "Invalid email address" };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await db.getSubscriberUserByEmail(normalizedEmail);

  if (!user) {
    return { success: false, error: "User not found" };
  }

  // Check verification code
  if (user.verification_code !== code) {
    return { success: false, error: "Invalid verification code" };
  }

  // Check expiry
  if (user.verification_expires_at && new Date(user.verification_expires_at) < new Date()) {
    return { success: false, error: "Verification code expired" };
  }

  // Activate user
  await db.updateSubscriberUser(user.id, {
    status: "ACTIVE",
    verification_code: null,
    verification_expires_at: null,
  });

  // Create or get email method
  let method = await db.getSubscriberMethodByUserAndType(user.id, "email", normalizedEmail);
  if (!method) {
    method = await db.createSubscriberMethod({
      subscriber_user_id: user.id,
      method_type: "email",
      method_value: normalizedEmail,
      status: "ACTIVE",
    });
  }

  // Generate token (1 year expiry)
  const tokenPayload: SubscriberTokenPayload = {
    subscriber_user_id: user.id,
    subscriber_method_id: method.id,
    email: normalizedEmail,
    type: "subscriber",
  };

  const token = await GenerateTokenWithExpiry(tokenPayload, "1y");
  return { success: true, token };
}

/**
 * Update subscription preferences
 */
export async function UpdateSubscriberPreferences(
  token: string,
  preferences: { incidents?: boolean; maintenances?: boolean },
): Promise<{ success: boolean; error?: string }> {
  const verifyResult = await VerifySubscriberToken(token);
  if (!verifyResult.success || !verifyResult.user || !verifyResult.method) {
    return { success: false, error: verifyResult.error || "Invalid token" };
  }

  const { user, method } = verifyResult;

  // Handle incidents subscription
  if (preferences.incidents !== undefined) {
    const existingSub = await db.getUserSubscriptionsV2({
      subscriber_user_id: user.id,
      subscriber_method_id: method.id,
      event_type: "incidents",
    });

    if (preferences.incidents) {
      // Enable
      if (existingSub.length === 0) {
        await db.createUserSubscriptionV2({
          subscriber_user_id: user.id,
          subscriber_method_id: method.id,
          event_type: "incidents",
          status: "ACTIVE",
        });
      } else if (existingSub[0].status !== "ACTIVE") {
        await db.updateUserSubscriptionV2(existingSub[0].id, { status: "ACTIVE" });
      }
    } else {
      // Disable
      if (existingSub.length > 0 && existingSub[0].status === "ACTIVE") {
        await db.updateUserSubscriptionV2(existingSub[0].id, { status: "INACTIVE" });
      }
    }
  }

  // Handle maintenances subscription
  if (preferences.maintenances !== undefined) {
    const existingSub = await db.getUserSubscriptionsV2({
      subscriber_user_id: user.id,
      subscriber_method_id: method.id,
      event_type: "maintenances",
    });

    if (preferences.maintenances) {
      // Enable
      if (existingSub.length === 0) {
        await db.createUserSubscriptionV2({
          subscriber_user_id: user.id,
          subscriber_method_id: method.id,
          event_type: "maintenances",
          status: "ACTIVE",
        });
      } else if (existingSub[0].status !== "ACTIVE") {
        await db.updateUserSubscriptionV2(existingSub[0].id, { status: "ACTIVE" });
      }
    } else {
      // Disable
      if (existingSub.length > 0 && existingSub[0].status === "ACTIVE") {
        await db.updateUserSubscriptionV2(existingSub[0].id, { status: "INACTIVE" });
      }
    }
  }

  return { success: true };
}

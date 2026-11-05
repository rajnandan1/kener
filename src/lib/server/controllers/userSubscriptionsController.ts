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
  SubscriptionMigrationReportRecord,
  DbTimestamp,
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
    created_at: DbTimestamp;
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
    case "monitors":
      return "Monitor Updates";
    default:
      return eventType;
  }
}

// ============ Admin Subscriber Management Functions ============

export interface AdminSubscriberRecord {
  user_id: number;
  method_id: number;
  email: string;
  monitor_tags: string[];
  created_at: DbTimestamp;
}

export interface SubscribableMonitor {
  tag: string;
  name: string;
}

/**
 * Monitors a subscriber may pick: the active ones a status page shows. Hidden monitors are left out.
 */
export async function GetSubscribableMonitors(): Promise<SubscribableMonitor[]> {
  const monitors = await db.getMonitors({ status: "ACTIVE", is_hidden: "NO" });
  return monitors
    .map((m) => ({ tag: m.tag, name: m.name }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.tag.localeCompare(b.tag));
}

/**
 * Adds and removes monitors of one subscriber method. Only subscribable monitors can be added;
 * any monitor can be removed, so a subscriber can still drop one that has since been hidden.
 */
async function ApplySubscriberMonitorChanges(
  method: SubscriberMethodRecord,
  changes: Record<string, boolean>,
): Promise<string[]> {
  const subscribable = new Set((await GetSubscribableMonitors()).map((m) => m.tag));
  const toAdd = Object.keys(changes).filter((tag) => changes[tag] === true && subscribable.has(tag));
  const toRemove = Object.keys(changes).filter((tag) => changes[tag] === false);
  await db.addSubscriberMonitors(method.subscriber_user_id, method.id, toAdd);
  await db.removeSubscriberMonitors(method.id, toRemove);
  return await db.getSubscriberMonitorTags(method.id);
}

/**
 * Get paginated list of subscribers for admin view
 */
export async function GetAdminSubscribersPaginated(
  page: number = 1,
  limit: number = 10,
): Promise<{
  subscribers: AdminSubscriberRecord[];
  monitors: SubscribableMonitor[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}> {
  // Get all active subscriber users with email methods
  const result = await db.getSubscribersByMethodTypeV2("email", page, limit);
  const total = await db.getMethodsCountByType("email");
  const totalPages = Math.ceil(total / limit);

  const subscribers: AdminSubscriberRecord[] = [];
  for (const item of result) {
    subscribers.push({
      user_id: item.id,
      method_id: item.method_id,
      email: item.email,
      monitor_tags: await db.getSubscriberMonitorTags(item.method_id),
      created_at: item.created_at,
    });
  }

  return {
    subscribers,
    monitors: await GetSubscribableMonitors(),
    total,
    totalPages,
    page,
    limit,
  };
}

/**
 * Admin: Replace the monitors a subscriber method is subscribed to
 */
export async function AdminSetSubscriberMonitors(
  methodId: number,
  monitorTags: string[],
): Promise<{ success: boolean; error?: string; monitor_tags?: string[] }> {
  const method = await db.getSubscriberMethodById(methodId);
  if (!method) {
    return { success: false, error: "Method not found" };
  }

  const wanted = new Set(monitorTags);
  const changes: Record<string, boolean> = {};
  for (const tag of await db.getSubscriberMonitorTags(method.id)) {
    if (!wanted.has(tag)) changes[tag] = false;
  }
  for (const tag of wanted) {
    changes[tag] = true;
  }

  return { success: true, monitor_tags: await ApplySubscriberMonitorChanges(method, changes) };
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
  await db.deleteSubscriberMonitorsByMethodId(methodId);

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
 * Admin: Add a new subscriber subscribed to the given monitors
 */
export async function AdminAddSubscriber(
  email: string,
  monitorTags: string[],
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

  const changes = Object.fromEntries(monitorTags.map((tag) => [tag, true]));
  const subscribedTags = await ApplySubscriberMonitorChanges(method, changes);

  return {
    success: true,
    subscriber: {
      user_id: user.id,
      method_id: method.id,
      email: normalizedEmail,
      monitor_tags: subscribedTags,
      created_at: method.created_at,
    },
  };
}

/**
 * Admin: legacy subscribers and subscriptions the upgrade could not copy, newest first
 */
export async function GetSubscriptionMigrationReport(
  page: number = 1,
  limit: number = 25,
): Promise<{
  rows: SubscriptionMigrationReportRecord[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}> {
  const [rows, total] = await Promise.all([
    db.getSubscriptionMigrationReport(page, limit),
    db.getSubscriptionMigrationReportCount(),
  ]);
  return { rows, total, totalPages: Math.ceil(total / limit), page, limit };
}

/**
 * Get active email addresses subscribed to any of the given monitors
 * Used for sending notification emails to subscribers
 */
export async function GetActiveEmailsForMonitors(monitorTags: string[]): Promise<string[]> {
  return await db.getEmailsSubscribedToMonitors([...new Set(monitorTags)]);
}

type SubscriptionSettingsLike = {
  enable?: boolean;
  methods?: { emails?: { monitors?: boolean; incidents?: boolean; maintenances?: boolean } };
} | null;

/**
 * Whether the status page offers email subscriptions. Settings saved before monitor
 * subscriptions have no `monitors` flag; there, either of the old flags keeps them on.
 */
export function IsEmailSubscriptionEnabled(settings: SubscriptionSettingsLike | undefined): boolean {
  if (!settings?.enable) return false;
  const emails = settings.methods?.emails;
  return emails?.monitors ?? (emails?.incidents === true || emails?.maintenances === true);
}

// ============ Public Subscription Functions ============

import { timingSafeEqual } from "node:crypto";
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
  monitorTags?: string[];
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

  const monitorTags = await db.getSubscriberMonitorTags(method.id);

  return { success: true, user, method, monitorTags };
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
  code: unknown,
): Promise<{ success: boolean; error?: string; token?: string }> {
  if (!ValidateEmail(email)) {
    return { success: false, error: "Invalid email address" };
  }

  // A code is the six digits SubscriberLogin mailed, good until its expiry. A subscriber with no pending
  // code (one never asked for, already used, or an account an admin or the legacy migration created) has
  // nothing to match: comparing null with null must not sign anyone in. An unknown email gets the same
  // answer as a wrong code, so the reply does not tell who subscribes.
  const invalid = { success: false, error: "Invalid verification code" };
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return invalid;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await db.getSubscriberUserByEmail(normalizedEmail);

  if (!user || !user.verification_code || !user.verification_expires_at) {
    return invalid;
  }

  const expected = Buffer.from(String(user.verification_code));
  const given = Buffer.from(code);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return invalid;
  }

  if (new Date(user.verification_expires_at) < new Date()) {
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
 * Subscribe to or unsubscribe from monitors: `changes` maps a monitor tag to whether to follow it
 */
export async function UpdateSubscriberMonitors(
  token: string,
  changes: Record<string, boolean>,
): Promise<{ success: boolean; error?: string; monitorTags?: string[] }> {
  const verifyResult = await VerifySubscriberToken(token);
  if (!verifyResult.success || !verifyResult.method) {
    return { success: false, error: verifyResult.error || "Invalid token" };
  }

  const monitorTags = await ApplySubscriberMonitorChanges(verifyResult.method, changes);
  return { success: true, monitorTags };
}

import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import { ValidateEmail, GenerateRandomNumber, ValidateURL } from "$lib/server/tool";
import { GenerateTokenWithExpiry, VerifyToken } from "$lib/server/controllers/commonController";
import { SendEmailWithTemplate, IsEmailSetup } from "$lib/server/controllers/emailController";
import { GetSiteLogoURL, GetAllSiteData } from "$lib/server/controllers/siteDataController";
import { GetSubscriptionConfig } from "$lib/server/controllers/subscriptionConfigController";
import db from "$lib/server/db/db";
import emailCodeTemplate from "$lib/server/templates/email_code";
import type { SubscriptionMethodType, SubscriptionEventType, SubscriptionEntityType } from "$lib/server/types/db";

interface SubscriptionV2RequestBody {
  action:
    | "getConfig"
    | "login"
    | "verify"
    | "fetchUser"
    | "addMethod"
    | "removeMethod"
    | "fetchSubscriptions"
    | "subscribe"
    | "unsubscribe"
    | "deleteAccount";
  email?: string;
  token?: string;
  code?: string;
  method_type?: SubscriptionMethodType;
  method_value?: string;
  method_id?: number;
  subscription_id?: number;
  subscriptions?: Array<{
    method_id: number;
    event_type: SubscriptionEventType;
    entity_type?: SubscriptionEntityType;
    entity_id?: string;
  }>;
}

/**
 * POST /dashboard-apis/subscription-v2
 * Handles all V2 user subscription-related actions
 *
 * Flow:
 * 1. User enters email → login() → sends verification code
 * 2. User enters code → verify() → returns auth token + creates/retrieves user
 * 3. User can then:
 *    - fetchUser() → get user profile with methods
 *    - addMethod() → add webhook/slack/discord methods
 *    - removeMethod() → remove a method
 *    - fetchSubscriptions() → get all subscriptions
 *    - subscribe() → subscribe to events via specific methods
 *    - unsubscribe() → remove a subscription
 *    - deleteAccount() → delete user and all their data
 */
export default async function post(req: APIServerRequest): Promise<Response> {
  const body = req.body as SubscriptionV2RequestBody;
  const { action } = body;

  try {
    switch (action) {
      case "getConfig":
        return await handleGetConfig();
      case "login":
        return await handleLogin(body.email);
      case "verify":
        return await handleVerify(body.token, body.code);
      case "fetchUser":
        return await handleFetchUser(body.token);
      case "addMethod":
        return await handleAddMethod(body.token, body.method_type, body.method_value);
      case "removeMethod":
        return await handleRemoveMethod(body.token, body.method_id);
      case "fetchSubscriptions":
        return await handleFetchSubscriptions(body.token);
      case "subscribe":
        return await handleSubscribe(body.token, body.subscriptions);
      case "unsubscribe":
        return await handleUnsubscribe(body.token, body.subscription_id);
      case "deleteAccount":
        return await handleDeleteAccount(body.token);
      default:
        return error(400, { message: "Invalid action" });
    }
  } catch (e) {
    console.error("Subscription V2 API error:", e);
    const message = e instanceof Error ? e.message : "Error processing subscription request";
    return error(500, { message });
  }
}

/**
 * Get subscription configuration for users
 */
async function handleGetConfig(): Promise<Response> {
  const config = await GetSubscriptionConfig();
  if (!config) {
    return json({
      enabled: false,
      events_enabled: {
        incidentUpdatesAll: false,
        maintenanceUpdatesAll: false,
        monitorUpdatesAll: false,
      },
      methods_enabled: {
        email: false,
        webhook: false,
        slack: false,
        discord: false,
      },
    });
  }

  // Check if email is actually set up
  const emailSetup = IsEmailSetup();
  const methodsEnabled = {
    ...config.methods_enabled,
    email: config.methods_enabled.email && emailSetup,
  };

  // Check if any event is enabled
  const anyEventEnabled =
    config.events_enabled.incidentUpdatesAll ||
    config.events_enabled.maintenanceUpdatesAll ||
    config.events_enabled.monitorUpdatesAll;

  // Check if any method is enabled
  const anyMethodEnabled =
    methodsEnabled.email || methodsEnabled.webhook || methodsEnabled.slack || methodsEnabled.discord;

  return json({
    enabled: anyEventEnabled && anyMethodEnabled,
    events_enabled: config.events_enabled,
    methods_enabled: methodsEnabled,
  });
}

/**
 * Login with email - sends verification code
 */
async function handleLogin(email?: string): Promise<Response> {
  if (!email) {
    return error(400, { message: "Email is required" });
  }

  if (!ValidateEmail(email)) {
    return error(400, { message: "Invalid email address" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const config = await GetSubscriptionConfig();

  if (!config?.methods_enabled?.email) {
    return error(400, { message: "Email subscriptions are not enabled" });
  }

  if (!IsEmailSetup()) {
    return error(400, { message: "Email service is not configured" });
  }

  // Generate 6-digit verification code
  const code = String(GenerateRandomNumber(6));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Check if user exists
  let user = await db.getSubscriberUserByEmail(normalizedEmail);

  if (user) {
    // Update verification code
    await db.updateSubscriberUser(user.id, {
      verification_code: code,
      verification_expires_at: expiresAt,
    });
  } else {
    // Create new user in PENDING status
    user = await db.createSubscriberUser({
      email: normalizedEmail,
      status: "PENDING",
      verification_code: code,
      verification_expires_at: expiresAt,
    });
  }

  // Generate token for verification
  const token = await GenerateTokenWithExpiry({ user_id: user.id, email: normalizedEmail, action: "verify" }, "10m");

  // Send verification email
  const siteData = await GetAllSiteData();
  const siteLogo = await GetSiteLogoURL(siteData.siteURL || "", siteData.logo || "", "/");
  const siteName = siteData.siteName || "Status Page";

  await SendEmailWithTemplate(
    emailCodeTemplate,
    {
      site_name: siteName,
      logo_url: siteLogo,
      code: code,
      site_url: siteData.siteURL || "",
    },
    normalizedEmail,
    `Your Verification Code - ${siteName}`,
    `Your verification code is: ${code}`,
  );

  return json({
    success: true,
    message: "Verification code sent to your email",
    token,
  });
}

/**
 * Verify the code and return auth token
 */
async function handleVerify(token?: string, code?: string): Promise<Response> {
  if (!token || !code) {
    return error(400, { message: "Token and code are required" });
  }

  // Verify the token
  let decoded: { user_id: number; email: string; action: string };
  try {
    const tokenPayload = await VerifyToken(token);
    if (!tokenPayload) {
      return error(400, { message: "Invalid or expired token" });
    }
    decoded = tokenPayload as unknown as { user_id: number; email: string; action: string };
    if (decoded.action !== "verify") {
      return error(400, { message: "Invalid token" });
    }
  } catch {
    return error(400, { message: "Invalid or expired token" });
  }

  // Get user and check code
  const user = await db.getSubscriberUserById(decoded.user_id);
  if (!user) {
    return error(404, { message: "User not found" });
  }

  if (user.verification_code !== code) {
    return error(400, { message: "Invalid verification code" });
  }

  if (user.verification_expires_at && new Date(user.verification_expires_at).getTime() < Date.now()) {
    return error(400, { message: "Verification code expired" });
  }

  // Activate user
  await db.updateSubscriberUser(user.id, {
    status: "ACTIVE",
    verification_code: undefined,
    verification_expires_at: undefined,
  });

  // Check if user has email method, if not create it
  const emailMethod = await db.getSubscriberMethodByUserAndType(user.id, "email", user.email);
  if (!emailMethod) {
    await db.createSubscriberMethod({
      subscriber_user_id: user.id,
      method_type: "email",
      method_value: user.email,
      status: "ACTIVE",
    });
  }

  // Generate long-lived auth token
  const authToken = await GenerateTokenWithExpiry({ user_id: user.id, email: user.email, action: "auth" }, "30d");

  return json({
    success: true,
    token: authToken,
    user: {
      id: user.id,
      email: user.email,
      status: "ACTIVE",
    },
  });
}

/**
 * Fetch user profile with methods
 */
async function handleFetchUser(token?: string): Promise<Response> {
  const userAuth = await verifyAuthToken(token);

  // Get full user record for created_at
  const userRecord = await db.getSubscriberUserById(userAuth.id);

  // Get user's methods
  const methods = await db.getSubscriberMethodsByUserId(userAuth.id);

  return json({
    user: {
      id: userAuth.id,
      email: userAuth.email,
      status: userAuth.status,
      created_at: userRecord?.created_at,
    },
    methods: methods.map((m) => ({
      id: m.id,
      method_type: m.method_type,
      method_value: m.method_type === "email" ? maskEmail(m.method_value) : m.method_value,
      status: m.status,
      created_at: m.created_at,
    })),
  });
}

/**
 * Add a notification method (webhook, slack, discord)
 */
async function handleAddMethod(
  token?: string,
  methodType?: SubscriptionMethodType,
  methodValue?: string,
): Promise<Response> {
  const user = await verifyAuthToken(token);

  if (!methodType || !methodValue) {
    return error(400, { message: "Method type and value are required" });
  }

  const config = await GetSubscriptionConfig();
  if (!config?.methods_enabled?.[methodType]) {
    return error(400, { message: `${methodType} notifications are not enabled` });
  }

  // Validate method value based on type
  const trimmedValue = methodValue.trim();

  if (methodType === "email") {
    if (!ValidateEmail(trimmedValue)) {
      return error(400, { message: "Invalid email address" });
    }
    // Only allow the user's own email
    if (trimmedValue.toLowerCase() !== user.email.toLowerCase()) {
      return error(400, { message: "You can only add your own email address" });
    }
  } else if (methodType === "webhook" || methodType === "slack" || methodType === "discord") {
    if (!ValidateURL(trimmedValue)) {
      return error(400, { message: "Invalid URL" });
    }
  }

  // Check if method already exists for this user
  const existingMethod = await db.getSubscriberMethodByUserAndType(user.id, methodType, trimmedValue);
  if (existingMethod) {
    return error(400, { message: "This notification method already exists" });
  }

  // Create the method
  const method = await db.createSubscriberMethod({
    subscriber_user_id: user.id,
    method_type: methodType,
    method_value: trimmedValue,
    status: "ACTIVE",
  });

  return json({
    success: true,
    method: {
      id: method.id,
      method_type: method.method_type,
      method_value: methodType === "email" ? maskEmail(method.method_value) : method.method_value,
      status: method.status,
      created_at: method.created_at,
    },
  });
}

/**
 * Remove a notification method
 */
async function handleRemoveMethod(token?: string, methodId?: number): Promise<Response> {
  const user = await verifyAuthToken(token);

  if (!methodId) {
    return error(400, { message: "Method ID is required" });
  }

  // Get method and verify ownership
  const method = await db.getSubscriberMethodById(methodId);
  if (!method || method.subscriber_user_id !== user.id) {
    return error(404, { message: "Method not found" });
  }

  // Don't allow removing the primary email method
  if (method.method_type === "email" && method.method_value === user.email) {
    return error(400, { message: "Cannot remove your primary email method" });
  }

  // Delete the method (CASCADE will delete related subscriptions)
  await db.deleteSubscriberMethod(methodId);

  return json({
    success: true,
    message: "Method removed successfully",
  });
}

/**
 * Fetch all subscriptions for the user
 */
async function handleFetchSubscriptions(token?: string): Promise<Response> {
  const user = await verifyAuthToken(token);

  const subscriptionsWithMethods = await db.getSubscriptionsWithMethodsForUser(user.id);

  return json({
    subscriptions: subscriptionsWithMethods.map((sw) => ({
      id: sw.subscription.id,
      event_type: sw.subscription.event_type,
      entity_type: sw.subscription.entity_type,
      entity_id: sw.subscription.entity_id,
      method: {
        id: sw.method.id,
        method_type: sw.method.method_type,
        method_value: sw.method.method_type === "email" ? maskEmail(sw.method.method_value) : sw.method.method_value,
      },
      created_at: sw.subscription.created_at,
    })),
  });
}

/**
 * Subscribe to events using specific methods
 */
async function handleSubscribe(
  token?: string,
  subscriptions?: Array<{
    method_id: number;
    event_type: SubscriptionEventType;
    entity_type?: SubscriptionEntityType;
    entity_id?: string;
  }>,
): Promise<Response> {
  const user = await verifyAuthToken(token);

  if (!subscriptions || subscriptions.length === 0) {
    return error(400, { message: "At least one subscription is required" });
  }

  const config = await GetSubscriptionConfig();
  const created: Array<{
    id: number;
    event_type: SubscriptionEventType;
    entity_type: SubscriptionEntityType;
    entity_id: string | null;
    method_id: number;
  }> = [];
  const errors: string[] = [];

  for (const sub of subscriptions) {
    try {
      // Verify method ownership
      const method = await db.getSubscriberMethodById(sub.method_id);
      if (!method || method.subscriber_user_id !== user.id) {
        errors.push(`Invalid method ID: ${sub.method_id}`);
        continue;
      }

      // Verify event is enabled
      if (sub.event_type === "incidentUpdatesAll" && !config?.events_enabled?.incidentUpdatesAll) {
        errors.push("Incident notifications are not enabled");
        continue;
      }
      if (sub.event_type === "maintenanceUpdatesAll" && !config?.events_enabled?.maintenanceUpdatesAll) {
        errors.push("Maintenance notifications are not enabled");
        continue;
      }
      if (sub.event_type === "monitorUpdatesAll" && !config?.events_enabled?.monitorUpdatesAll) {
        errors.push("Monitor notifications are not enabled");
        continue;
      }

      // Check if subscription already exists
      const exists = await db.subscriptionV2Exists(
        user.id,
        sub.method_id,
        sub.event_type,
        sub.entity_type || null,
        sub.entity_id || null,
      );
      if (exists) {
        errors.push(`Subscription already exists for ${sub.event_type}`);
        continue;
      }

      // Create subscription
      const newSub = await db.createUserSubscriptionV2({
        subscriber_user_id: user.id,
        subscriber_method_id: sub.method_id,
        event_type: sub.event_type,
        entity_type: sub.entity_type || null,
        entity_id: sub.entity_id || null,
        status: "ACTIVE",
      });

      created.push({
        id: newSub.id,
        event_type: newSub.event_type,
        entity_type: newSub.entity_type,
        entity_id: newSub.entity_id,
        method_id: newSub.subscriber_method_id,
      });
    } catch (e) {
      console.error("Error creating subscription:", e);
      errors.push(`Failed to create subscription for ${sub.event_type}`);
    }
  }

  return json({
    success: created.length > 0,
    created,
    errors: errors.length > 0 ? errors : undefined,
  });
}

/**
 * Remove a subscription
 */
async function handleUnsubscribe(token?: string, subscriptionId?: number): Promise<Response> {
  const user = await verifyAuthToken(token);

  if (!subscriptionId) {
    return error(400, { message: "Subscription ID is required" });
  }

  // Get subscription and verify ownership
  const subscription = await db.getUserSubscriptionV2ById(subscriptionId);
  if (!subscription || subscription.subscriber_user_id !== user.id) {
    return error(404, { message: "Subscription not found" });
  }

  await db.deleteUserSubscriptionV2(subscriptionId);

  return json({
    success: true,
    message: "Subscription removed successfully",
  });
}

/**
 * Delete user account and all data
 */
async function handleDeleteAccount(token?: string): Promise<Response> {
  const user = await verifyAuthToken(token);

  // Delete user (CASCADE will delete methods and subscriptions)
  await db.deleteSubscriberUser(user.id);

  return json({
    success: true,
    message: "Account deleted successfully",
  });
}

// ============ Helpers ============

/**
 * Verify auth token and return user
 */
async function verifyAuthToken(token?: string): Promise<{
  id: number;
  email: string;
  status: string;
}> {
  if (!token) {
    throw error(401, { message: "Authentication required" });
  }

  let decoded: { user_id: number; email: string; action: string };
  try {
    const tokenPayload = await VerifyToken(token);
    if (!tokenPayload) {
      throw error(401, { message: "Invalid or expired token" });
    }
    decoded = tokenPayload as unknown as { user_id: number; email: string; action: string };
    if (decoded.action !== "auth") {
      throw error(401, { message: "Invalid token" });
    }
  } catch (e) {
    // Re-throw HttpError from error()
    if (e && typeof e === "object" && "status" in e) {
      throw e;
    }
    throw error(401, { message: "Invalid or expired token" });
  }

  const user = await db.getSubscriberUserById(decoded.user_id);
  if (!user) {
    throw error(404, { message: "User not found" });
  }

  if (user.status !== "ACTIVE") {
    throw error(403, { message: "Account is not active" });
  }

  return {
    id: user.id,
    email: user.email,
    status: user.status,
  };
}

/**
 * Mask email for display (show first 2 chars and domain)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

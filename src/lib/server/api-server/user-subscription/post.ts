import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import { ValidateEmail, GenerateRandomNumber, ValidateURL } from "$lib/server/tool";
import { GenerateTokenWithExpiry, VerifyToken } from "$lib/server/controllers/commonController";
import { SendEmailWithTemplate, IsEmailSetup } from "$lib/server/controllers/emailController";
import { GetSiteLogoURL, GetAllSiteData } from "$lib/server/controllers/siteDataController";
import { GetSubscriptionConfig } from "$lib/server/controllers/subscriptionConfigController";
import {
  CreateNewSubscriber,
  GetSubscriberByEmailAndType,
  UpdateSubscriberMeta,
  UpdateSubscriberStatus,
  GetSubscriberByID,
} from "$lib/server/controllers/subscriberController";
import db from "$lib/server/db/db";
import emailCodeTemplate from "$lib/server/templates/email_code";
import type { SubscriptionMethodType, SubscriptionEventType, SubscriptionEntityType } from "$lib/server/types/db";

interface UserSubscriptionRequestBody {
  action: "getConfig" | "login" | "verify" | "fetch" | "subscribe" | "unsubscribe" | "deleteSubscription";
  method?: SubscriptionMethodType;
  email?: string;
  webhookUrl?: string;
  token?: string;
  code?: string;
  subscriptions?: Array<{
    event_type: SubscriptionEventType;
    entity_type?: SubscriptionEntityType;
    entity_id?: string;
  }>;
  subscriptionId?: number;
}

/**
 * POST /dashboard-apis/user-subscription
 * Handles all user subscription-related actions
 */
export default async function post(req: APIServerRequest): Promise<Response> {
  const body = req.body as UserSubscriptionRequestBody;
  const { action } = body;

  try {
    switch (action) {
      case "getConfig":
        return await handleGetConfig();
      case "login":
        return await handleLogin(body.method, body.email, body.webhookUrl);
      case "verify":
        return await handleVerify(body.token, body.code);
      case "fetch":
        return await handleFetch(body.token, body.method);
      case "subscribe":
        return await handleSubscribe(body.token, body.method, body.subscriptions);
      case "unsubscribe":
        return await handleUnsubscribe(body.token, body.method);
      case "deleteSubscription":
        return await handleDeleteSubscription(body.token, body.subscriptionId);
      default:
        return error(400, { message: "Invalid action" });
    }
  } catch (e) {
    console.error("User Subscription API error:", e);
    const message = e instanceof Error ? e.message : "Error processing subscription request";
    return error(500, { message });
  }
}

/**
 * Get subscription configuration for users
 * Returns which events and methods are enabled
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
 * Handle login - for email: send verification code, for webhook: validate URL and create subscriber
 */
async function handleLogin(method?: SubscriptionMethodType, email?: string, webhookUrl?: string): Promise<Response> {
  if (!method) {
    return error(400, { message: "Method is required" });
  }

  // Check if method is enabled
  const config = await GetSubscriptionConfig();
  if (!config || !config.methods_enabled[method]) {
    return error(400, { message: "This subscription method is not enabled" });
  }

  if (method === "email") {
    if (!email || !ValidateEmail(email)) {
      return error(400, { message: "Invalid email address" });
    }

    const subscriberMeta = {
      email_code: GenerateRandomNumber(6),
    };

    const existingUser = await GetSubscriberByEmailAndType(email, "email");
    if (!existingUser) {
      await CreateNewSubscriber({
        subscriber_send: email,
        subscriber_type: "email",
        subscriber_status: "PENDING",
        subscriber_meta: JSON.stringify(subscriberMeta),
      });
    } else {
      await UpdateSubscriberMeta(existingUser.id, JSON.stringify(subscriberMeta));
    }

    // Send email with code
    const siteData = await GetAllSiteData();
    const emailData = {
      brand_name: siteData.siteName || "Kener",
      logo_url: await GetSiteLogoURL(siteData.siteURL || "", siteData.logo || "", "/"),
      email_code: String(subscriberMeta.email_code),
      action: "login",
    };

    try {
      await SendEmailWithTemplate(
        emailCodeTemplate,
        emailData,
        email,
        `[Important] Verify code to manage subscriptions on ${emailData.brand_name}`,
        `Your verification code is: ${emailData.email_code}`,
      );
    } catch (e) {
      console.error("Error sending email:", e);
      return error(500, { message: "Error sending email. Please try again later." });
    }

    const token = await GenerateTokenWithExpiry({ email, method: "email" }, "10m");
    return json({ newUser: !existingUser, token, requiresVerification: true });
  } else if (method === "webhook") {
    if (!webhookUrl || !ValidateURL(webhookUrl)) {
      return error(400, { message: "Invalid webhook URL" });
    }

    // For webhook, we don't need email verification - just create/get subscriber and return token
    let existingUser = await GetSubscriberByEmailAndType(webhookUrl, "webhook");
    if (!existingUser) {
      await CreateNewSubscriber({
        subscriber_send: webhookUrl,
        subscriber_type: "webhook",
        subscriber_status: "ACTIVE",
        subscriber_meta: JSON.stringify({}),
      });
      existingUser = await GetSubscriberByEmailAndType(webhookUrl, "webhook");
    }

    if (!existingUser) {
      return error(500, { message: "Failed to create subscriber" });
    }

    // Generate long-lived token
    const authToken = await GenerateTokenWithExpiry(
      {
        webhook_url: webhookUrl,
        subscriber_id: existingUser.id,
        method: "webhook",
      },
      "1y",
    );

    return json({ token: authToken, requiresVerification: false });
  } else {
    // Slack and Discord would follow similar patterns with OAuth
    return error(400, { message: "This method is not yet supported for self-service subscription" });
  }
}

/**
 * Verify email login with code
 */
async function handleVerify(token?: string, code?: string): Promise<Response> {
  if (!token || !code) {
    return error(400, { message: "Token and code are required" });
  }

  const decoded = await VerifyToken(token);
  if (!decoded || !decoded.email || decoded.method !== "email") {
    return error(400, { message: "Invalid or expired token" });
  }

  const email = decoded.email as string;
  const existingSubscriber = await GetSubscriberByEmailAndType(email, "email");
  if (!existingSubscriber) {
    return error(400, { message: "Invalid user" });
  }

  const subscriberMeta = JSON.parse(existingSubscriber.subscriber_meta || "{}");
  const storedCode = subscriberMeta.email_code;

  if (!storedCode || String(storedCode) !== String(code)) {
    return error(400, { message: "Invalid verification code" });
  }

  // Update subscriber status to active and clear the code
  await UpdateSubscriberStatus(existingSubscriber.id, "ACTIVE");
  await UpdateSubscriberMeta(existingSubscriber.id, JSON.stringify({}));

  // Generate long-lived token
  const authToken = await GenerateTokenWithExpiry(
    {
      email: email,
      subscriber_id: existingSubscriber.id,
      method: "email",
    },
    "1y",
  );

  return json({ token: authToken });
}

/**
 * Fetch current subscriptions for a subscriber
 */
async function handleFetch(token?: string, method?: SubscriptionMethodType): Promise<Response> {
  if (!token) {
    return error(400, { message: "Token is required" });
  }

  const decoded = await VerifyToken(token);
  if (!decoded || !decoded.subscriber_id) {
    return error(400, { message: "Invalid token" });
  }

  const subscriberId = decoded.subscriber_id as number;
  const tokenMethod = decoded.method as SubscriptionMethodType;
  const queryMethod = method || tokenMethod;

  const existingSubscriber = await GetSubscriberByID(subscriberId);
  if (!existingSubscriber) {
    return error(400, { message: "No subscription found" });
  }

  // Get subscriptions from new user_subscriptions table
  const subscriptions = await db.getUserSubscriptions({
    subscriber_id: subscriberId,
    subscription_method: queryMethod,
    status: "ACTIVE",
  });

  return json({
    subscriber_send: existingSubscriber.subscriber_send,
    method: queryMethod,
    subscriptions: subscriptions.map((sub) => ({
      id: sub.id,
      event_type: sub.event_type,
      entity_type: sub.entity_type,
      entity_id: sub.entity_id,
      status: sub.status,
      created_at: sub.created_at,
    })),
  });
}

/**
 * Create new subscriptions
 */
async function handleSubscribe(
  token?: string,
  method?: SubscriptionMethodType,
  subscriptions?: Array<{
    event_type: SubscriptionEventType;
    entity_type?: SubscriptionEntityType;
    entity_id?: string;
  }>,
): Promise<Response> {
  if (!token) {
    return error(400, { message: "Token is required" });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return error(400, { message: "At least one subscription is required" });
  }

  const decoded = await VerifyToken(token);
  if (!decoded || !decoded.subscriber_id) {
    return error(400, { message: "Invalid token" });
  }

  const subscriberId = decoded.subscriber_id as number;
  const tokenMethod = decoded.method as SubscriptionMethodType;
  const subscriptionMethod = method || tokenMethod;

  // Validate against config
  const config = await GetSubscriptionConfig();
  if (!config || !config.methods_enabled[subscriptionMethod]) {
    return error(400, { message: "This subscription method is not enabled" });
  }

  const existingSubscriber = await GetSubscriberByID(subscriberId);
  if (!existingSubscriber || existingSubscriber.subscriber_status !== "ACTIVE") {
    return error(400, { message: "Invalid or inactive subscriber" });
  }

  // Validate each subscription against enabled events
  for (const sub of subscriptions) {
    const eventKey = sub.event_type as keyof typeof config.events_enabled;
    if (!config.events_enabled[eventKey]) {
      return error(400, { message: `Event type "${sub.event_type}" is not enabled for subscriptions` });
    }
  }

  // Create subscriptions
  const created: number[] = [];
  const skipped: number[] = [];

  for (const sub of subscriptions) {
    const exists = await db.subscriptionExists(
      subscriberId,
      subscriptionMethod,
      sub.event_type,
      sub.entity_type ?? null,
      sub.entity_id ?? null,
    );

    if (!exists) {
      await db.insertUserSubscription({
        subscriber_id: subscriberId,
        subscription_method: subscriptionMethod,
        event_type: sub.event_type,
        entity_type: sub.entity_type,
        entity_id: sub.entity_id,
        status: "ACTIVE",
      });
      created.push(1);
    } else {
      skipped.push(1);
    }
  }

  return json({
    message: "Subscriptions updated successfully",
    created: created.length,
    skipped: skipped.length,
  });
}

/**
 * Unsubscribe from all subscriptions for a method
 */
async function handleUnsubscribe(token?: string, method?: SubscriptionMethodType): Promise<Response> {
  if (!token) {
    return error(400, { message: "Token is required" });
  }

  const decoded = await VerifyToken(token);
  if (!decoded || !decoded.subscriber_id) {
    return error(400, { message: "Invalid token" });
  }

  const subscriberId = decoded.subscriber_id as number;
  const tokenMethod = decoded.method as SubscriptionMethodType;
  const subscriptionMethod = method || tokenMethod;

  // Get and delete all subscriptions for this method
  const subscriptions = await db.getUserSubscriptions({
    subscriber_id: subscriberId,
    subscription_method: subscriptionMethod,
  });

  for (const sub of subscriptions) {
    await db.deleteUserSubscription(sub.id);
  }

  return json({
    message: "Unsubscribed successfully",
    deleted: subscriptions.length,
  });
}

/**
 * Delete a single subscription
 */
async function handleDeleteSubscription(token?: string, subscriptionId?: number): Promise<Response> {
  if (!token || !subscriptionId) {
    return error(400, { message: "Token and subscriptionId are required" });
  }

  const decoded = await VerifyToken(token);
  if (!decoded || !decoded.subscriber_id) {
    return error(400, { message: "Invalid token" });
  }

  const subscriberId = decoded.subscriber_id as number;

  // Verify the subscription belongs to this subscriber
  const subscription = await db.getUserSubscriptionById(subscriptionId);
  if (!subscription || subscription.subscriber_id !== subscriberId) {
    return error(400, { message: "Subscription not found" });
  }

  await db.deleteUserSubscription(subscriptionId);

  return json({ message: "Subscription deleted successfully" });
}

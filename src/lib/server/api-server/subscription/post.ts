import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import { ValidateEmail, GenerateRandomNumber } from "$lib/server/tool";
import { GenerateTokenWithExpiry, VerifyToken } from "$lib/server/controllers/commonController";
import { SendEmailWithTemplate } from "$lib/server/controllers/emailController";
import { GetSiteLogoURL, GetAllSiteData } from "$lib/server/controllers/siteDataController";
import {
  CreateNewSubscriber,
  GetSubscriberByEmailAndType,
  CreateNewSubscription,
  UpdateSubscriberMeta,
  RemoveAllSubscriptions,
  GetSubscriptionsBySubscriberID,
  UpdateSubscriberStatus,
  GetSubscriberByID,
} from "$lib/server/controllers/subscriberController";
import emailCodeTemplate from "$lib/server/templates/email_code";

interface SubscriptionRequestBody {
  action: "login" | "verify" | "fetch" | "subscribe" | "unsubscribe";
  userEmail?: string;
  token?: string;
  code?: string;
  monitors?: string[];
  allMonitors?: boolean;
}

/**
 * POST /dashboard-apis/subscription
 * Handles all subscription-related actions: login, verify, fetch, subscribe, unsubscribe
 */
export default async function post(req: APIServerRequest): Promise<Response> {
  const body = req.body as SubscriptionRequestBody;
  const { action } = body;

  try {
    switch (action) {
      case "login":
        return await handleLogin(body.userEmail);
      case "verify":
        return await handleVerify(body.token, body.code);
      case "fetch":
        return await handleFetch(body.token);
      case "subscribe":
        return await handleSubscribe(body.token, body.monitors, body.allMonitors);
      case "unsubscribe":
        return await handleUnsubscribe(body.token);
      default:
        return error(400, { message: "Invalid action" });
    }
  } catch (e) {
    console.error("Subscription API error:", e);
    return error(500, { message: "Error processing subscription request" });
  }
}

async function handleLogin(email?: string): Promise<Response> {
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
      `[Important] Verify code to login to ${emailData.brand_name}`,
      `Your verification code is: ${emailData.email_code}`,
    );
  } catch (e) {
    console.error("Error sending email:", e);
    return error(500, { message: "Error sending email" });
  }

  const token = await GenerateTokenWithExpiry({ email }, "5m");
  return json({ newUser: !existingUser, token });
}

async function handleVerify(token?: string, code?: string): Promise<Response> {
  if (!token || !code) {
    return error(400, { message: "Token and code are required" });
  }

  const decoded = await VerifyToken(token);
  if (!decoded || !decoded.email) {
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
    return error(400, { message: "Invalid code" });
  }

  // Update subscriber status to active and clear the code
  await UpdateSubscriberStatus(existingSubscriber.id, "ACTIVE");
  await UpdateSubscriberMeta(existingSubscriber.id, JSON.stringify({}));

  // Generate long-lived token
  const authToken = await GenerateTokenWithExpiry(
    {
      email: email,
      subscriber_id: existingSubscriber.id,
    },
    "1y",
  );

  return json({ token: authToken });
}

async function handleFetch(token?: string): Promise<Response> {
  if (!token) {
    return error(400, { message: "Token is required" });
  }

  const decoded = await VerifyToken(token);
  if (!decoded || !decoded.email || !decoded.subscriber_id) {
    return error(400, { message: "Invalid token" });
  }

  const subscriberId = decoded.subscriber_id as number;
  const existingSubscriber = await GetSubscriberByID(subscriberId);
  if (!existingSubscriber) {
    return error(400, { message: "No active subscription found" });
  }

  const allSubscriptions = await GetSubscriptionsBySubscriberID(subscriberId);
  const monitors = allSubscriptions.map((item) => item.subscriptions_monitors);

  return json({
    monitors,
    email: existingSubscriber.subscriber_send,
  });
}

async function handleSubscribe(token?: string, monitors?: string[], allMonitors?: boolean): Promise<Response> {
  if (!token) {
    return error(400, { message: "Token is required" });
  }

  const decoded = await VerifyToken(token);
  if (!decoded || !decoded.email || !decoded.subscriber_id) {
    return error(400, { message: "Invalid token" });
  }

  const subscriberId = decoded.subscriber_id as number;
  const existingSubscriber = await GetSubscriberByID(subscriberId);
  if (!existingSubscriber) {
    return error(400, { message: "No active subscription found" });
  }

  let monitorList = monitors || [];
  if (allMonitors) {
    monitorList = ["_"];
  }

  if (monitorList.length === 0) {
    // Remove all subscriptions
    await RemoveAllSubscriptions(subscriberId);
    return json({ message: "Unsubscribed successfully" });
  }

  try {
    await CreateNewSubscription(subscriberId, monitorList);
  } catch (e) {
    console.error("Error in CreateNewSubscription:", e);
    return error(500, { message: "Error creating subscription" });
  }

  return json({ message: "Subscription updated successfully" });
}

async function handleUnsubscribe(token?: string): Promise<Response> {
  if (!token) {
    return error(400, { message: "Token is required" });
  }

  const decoded = await VerifyToken(token);
  if (!decoded || !decoded.email || !decoded.subscriber_id) {
    return error(400, { message: "Invalid token" });
  }

  const subscriberId = decoded.subscriber_id as number;
  const existingSubscriber = await GetSubscriberByID(subscriberId);
  if (!existingSubscriber) {
    return error(400, { message: "No active subscription found" });
  }

  await RemoveAllSubscriptions(subscriberId);
  return json({ message: "Unsubscribed successfully" });
}

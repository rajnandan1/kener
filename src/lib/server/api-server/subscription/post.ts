import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import type { SubscriptionsConfig } from "$lib/server/types/db.js";
import { GetSiteDataByKey } from "$lib/server/controllers/siteDataController";
import {
  SubscriberLogin,
  VerifySubscriberOTP,
  VerifySubscriberToken,
  UpdateSubscriberPreferences,
} from "$lib/server/controllers/userSubscriptionsController";

interface LoginRequest {
  action: "login";
  email: string;
}

interface VerifyRequest {
  action: "verify";
  email: string;
  code: string;
}

interface GetPreferencesRequest {
  action: "getPreferences";
  token: string;
}

interface UpdatePreferencesRequest {
  action: "updatePreferences";
  token: string;
  incidents?: boolean;
  maintenances?: boolean;
}

type PostRequestBody = LoginRequest | VerifyRequest | GetPreferencesRequest | UpdatePreferencesRequest;

export default async function post(req: APIServerRequest): Promise<Response> {
  const body = req.body as PostRequestBody;
  const { action } = body;

  // Check if subscriptions are enabled
  const config = await GetSubscriptionConfig();
  if (!config || !config.enable) {
    return error(400, { message: "Subscriptions are not enabled" });
  }

  const emailEnabled = config.methods?.emails?.incidents === true || config.methods?.emails?.maintenances === true;
  if (!emailEnabled) {
    return error(400, { message: "Email subscriptions are not enabled" });
  }

  switch (action) {
    case "login":
      return handleLogin((body as LoginRequest).email, config);
    case "verify":
      return handleVerify((body as VerifyRequest).email, (body as VerifyRequest).code);
    case "getPreferences":
      return handleGetPreferences((body as GetPreferencesRequest).token, config);
    case "updatePreferences":
      return handleUpdatePreferences(
        (body as UpdatePreferencesRequest).token,
        (body as UpdatePreferencesRequest).incidents,
        (body as UpdatePreferencesRequest).maintenances,
        config,
      );
    default:
      return error(400, { message: "Invalid action" });
  }
}

async function GetSubscriptionConfig(): Promise<SubscriptionsConfig | null> {
  const subscriptionsSettings = await GetSiteDataByKey("subscriptionsSettings");
  if (!subscriptionsSettings) {
    return null;
  }
  return subscriptionsSettings as SubscriptionsConfig;
}

async function handleLogin(email: string, config: SubscriptionsConfig): Promise<Response> {
  const result = await SubscriberLogin(email);
  if (!result.success) {
    return error(400, { message: result.error || "Failed to send verification code" });
  }

  return json({ success: true, message: "Verification code sent" });
}

async function handleVerify(email: string, code: string): Promise<Response> {
  const result = await VerifySubscriberOTP(email, code);
  if (!result.success) {
    return error(400, { message: result.error || "Verification failed" });
  }

  return json({ success: true, token: result.token });
}

async function handleGetPreferences(token: string, config: SubscriptionsConfig): Promise<Response> {
  const result = await VerifySubscriberToken(token);
  if (!result.success) {
    return error(401, { message: result.error || "Invalid token" });
  }

  return json({
    success: true,
    email: result.user?.email,
    subscriptions: result.subscriptions,
    availableSubscriptions: {
      incidents: config.methods?.emails?.incidents === true,
      maintenances: config.methods?.emails?.maintenances === true,
    },
  });
}

async function handleUpdatePreferences(
  token: string,
  incidents: boolean | undefined,
  maintenances: boolean | undefined,
  config: SubscriptionsConfig,
): Promise<Response> {
  // Only allow updating subscriptions that are enabled in config
  const preferences: { incidents?: boolean; maintenances?: boolean } = {};

  if (incidents !== undefined && config.methods?.emails?.incidents) {
    preferences.incidents = incidents;
  }
  if (maintenances !== undefined && config.methods?.emails?.maintenances) {
    preferences.maintenances = maintenances;
  }

  const result = await UpdateSubscriberPreferences(token, preferences);
  if (!result.success) {
    return error(400, { message: result.error || "Failed to update preferences" });
  }

  return json({ success: true });
}

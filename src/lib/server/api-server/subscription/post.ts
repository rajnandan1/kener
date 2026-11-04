import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import type { SubscriptionsConfig } from "$lib/server/types/db.js";
import { GetSiteDataByKey } from "$lib/server/controllers/siteDataController";
import { VerifyCaptchaToken } from "$lib/server/controllers/captchaController";
import {
  SubscriberLogin,
  VerifySubscriberOTP,
  VerifySubscriberToken,
  UpdateSubscriberMonitors,
  GetSubscribableMonitors,
  IsEmailSubscriptionEnabled,
} from "$lib/server/controllers/userSubscriptionsController";

interface LoginRequest {
  action: "login";
  email: string;
  captchaToken?: string | null;
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
  // Monitor tag → true to subscribe, false to unsubscribe. Tags left out stay as they are.
  monitors?: Record<string, boolean>;
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

  if (!IsEmailSubscriptionEnabled(config)) {
    return error(400, { message: "Email subscriptions are not enabled" });
  }

  switch (action) {
    case "login":
      return handleLogin((body as LoginRequest).email, (body as LoginRequest).captchaToken, config);
    case "verify":
      return handleVerify((body as VerifyRequest).email, (body as VerifyRequest).code);
    case "getPreferences":
      return handleGetPreferences((body as GetPreferencesRequest).token);
    case "updatePreferences":
      return handleUpdatePreferences(
        (body as UpdatePreferencesRequest).token,
        (body as UpdatePreferencesRequest).monitors,
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

async function handleLogin(
  email: string,
  captchaToken: string | null | undefined,
  config: SubscriptionsConfig,
): Promise<Response> {
  const captchaResult = await VerifyCaptchaToken(captchaToken);
  if (!captchaResult.success) {
    return error(400, { message: "Captcha verification failed" });
  }

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

async function handleGetPreferences(token: string): Promise<Response> {
  const result = await VerifySubscriberToken(token);
  if (!result.success) {
    return error(401, { message: result.error || "Invalid token" });
  }

  return json({
    success: true,
    email: result.user?.email,
    monitors: result.monitorTags ?? [],
    availableMonitors: await GetSubscribableMonitors(),
  });
}

async function handleUpdatePreferences(
  token: string,
  monitors: Record<string, boolean> | undefined,
): Promise<Response> {
  const isChangeMap =
    !!monitors &&
    typeof monitors === "object" &&
    !Array.isArray(monitors) &&
    Object.values(monitors).every((v) => typeof v === "boolean");
  if (!isChangeMap) {
    return error(400, { message: "monitors must map monitor tags to true or false" });
  }

  const result = await UpdateSubscriberMonitors(token, monitors);
  if (!result.success) {
    return error(400, { message: result.error || "Failed to update preferences" });
  }

  return json({ success: true, monitors: result.monitorTags ?? [] });
}

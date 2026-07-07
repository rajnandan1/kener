import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import type { SubscriptionsConfig } from "$lib/server/types/db.js";
import { GetSiteDataByKey } from "$lib/server/controllers/siteDataController";
import {
  SubscriberLogin,
  VerifySubscriberOTP,
  VerifySubscriberToken,
  UpdateSubscriberPreferences,
  GetAvailableMonitors,
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
  monitors?: boolean;
  incidentsMonitorTags?: string[];
  maintenancesMonitorTags?: string[];
  monitorsMonitorTags?: string[];
}

interface GetAvailableMonitorsRequest {
  action: "getAvailableMonitors";
}

type PostRequestBody = LoginRequest | VerifyRequest | GetPreferencesRequest | UpdatePreferencesRequest | GetAvailableMonitorsRequest;

export default async function post(req: APIServerRequest): Promise<Response> {
  const body = req.body as PostRequestBody;
  const { action } = body;

  // Check if subscriptions are enabled
  const config = await GetSubscriptionConfig();
  if (!config || !config.enable) {
    return error(400, { message: "Subscriptions are not enabled" });
  }

  const emailEnabled = config.methods?.emails?.incidents === true || config.methods?.emails?.maintenances === true || config.methods?.emails?.monitors === true;
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
    case "getAvailableMonitors":
      return handleGetAvailableMonitors();
    case "updatePreferences": {
      const updateBody = body as UpdatePreferencesRequest;
      return handleUpdatePreferences(
        updateBody.token,
        updateBody.incidents,
        updateBody.maintenances,
        config,
        updateBody.monitors,
        updateBody.incidentsMonitorTags,
        updateBody.maintenancesMonitorTags,
        updateBody.monitorsMonitorTags,
      );
    }
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
    incidentsMonitorTags: result.incidentsMonitorTags,
    maintenancesMonitorTags: result.maintenancesMonitorTags,
    monitorsMonitorTags: result.monitorsMonitorTags,
    availableSubscriptions: {
      incidents: config.methods?.emails?.incidents === true,
      maintenances: config.methods?.emails?.maintenances === true,
      monitors: config.methods?.emails?.monitors === true,
    },
  });
}

async function handleUpdatePreferences(
  token: string,
  incidents: boolean | undefined,
  maintenances: boolean | undefined,
  config: SubscriptionsConfig,
  monitors?: boolean | undefined,
  incidentsMonitorTags?: string[] | null,
  maintenancesMonitorTags?: string[] | null,
  monitorsMonitorTags?: string[] | null,
): Promise<Response> {
  // Only allow updating subscriptions that are enabled in config
  const preferences: {
    incidents?: boolean;
    maintenances?: boolean;
    monitors?: boolean;
    incidentsMonitorTags?: string[] | null;
    maintenancesMonitorTags?: string[] | null;
    monitorsMonitorTags?: string[] | null;
  } = {};

  if (incidents !== undefined && config.methods?.emails?.incidents) {
    preferences.incidents = incidents;
  }
  if (maintenances !== undefined && config.methods?.emails?.maintenances) {
    preferences.maintenances = maintenances;
  }
  if (monitors !== undefined && config.methods?.emails?.monitors) {
    preferences.monitors = monitors;
  }

  if (incidentsMonitorTags !== undefined) {
    preferences.incidentsMonitorTags = incidentsMonitorTags;
  }
  if (maintenancesMonitorTags !== undefined) {
    preferences.maintenancesMonitorTags = maintenancesMonitorTags;
  }
  if (monitorsMonitorTags !== undefined) {
    preferences.monitorsMonitorTags = monitorsMonitorTags;
  }

  const result = await UpdateSubscriberPreferences(token, preferences);
  if (!result.success) {
    return error(400, { message: result.error || "Failed to update preferences" });
  }

  return json({ success: true });
}

async function handleGetAvailableMonitors(): Promise<Response> {
  const monitors = await GetAvailableMonitors();
  return json(monitors);
}

import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import { siteDataKeys } from "$lib/server/controllers/siteDataKeys";
import type {
  GetSiteDataKeyResponse,
  UpdateSiteDataKeyResponse,
  NotFoundResponse,
  BadRequestResponse,
} from "$lib/types/api";

export const GET: RequestHandler = async ({ params }) => {
  const configKey = params.config_key as string;

  if (!configKey) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Config key is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Validate that this is a known config key
  const keyConfig = siteDataKeys.find((k) => k.key === configKey);
  if (!keyConfig) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Config key '${configKey}' is not a valid configuration key`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  const data = await db.getSiteDataByKey(configKey);

  if (!data) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Config key '${configKey}' not found`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  const response: GetSiteDataKeyResponse = {
    key: data.key,
    value: data.data_type === "object" ? JSON.parse(data.value) : data.value,
    data_type: data.data_type,
  };

  return json(response);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const configKey = params.config_key as string;

  if (!configKey) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Config key is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Validate that this is a known config key
  const keyConfig = siteDataKeys.find((k) => k.key === configKey);
  if (!keyConfig) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Config key '${configKey}' is not a valid configuration key`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  let body: { value: unknown };
  try {
    body = await request.json();
  } catch {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Invalid JSON body",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (body.value === undefined) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Value is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Convert value to string for storage and validation
  const valueToStore = keyConfig.data_type === "object" ? JSON.stringify(body.value) : String(body.value);

  // Validate the value
  if (!keyConfig.isValid(valueToStore)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: `Invalid value for config key '${configKey}'`,
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Insert or update the value
  await db.insertOrUpdateSiteData(configKey, valueToStore, keyConfig.data_type);

  const response: UpdateSiteDataKeyResponse = {
    key: configKey,
    value: keyConfig.data_type === "object" ? body.value : valueToStore,
    data_type: keyConfig.data_type,
  };

  return json(response);
};

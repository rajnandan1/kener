import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import { GetMonitorsParsed } from "$lib/server/controllers/monitorsController";
import type {
  GetMonitorResponse,
  MonitorResponse,
  UpdateMonitorRequest,
  UpdateMonitorResponse,
  BadRequestResponse,
} from "$lib/types/api";

function formatDateToISO(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString();
  }
  // Handle string dates (e.g., from SQLite: "2026-01-27 16:07:19")
  const parsed = new Date(date.replace(" ", "T") + "Z");
  return parsed.toISOString();
}

export const GET: RequestHandler = async ({ locals }) => {
  // Monitor is validated by middleware and available in locals
  const monitor = locals.monitor!;

  const response: GetMonitorResponse = {
    monitor,
  };

  return json(response);
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
  // Monitor is validated by middleware and available in locals
  const existingMonitor = locals.monitor!;
  const monitorTag = existingMonitor.tag;

  let body: UpdateMonitorRequest;

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

  // Build update data - only include fields that are provided
  const updateData: Record<string, unknown> = {
    id: existingMonitor.id,
    tag: existingMonitor.tag, // Tag cannot be changed
  };

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "Name must be a non-empty string",
        },
      };
      return json(errorResponse, { status: 400 });
    }
    updateData.name = body.name.trim();
  } else {
    updateData.name = existingMonitor.name;
  }

  updateData.description = body.description !== undefined ? body.description : existingMonitor.description;
  updateData.image = body.image !== undefined ? body.image : existingMonitor.image;
  updateData.cron = body.cron !== undefined ? body.cron : existingMonitor.cron;
  updateData.default_status = body.default_status !== undefined ? body.default_status : existingMonitor.default_status;
  updateData.status = body.status !== undefined ? body.status : existingMonitor.status;
  updateData.category_name = body.category_name !== undefined ? body.category_name : existingMonitor.category_name;
  updateData.monitor_type = body.monitor_type !== undefined ? body.monitor_type : existingMonitor.monitor_type;

  updateData.is_hidden = body.is_hidden !== undefined ? body.is_hidden : existingMonitor.is_hidden;

  // Handle JSON fields - merge with existing data instead of replacing
  if (body.type_data !== undefined) {
    if (body.type_data === null) {
      updateData.type_data = null;
    } else {
      // Parse existing type_data if it exists
      let existingTypeData = {};
      if (existingMonitor.type_data) {
        try {
          existingTypeData = existingMonitor.type_data;
        } catch {
          existingTypeData = {};
        }
      }
      // Merge existing with new data
      const mergedTypeData = { ...existingTypeData, ...body.type_data };
      updateData.type_data = JSON.stringify(mergedTypeData);
    }
  } else {
    updateData.type_data = existingMonitor.type_data;
  }

  if (body.monitor_settings_json !== undefined) {
    if (body.monitor_settings_json === null) {
      updateData.monitor_settings_json = null;
    } else {
      // Parse existing monitor_settings_json if it exists
      let existingSettings = {};
      if (existingMonitor.monitor_settings_json) {
        try {
          existingSettings = existingMonitor.monitor_settings_json;
        } catch {
          existingSettings = {};
        }
      }
      // Merge existing with new data
      const mergedSettings = { ...existingSettings, ...body.monitor_settings_json };
      updateData.monitor_settings_json = JSON.stringify(mergedSettings);
    }
  } else {
    updateData.monitor_settings_json = existingMonitor.monitor_settings_json;
  }

  await db.updateMonitor(updateData as unknown as Parameters<typeof db.updateMonitor>[0]);

  // Fetch the updated monitor
  const updatedMonitor = await GetMonitorsParsed({ tag: monitorTag }).then((monitors) => monitors[0]);

  if (!updatedMonitor) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update monitor",
      },
    };
    return json(errorResponse, { status: 500 });
  }

  const response: UpdateMonitorResponse = {
    monitor: updatedMonitor,
  };

  return json(response);
};

import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
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

function formatMonitorResponse(monitor: {
  id: number;
  tag: string;
  name: string;
  description: string | null;
  image: string | null;
  cron: string | null;
  default_status: string | null;
  status: string | null;
  category_name: string | null;
  monitor_type: string;
  type_data: string | null;
  day_degraded_minimum_count: number | null;
  day_down_minimum_count: number | null;
  include_degraded_in_downtime: string;
  is_hidden: string;
  monitor_settings_json: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}): MonitorResponse {
  let typeData = null;
  let monitorSettingsJson = null;

  if (monitor.type_data) {
    try {
      typeData = JSON.parse(monitor.type_data);
    } catch {
      typeData = null;
    }
  }

  if (monitor.monitor_settings_json) {
    try {
      monitorSettingsJson = JSON.parse(monitor.monitor_settings_json);
    } catch {
      monitorSettingsJson = null;
    }
  }

  return {
    id: monitor.id,
    tag: monitor.tag,
    name: monitor.name,
    description: monitor.description,
    image: monitor.image,
    cron: monitor.cron,
    default_status: monitor.default_status,
    status: monitor.status,
    category_name: monitor.category_name,
    monitor_type: monitor.monitor_type,
    type_data: typeData,
    day_degraded_minimum_count: monitor.day_degraded_minimum_count,
    day_down_minimum_count: monitor.day_down_minimum_count,
    include_degraded_in_downtime: monitor.include_degraded_in_downtime,
    is_hidden: monitor.is_hidden,
    monitor_settings_json: monitorSettingsJson,
    created_at: formatDateToISO(monitor.created_at),
    updated_at: formatDateToISO(monitor.updated_at),
  };
}

export const GET: RequestHandler = async ({ locals }) => {
  // Monitor is validated by middleware and available in locals
  const monitor = locals.monitor!;

  const response: GetMonitorResponse = {
    monitor: formatMonitorResponse(monitor),
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
  updateData.day_degraded_minimum_count =
    body.day_degraded_minimum_count !== undefined
      ? body.day_degraded_minimum_count
      : existingMonitor.day_degraded_minimum_count;
  updateData.day_down_minimum_count =
    body.day_down_minimum_count !== undefined ? body.day_down_minimum_count : existingMonitor.day_down_minimum_count;
  updateData.include_degraded_in_downtime =
    body.include_degraded_in_downtime !== undefined
      ? body.include_degraded_in_downtime
      : existingMonitor.include_degraded_in_downtime;
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
          existingTypeData = JSON.parse(existingMonitor.type_data);
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
          existingSettings = JSON.parse(existingMonitor.monitor_settings_json);
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
  const updatedMonitor = await db.getMonitorByTag(monitorTag);

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
    monitor: formatMonitorResponse(updatedMonitor),
  };

  return json(response);
};

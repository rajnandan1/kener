import { json, type RequestHandler } from "@sveltejs/kit";
import { parseDbTimestamp } from "$lib/server/tool";
import db from "$lib/server/db/db";
import type {
  GetMaintenanceEventResponse,
  UpdateMaintenanceEventRequest,
  UpdateMaintenanceEventResponse,
  DeleteMaintenanceEventResponse,
  MaintenanceEventResponse,
  NotFoundResponse,
  BadRequestResponse,
} from "$lib/types/api";
import { GetMinuteStartTimestampUTC } from "$lib/server/tool";
import { GetSiteURL } from "$lib/server/controllers/siteDataController";
import {
  DeleteMaintenanceEvent,
  UpdateMaintenanceEvent,
  UpdateMaintenanceEventStatus,
} from "$lib/server/controllers/maintenanceController";
import serverResolver from "$lib/server/resolver";
import { readRequestBody } from "$lib/server/requestBody";

async function buildEventResponse(event: {
  id: number;
  maintenance_id: number;
  start_date_time: number;
  end_date_time: number;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}): Promise<MaintenanceEventResponse> {
  return {
    id: event.id,
    maintenance_id: event.maintenance_id,
    start_date_time: event.start_date_time,
    end_date_time: event.end_date_time,
    status: event.status as MaintenanceEventResponse["status"],
    created_at: parseDbTimestamp(event.created_at).toISOString(),
    updated_at: parseDbTimestamp(event.updated_at).toISOString(),
    url: (await GetSiteURL()) + serverResolver(`/maintenances/${event.id}`),
  };
}

export const GET: RequestHandler = async ({ locals, params }) => {
  // Maintenance is validated by middleware and available in locals
  const maintenance = locals.maintenance!;

  const eventId = parseInt(params.event_id!, 10);
  if (isNaN(eventId)) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: "Event not found",
      },
    };
    return json(errorResponse, { status: 404 });
  }

  const event = await db.getMaintenanceEventById(eventId);
  if (!event || event.maintenance_id !== maintenance.id) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Event with id '${eventId}' not found for this maintenance`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  const response: GetMaintenanceEventResponse = {
    event: await buildEventResponse(event),
  };

  return json(response);
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  // Maintenance is validated by middleware and available in locals
  const maintenance = locals.maintenance!;

  const eventId = parseInt(params.event_id!, 10);
  if (isNaN(eventId)) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: "Event not found",
      },
    };
    return json(errorResponse, { status: 404 });
  }

  const event = await db.getMaintenanceEventById(eventId);
  if (!event || event.maintenance_id !== maintenance.id) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Event with id '${eventId}' not found for this maintenance`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  const body = await readRequestBody<UpdateMaintenanceEventRequest>(
    request,
    "PATCH /api/v4/maintenances/{maintenance_id}/events/{event_id}",
  );
  if (body instanceof Response) return body;

  // Transition mode: `status` alone, mutually exclusive with window edits
  if (body.status !== undefined) {
    if (body.start_date_time !== undefined || body.end_date_time !== undefined) {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "Cannot update status and start/end times in the same request",
        },
      };
      return json(errorResponse, { status: 400 });
    }

    try {
      const updatedEvent = await UpdateMaintenanceEventStatus(eventId, body.status);
      const response: UpdateMaintenanceEventResponse = {
        event: await buildEventResponse(updatedEvent),
      };
      return json(response);
    } catch (err) {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Failed to update event status",
        },
      };
      return json(errorResponse, { status: 400 });
    }
  }

  const { start_date_time, end_date_time } = body as Required<UpdateMaintenanceEventRequest>;
  if (end_date_time <= start_date_time) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "end_date_time must be after start_date_time",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Normalize timestamps
  const normalizedStartDateTime = GetMinuteStartTimestampUTC(start_date_time);
  const normalizedEndDateTime = GetMinuteStartTimestampUTC(end_date_time);

  try {
    await UpdateMaintenanceEvent(eventId, {
      start_date_time: normalizedStartDateTime,
      end_date_time: normalizedEndDateTime,
    });
  } catch (err) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "Failed to update event",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Fetch updated event
  const updatedEvent = await db.getMaintenanceEventById(eventId);
  if (!updatedEvent) {
    return json({ error: { code: "INTERNAL_ERROR", message: "Failed to update event" } }, { status: 500 });
  }

  const response: UpdateMaintenanceEventResponse = {
    event: await buildEventResponse(updatedEvent),
  };

  return json(response);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  // Maintenance is validated by middleware and available in locals
  const maintenance = locals.maintenance!;

  const eventId = parseInt(params.event_id!, 10);
  if (isNaN(eventId)) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: "Event not found",
      },
    };
    return json(errorResponse, { status: 404 });
  }

  const event = await db.getMaintenanceEventById(eventId);
  if (!event || event.maintenance_id !== maintenance.id) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Event with id '${eventId}' not found for this maintenance`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  await DeleteMaintenanceEvent(eventId);

  const response: DeleteMaintenanceEventResponse = {
    message: `Event with id '${eventId}' deleted successfully`,
  };

  return json(response);
};

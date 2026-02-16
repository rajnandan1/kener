import { json, type RequestHandler } from "@sveltejs/kit";
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

function formatDateToISO(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString();
  }
  // Handle string dates (e.g., from SQLite: "2026-01-27 16:07:19")
  const parsed = new Date(date.replace(" ", "T") + "Z");
  return parsed.toISOString();
}

function buildEventResponse(event: {
  id: number;
  maintenance_id: number;
  start_date_time: number;
  end_date_time: number;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}): MaintenanceEventResponse {
  return {
    id: event.id,
    maintenance_id: event.maintenance_id,
    start_date_time: event.start_date_time,
    end_date_time: event.end_date_time,
    status: event.status as "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED",
    created_at: formatDateToISO(event.created_at),
    updated_at: formatDateToISO(event.updated_at),
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
    event: buildEventResponse(event),
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

  let body: UpdateMaintenanceEventRequest;

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

  // Validate required fields - both are required for event update
  if (body.start_date_time === undefined || body.start_date_time === null) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "start_date_time is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (body.end_date_time === undefined || body.end_date_time === null) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "end_date_time is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (typeof body.start_date_time !== "number" || isNaN(body.start_date_time)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "start_date_time must be a valid timestamp (UTC seconds)",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (typeof body.end_date_time !== "number" || isNaN(body.end_date_time)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "end_date_time must be a valid timestamp (UTC seconds)",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Validate end_date_time > start_date_time
  if (body.end_date_time <= body.start_date_time) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "end_date_time must be after start_date_time",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Normalize timestamps
  const normalizedStartDateTime = GetMinuteStartTimestampUTC(body.start_date_time);
  const normalizedEndDateTime = GetMinuteStartTimestampUTC(body.end_date_time);

  // Update the event
  await db.updateMaintenanceEvent(eventId, {
    start_date_time: normalizedStartDateTime,
    end_date_time: normalizedEndDateTime,
  });

  // Fetch updated event
  const updatedEvent = await db.getMaintenanceEventById(eventId);
  if (!updatedEvent) {
    return json({ error: { code: "INTERNAL_ERROR", message: "Failed to update event" } }, { status: 500 });
  }

  const response: UpdateMaintenanceEventResponse = {
    event: buildEventResponse(updatedEvent),
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

  await db.deleteMaintenanceEvent(eventId);

  const response: DeleteMaintenanceEventResponse = {
    message: `Event with id '${eventId}' deleted successfully`,
  };

  return json(response);
};

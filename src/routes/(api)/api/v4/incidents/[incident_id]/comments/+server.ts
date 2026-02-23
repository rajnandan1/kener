import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  GetCommentsListResponse,
  CommentResponse,
  CreateCommentRequest,
  CreateCommentResponse,
  BadRequestResponse,
} from "$lib/types/api";
import GC from "$lib/global-constants";
import { GetMinuteStartTimestampUTC, GetMinuteStartNowTimestampUTC } from "$lib/server/tool";

const VALID_STATES: string[] = [GC.INVESTIGATING, GC.IDENTIFIED, GC.MONITORING, GC.RESOLVED];

function formatDateToISO(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString();
  }
  // Handle string dates (e.g., from SQLite: "2026-01-27 16:07:19")
  const parsed = new Date(date.replace(" ", "T") + "Z");
  return parsed.toISOString();
}

function formatCommentResponse(comment: {
  id: number;
  incident_id: number;
  comment: string;
  commented_at: number;
  state: string;
  created_at: Date | string;
  updated_at: Date | string;
}): CommentResponse {
  return {
    id: comment.id,
    incident_id: comment.incident_id,
    comment: comment.comment,
    timestamp: comment.commented_at,
    state: comment.state,
    created_at: formatDateToISO(comment.created_at),
    updated_at: formatDateToISO(comment.updated_at),
  };
}

export const GET: RequestHandler = async ({ locals }) => {
  // Incident is validated by middleware and available in locals
  const incident = locals.incident!;

  const rawComments = await db.getActiveIncidentComments(incident.id);

  const comments: CommentResponse[] = rawComments.map(formatCommentResponse);

  const response: GetCommentsListResponse = {
    comments,
  };

  return json(response);
};

export const POST: RequestHandler = async ({ locals, request }) => {
  // Incident is validated by middleware and available in locals
  const incident = locals.incident!;

  let body: CreateCommentRequest;

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

  // Validate required fields
  if (!body.comment || typeof body.comment !== "string" || body.comment.trim().length === 0) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "comment is required and must be a non-empty string",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Timestamp is optional - use current time if not provided
  // Always normalize to minute start
  let timestamp: number;
  if (body.timestamp !== undefined && body.timestamp !== null) {
    if (typeof body.timestamp !== "number" || isNaN(body.timestamp)) {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "timestamp must be a valid timestamp (UTC seconds)",
        },
      };
      return json(errorResponse, { status: 400 });
    }
    timestamp = GetMinuteStartTimestampUTC(body.timestamp);
  } else {
    timestamp = GetMinuteStartNowTimestampUTC();
  }

  if (!body.state || typeof body.state !== "string") {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "state is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (!VALID_STATES.includes(body.state)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: `state must be one of: ${VALID_STATES.join(", ")}`,
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Create comment
  const createdComment = await db.insertIncidentComment(incident.id, body.comment.trim(), body.state, timestamp);

  // Update incident state to match the comment state
  await db.updateIncident({
    id: incident.id,
    title: incident.title,
    start_date_time: incident.start_date_time,
    end_date_time: body.state === GC.RESOLVED ? timestamp : incident.end_date_time,
    status: incident.status,
    state: body.state,
    created_at: incident.created_at,
    updated_at: incident.updated_at,
    incident_type: incident.incident_type,
    incident_source: "",
    is_global: incident.is_global,
  });

  const response: CreateCommentResponse = {
    comment: formatCommentResponse(createdComment),
  };

  return json(response, { status: 201 });
};

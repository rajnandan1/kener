import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  GetCommentResponse,
  UpdateCommentRequest,
  UpdateCommentResponse,
  DeleteCommentResponse,
  CommentResponse,
  BadRequestResponse,
  NotFoundResponse,
} from "$lib/types/api";
import GC from "$lib/global-constants";
import { GetMinuteStartTimestampUTC } from "$lib/server/tool";

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

export const GET: RequestHandler = async ({ params, locals }) => {
  // Incident is validated by middleware and available in locals
  const incident = locals.incident!;
  const commentIdParam = params.comment_id as string;

  if (!commentIdParam) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Comment ID is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const commentId = parseInt(commentIdParam, 10);
  if (isNaN(commentId)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Comment ID must be a valid integer",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const comment = await db.getIncidentCommentByIDAndIncident(incident.id, commentId);

  if (!comment) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Comment with id '${commentId}' not found for incident '${incident.id}'`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  if (comment.status === "DELETED") {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Comment with id '${commentId}' not found for incident '${incident.id}'`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  const response: GetCommentResponse = {
    comment: formatCommentResponse(comment),
  };

  return json(response);
};

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
  // Incident is validated by middleware and available in locals
  const incident = locals.incident!;
  const commentIdParam = params.comment_id as string;

  if (!commentIdParam) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Comment ID is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const commentId = parseInt(commentIdParam, 10);
  if (isNaN(commentId)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Comment ID must be a valid integer",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const existingComment = await db.getIncidentCommentByIDAndIncident(incident.id, commentId);

  if (!existingComment) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Comment with id '${commentId}' not found for incident '${incident.id}'`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  if (existingComment.status === "DELETED") {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Comment with id '${commentId}' not found for incident '${incident.id}'`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  let body: UpdateCommentRequest;

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

  // Validate state if provided
  if (body.state !== undefined && !VALID_STATES.includes(body.state)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: `state must be one of: ${VALID_STATES.join(", ")}`,
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Build update values - only update fields that are present in the request
  const updateComment = body.comment !== undefined ? body.comment : existingComment.comment;
  const updateState = body.state !== undefined ? body.state : existingComment.state;
  const updateTimestamp =
    body.timestamp !== undefined ? GetMinuteStartTimestampUTC(body.timestamp) : existingComment.commented_at;

  // Update the comment (does NOT change incident state)
  await db.updateIncidentCommentByID(commentId, updateComment, updateState, updateTimestamp);

  // Fetch updated comment
  const updatedComment = await db.getIncidentCommentByIDAndIncident(incident.id, commentId);

  if (!updatedComment) {
    return json({ error: { code: "INTERNAL_ERROR", message: "Failed to update comment" } }, { status: 500 });
  }

  const response: UpdateCommentResponse = {
    comment: formatCommentResponse(updatedComment),
  };

  return json(response);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  // Incident is validated by middleware and available in locals
  const incident = locals.incident!;
  const commentIdParam = params.comment_id as string;

  if (!commentIdParam) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Comment ID is required",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const commentId = parseInt(commentIdParam, 10);
  if (isNaN(commentId)) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Comment ID must be a valid integer",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const existingComment = await db.getIncidentCommentByIDAndIncident(incident.id, commentId);

  if (!existingComment) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Comment with id '${commentId}' not found for incident '${incident.id}'`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  if (existingComment.status === "DELETED") {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Comment with id '${commentId}' not found for incident '${incident.id}'`,
      },
    };
    return json(errorResponse, { status: 404 });
  }

  // Soft delete the comment
  await db.updateIncidentCommentStatusByID(commentId, "DELETED");

  const response: DeleteCommentResponse = {
    message: `Comment with id '${commentId}' deleted successfully`,
  };

  return json(response);
};

import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  GetCommentsListResponse,
  CommentResponse,
  CreateCommentRequest,
  CreateCommentResponse,
  BadRequestResponse,
} from "$lib/types/api";
import { AddIncidentComment } from "$lib/server/controllers/incidentController";
import { GetMinuteStartTimestampUTC, GetMinuteStartNowTimestampUTC, parseDbTimestamp } from "$lib/server/tool";
import { readRequestBody } from "$lib/server/requestBody";

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
    created_at: parseDbTimestamp(comment.created_at).toISOString(),
    updated_at: parseDbTimestamp(comment.updated_at).toISOString(),
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

  const body = await readRequestBody<CreateCommentRequest>(request, "POST /api/v4/incidents/{incident_id}/comments");
  if (body instanceof Response) return body;

  // Validate required fields
  if (body.comment.trim().length === 0) {
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
  if (body.timestamp !== undefined) {
    timestamp = GetMinuteStartTimestampUTC(body.timestamp);
  } else {
    timestamp = GetMinuteStartNowTimestampUTC();
  }

  let createdComment: Awaited<ReturnType<typeof AddIncidentComment>>;
  try {
    createdComment = await AddIncidentComment(incident.id, body.comment.trim(), body.state, timestamp);
  } catch (err) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "Failed to add comment",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  const response: CreateCommentResponse = {
    comment: formatCommentResponse(createdComment),
  };

  return json(response, { status: 201 });
};

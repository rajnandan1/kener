import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type { BadRequestResponse } from "$lib/types/api";
import { CreateAccessGroup } from "$lib/server/controllers/pagesController";

/**
 * POST /api/v4/access-groups
 * Create a new access group.
 *
 * Request body:
 *   { "id": "customer-a", "group_name": "Customer A", "description": "..." }
 *
 * The "id" is normalized: lowercase, spaces to hyphens, special chars removed.
 * System groups (public, admin) cannot be created via API.
 */
export const POST: RequestHandler = async ({ request }) => {
  let body: { id: string; group_name: string; description?: string };

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

  if (!body.id || typeof body.id !== "string") {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "id is required and must be a string",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  if (!body.group_name || typeof body.group_name !== "string") {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "group_name is required and must be a string",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  try {
    const result = await CreateAccessGroup({
      id: body.id,
      group_name: body.group_name,
      description: body.description,
    });

    return json(result, { status: 201 });
  } catch (e: unknown) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "Failed to create access group",
      },
    };
    return json(errorResponse, { status: 400 });
  }
};

/**
 * GET /api/v4/access-groups
 * List all access groups.
 */
export const GET: RequestHandler = async () => {
  const groups = await db.getAllAccessGroups();
  return json({ access_groups: groups });
};

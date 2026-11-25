import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type { BadRequestResponse, DeleteAccessGroupResponse, NotFoundResponse } from "$lib/types/api";
import { DeleteAccessGroup } from "$lib/server/controllers/pagesController";

export const DELETE: RequestHandler = async ({ params }) => {
  const group = await db.getAccessGroupById(params.group_id ?? "");
  if (!group) {
    const errorResponse: NotFoundResponse = {
      error: { code: "NOT_FOUND", message: `Access group '${params.group_id}' not found` },
    };
    return json(errorResponse, { status: 404 });
  }

  if (group.is_system) {
    const errorResponse: BadRequestResponse = {
      error: { code: "BAD_REQUEST", message: `Built-in group '${group.id}' cannot be deleted` },
    };
    return json(errorResponse, { status: 400 });
  }

  await DeleteAccessGroup(group.id);

  const response: DeleteAccessGroupResponse = {
    message: `Access group '${group.id}' deleted successfully`,
  };
  return json(response);
};

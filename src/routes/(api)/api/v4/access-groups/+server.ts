import { json, type RequestHandler } from "@sveltejs/kit";
import type {
  BadRequestResponse,
  CreateAccessGroupRequest,
  CreateAccessGroupResponse,
  GetAccessGroupsResponse,
} from "$lib/types/api";
import { CreateAccessGroup, GetAllAccessGroups } from "$lib/server/controllers/pagesController";
import { readRequestBody } from "$lib/server/requestBody";

export const GET: RequestHandler = async () => {
  const response: GetAccessGroupsResponse = {
    access_groups: await GetAllAccessGroups(),
  };
  return json(response);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await readRequestBody<CreateAccessGroupRequest>(request, "POST /api/v4/access-groups");
  if (body instanceof Response) return body;

  try {
    const response: CreateAccessGroupResponse = {
      access_group: await CreateAccessGroup(body),
    };
    return json(response, { status: 201 });
  } catch (e) {
    // Empty, reserved or taken IDs and empty names
    const errorResponse: BadRequestResponse = {
      error: { code: "BAD_REQUEST", message: e instanceof Error ? e.message : String(e) },
    };
    return json(errorResponse, { status: 400 });
  }
};

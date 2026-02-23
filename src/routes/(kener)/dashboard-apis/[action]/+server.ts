import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getHandler } from "$lib/server/api-server";
import type { APIServerRequest } from "$lib/server/types/api-server";

export const POST: RequestHandler = async ({ params, request, url, cookies }) => {
  const { action } = params;
  const handler = getHandler(action, "post");

  if (!handler) {
    return error(404, { message: `Handler not found for POST /${action}` });
  }

  const apiRequest: APIServerRequest = {
    action,
    query: url.searchParams,
    cookies,
    headers: request.headers,
    body: await request.json(),
  };

  return handler(apiRequest);
};

export const PUT: RequestHandler = async ({ params, request, url, cookies }) => {
  const { action } = params;
  const handler = getHandler(action, "put");

  if (!handler) {
    return error(404, { message: `Handler not found for PUT /${action}` });
  }

  const apiRequest: APIServerRequest = {
    action,
    query: url.searchParams,
    cookies,
    headers: request.headers,
    body: await request.json(),
  };

  return handler(apiRequest);
};

export const GET: RequestHandler = async ({ params, request, url, cookies }) => {
  const { action } = params;
  const handler = getHandler(action, "get");

  if (!handler) {
    return error(404, { message: `Handler not found for GET /${action}` });
  }

  const apiRequest: APIServerRequest = {
    action,
    query: url.searchParams,
    cookies,
    headers: request.headers,
  };

  return handler(apiRequest);
};

export const DELETE: RequestHandler = async ({ params, request, url, cookies }) => {
  const { action } = params;
  const handler = getHandler(action, "delete");

  if (!handler) {
    return error(404, { message: `Handler not found for DELETE /${action}` });
  }

  const apiRequest: APIServerRequest = {
    action,
    query: url.searchParams,
    cookies,
    headers: request.headers,
  };

  return handler(apiRequest);
};

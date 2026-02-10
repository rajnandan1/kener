import { GetBadge } from "$lib/server/controllers/controller.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, url }) => {
  const query = url.searchParams;
  return GetBadge("status", {
    tag: params.tag,
    label: query.get("label"),
    labelColor: query.get("labelColor"),
    color: query.get("color"),
    style: query.get("style"),
  });
};

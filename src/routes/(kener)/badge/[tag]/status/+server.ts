import { GetBadge } from "$lib/server/controllers/controller.js";

export async function GET({ params, url }) {
  const query = url.searchParams;
  return GetBadge("status", {
    tag: params.tag,
    label: query.get("label"),
    labelColor: query.get("labelColor"),
    color: query.get("color"),
    style: query.get("style"),
  });
}

import { GetBadge } from "$lib/server/controllers/controller.js";

export async function GET({ params, url }) {
  const query = url.searchParams;
  return GetBadge("latency", {
    tag: params.tag,
    sinceLast: query.get("sinceLast"),
    hideDuration: query.get("hideDuration"),
    label: query.get("label"),
    labelColor: query.get("labelColor"),
    color: query.get("color"),
    style: query.get("style"),
  });
}

import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";

/**
 * GET /dashboard-apis/monitor-latency-chart?tag=xxx&range=24h&localTz=xxx
 * Latency data is no longer exposed on public pages.
 */
export default async function get(req: APIServerRequest): Promise<Response> {
  const tag = req.query.get("tag");
  if (!tag) {
    return error(400, { message: "tag query parameter is required" });
  }

  return json({
    data: [],
    range: req.query.get("range") || "24h",
    rangeLabel: "",
    avgInterval: 0,
    periodStart: 0,
    periodEnd: 0,
  });
}

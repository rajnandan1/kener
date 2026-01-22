import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import db from "$lib/server/db/db";

export interface MonitorTagResponse {
  tag: string;
  name: string;
  image: string | null;
  description: string | null;
}

/**
 * GET /dashboard-apis/monitor-tags?tags=tag1,tag2,tag3
 * Returns non-hidden, active monitors with only tag, name, image, and description
 */
export default async function get(req: APIServerRequest): Promise<Response> {
  const tagsParam = req.query.get("tags");

  if (!tagsParam) {
    return error(400, { message: "tags query parameter is required" });
  }

  const tags = tagsParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (tags.length === 0) {
    return error(400, { message: "At least one tag is required" });
  }

  const monitors = await db.getMonitors({
    tags,
    status: "ACTIVE",
  });

  // Filter out hidden monitors and map to response format
  const result: MonitorTagResponse[] = monitors
    .filter((m) => m.is_hidden !== "YES")
    .map((m) => ({
      tag: m.tag,
      name: m.name,
      image: m.image,
      description: m.description,
    }));

  return json(result);
}

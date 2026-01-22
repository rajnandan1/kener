import { json } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import type { MonitorTableRow } from "$lib/types/common";

export default function get(req: APIServerRequest) {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const query: Record<string, string> = {};
  req.query.forEach((value, key) => {
    query[key] = value;
  });

  return json({ headers, query });
}

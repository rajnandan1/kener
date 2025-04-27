// @ts-nocheck
import { GetIncidentsPaginated } from "$lib/server/controllers/controller.js";
import { GetMinuteStartNowTimestampUTC } from "$lib/server/tool.js";
export async function load({ parent, url, params, cookies }) {
  let page = url.searchParams.get("page") || 1;
  let limit = url.searchParams.get("limit") || 100;
  let direction = url.searchParams.get("direction") || "after";
  let filter = {
    start: url.searchParams.get("start") || GetMinuteStartNowTimestampUTC(),
    status: url.searchParams.get("status") || "OPEN",
  };
  if (!!url.searchParams.get("incident_type")) {
    filter.incident_type = url.searchParams.get("incident_type");
  }

  let incidents = await GetIncidentsPaginated(page, limit, filter, direction);

  return { incidents };
}

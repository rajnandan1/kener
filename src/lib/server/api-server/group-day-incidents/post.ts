import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import { BeginningOfDay, GetMinuteStartNowTimestampUTC, GetMinuteStartTimestampUTC } from "$lib/server/tool";
import { GetMonitorsParsed } from "../../controllers/monitorsController";
import db from "$lib/server/db/db";
import { mergeGroupIncidents } from "$lib/server/group-day-detail";

interface GroupDayDetailRequest {
  tags: string[];
}

export default async function post(req: APIServerRequest): Promise<Response> {
  const body = req.body as GroupDayDetailRequest;

  if (!Array.isArray(body.tags) || body.tags.length === 0) {
    return error(400, { message: "tags is required" });
  }

  const startOfDayTodayAtTz = req.body.startOfDayTodayAtTz
    ? parseInt(req.body.startOfDayTodayAtTz || "0", 10)
    : BeginningOfDay();

  const nowAtTz =
    GetMinuteStartTimestampUTC(
      req.body.nowAtTz ? parseInt(req.body.nowAtTz || "0", 10) : GetMinuteStartNowTimestampUTC(),
    ) + 60;

  const monitors = await GetMonitorsParsed({ tags: body.tags, is_hidden: "NO" });
  if (!monitors || monitors.length === 0) {
    return error(404, { message: "Monitors not found" });
  }

  const incidents = await Promise.all(
    monitors.map((monitor) => db.getIncidentsForEventsByDateRangeMonitor(startOfDayTodayAtTz, nowAtTz, monitor.tag)),
  );

  return json({
    incidents: mergeGroupIncidents(incidents),
  });
}

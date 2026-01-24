import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import db from "$lib/server/db/db";
import { GetLastStatusBefore, InterpolateData } from "$lib/server/controllers/monitorsController";
import {
  BeginningOfDay,
  GetMinuteStartNowTimestampUTC,
  GetMinuteStartTimestampUTC,
  ParseUptime,
  UptimeCalculator,
} from "$lib/server/tool";
import { GetMonitorsParsed } from "../../controllers/monitorsController";
import type { TimestampStatusCount } from "$lib/server/types/db";

interface DayDetailRequest {
  tag: string;
}

export default async function post(req: APIServerRequest): Promise<Response> {
  const body = req.body as DayDetailRequest;

  if (!body.tag) {
    return error(400, { message: "tag is required" });
  }

  const startOfDayTodayAtTz = req.body.startOfDayTodayAtTz
    ? parseInt(req.body.startOfDayTodayAtTz || "0", 10)
    : BeginningOfDay();

  const nowAtTz =
    GetMinuteStartTimestampUTC(
      req.body.nowAtTz ? parseInt(req.body.nowAtTz || "0", 10) : GetMinuteStartNowTimestampUTC(),
    ) + 60;

  const monitors = await GetMonitorsParsed({ tag: body.tag });
  if (!monitors || monitors.length === 0) {
    return error(404, { message: "Monitor not found" });
  }
  const monitor = monitors[0];

  // Get raw monitoring data for the day
  const rawData = await db.getMaintenanceEventsForEventsByDateRangeMonitor(startOfDayTodayAtTz, nowAtTz, monitor.tag);

  return json({
    maintenances: rawData,
  });
}

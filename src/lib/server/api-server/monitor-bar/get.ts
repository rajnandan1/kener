import { json, error } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import db from "$lib/server/db/db";
import { GetMinuteStartNowTimestampUTC } from "$lib/server/tool";
import type { StatusType } from "$lib/global-constants";
import type { TimestampStatusCount } from "$lib/server/types/db";
import { buildMonitorBarResponse } from "./shared";

const DEFAULT_DAYS = 90;
const MAX_DAYS = 90;

export interface BarData {
  status: StatusType;
  timestamp: number;
}

export interface MonitorBarResponse {
  name: string;
  description: string;
  image: string | null;
  currentStatus: StatusType;
  uptime: string;
  avgLatency: string;
  uptimeData: TimestampStatusCount[];
  fromTimeStamp: number;
  toTimeStamp: number;
  maxLatency: string;
  minLatency: string;
}

/**
 * GET /dashboard-apis/monitor-bar?tag=xxx&days=90&endOfDayTodayAtTz=xxx
 * Returns monitor info, uptime data, and calculated uptime/avgLatency for the specified days
 */

export default async function get(req: APIServerRequest): Promise<Response> {
  const tag = req.query.get("tag");
  const daysStr = req.query.get("days");
  // const numberOfDaysReceived
  const days = Math.min(MAX_DAYS, Math.max(1, daysStr ? parseInt(daysStr, 10) : DEFAULT_DAYS));
  const endOfDayTodayAtTzStr = req.query.get("endOfDayTodayAtTz");
  const endOfDayTodayAtTz = endOfDayTodayAtTzStr ? parseInt(endOfDayTodayAtTzStr, 10) : GetMinuteStartNowTimestampUTC();
  if (!tag) {
    return error(400, { message: "tag query parameter is required" });
  }

  const monitor = await db.getMonitorByTag(tag);
  if (!monitor) {
    return error(404, { message: "Monitor not found" });
  }
  const response = await buildMonitorBarResponse(monitor, days, endOfDayTodayAtTz);

  return json(response);
}

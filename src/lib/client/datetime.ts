import { getUnixTime } from "date-fns";

/**
 * Get current timestamp in UTC seconds
 * @returns Current UTC timestamp in seconds (Unix timestamp)
 */
export function getNowTimestampUTC(): number {
  return getUnixTime(new Date());
}

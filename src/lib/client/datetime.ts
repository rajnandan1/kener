import { getUnixTime, startOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

/**
 * Get current timestamp in UTC seconds
 * @returns Current UTC timestamp in seconds (Unix timestamp)
 */
export function getNowTimestampUTC(): number {
  return getUnixTime(new Date());
}

/**
 * Get start of day timestamp for a given timezone
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Start of day in the given timezone as Unix timestamp (seconds)
 */
export function getStartOfDayAtTz(timezone: string): number {
  const now = new Date();
  const zonedTime = toZonedTime(now, timezone);
  const startOfZonedDay = startOfDay(zonedTime);
  const startOfDayInUTC = fromZonedTime(startOfZonedDay, timezone);
  return getUnixTime(startOfDayInUTC);
}

/**
 * Get end of day timestamp for a given timezone
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns End of day in the given timezone as Unix timestamp (seconds)
 */
export function getEndOfDayAtTz(timezone: string): number {
  return getStartOfDayAtTz(timezone) + 86400;
}

/**
 * Get current timestamp in a given timezone
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Current time in the given timezone as Unix timestamp (seconds)
 */
export function getNowAtTz(timezone: string): number {
  const now = new Date();
  return getUnixTime(fromZonedTime(now, timezone));
}

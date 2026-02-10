import { getUnixTime, startOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

/**
 * Get start of day timestamp for a given timezone
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Start of day in the given timezone as Unix timestamp (seconds)
 */
function getStartOfDayAtTz(timezone: string): number {
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

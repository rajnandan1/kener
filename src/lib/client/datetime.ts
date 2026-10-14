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
  const startOfDayAtTz = getStartOfDayAtTz(timezone);
  // date-fns-tz returns NaN for a zone it can't resolve (e.g. "Etc/Unknown"); fall back to UTC
  // so callers never build a request with endOfDayTodayAtTz=NaN.
  return (Number.isFinite(startOfDayAtTz) ? startOfDayAtTz : getStartOfDayAtTz("UTC")) + 86400;
}

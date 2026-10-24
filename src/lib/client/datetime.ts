import { getUnixTime, startOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

/**
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns The timezone, or "UTC" when date-fns-tz cannot resolve it (e.g. "Etc/Unknown")
 */
export function resolveTimezone(timezone: string): string {
  return Number.isNaN(toZonedTime(new Date(), timezone).getTime()) ? "UTC" : timezone;
}

/**
 * Get start of day timestamp for a given timezone
 * @param timezone - IANA timezone string (e.g., "America/New_York"); UTC when date-fns-tz cannot resolve it
 * @returns Start of day in the given timezone as Unix timestamp (seconds)
 */
export function getStartOfDayAtTz(timezone: string): number {
  const tz = resolveTimezone(timezone);
  const startOfZonedDay = startOfDay(toZonedTime(new Date(), tz));
  return getUnixTime(fromZonedTime(startOfZonedDay, tz));
}

/**
 * Get end of day timestamp for a given timezone
 * @param timezone - IANA timezone string (e.g., "America/New_York"); UTC when date-fns-tz cannot resolve it
 * @returns End of day in the given timezone as Unix timestamp (seconds)
 */
export function getEndOfDayAtTz(timezone: string): number {
  return getStartOfDayAtTz(timezone) + 86400;
}

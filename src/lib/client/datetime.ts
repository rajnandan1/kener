import { getUnixTime } from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

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
  return getZonedMidnight(resolveTimezone(timezone), 0);
}

/**
 * Get end of day timestamp for a given timezone
 * @param timezone - IANA timezone string (e.g., "America/New_York"); UTC when date-fns-tz cannot resolve it
 * @returns End of day in the given timezone as Unix timestamp (seconds)
 */
export function getEndOfDayAtTz(timezone: string): number {
  // The next local midnight, not start + 86400: a daylight-saving day is 23 or 25 hours long.
  return getZonedMidnight(resolveTimezone(timezone), 1);
}

/**
 * Midnight of today + dayOffset in the given timezone, as Unix timestamp (seconds).
 * The date is taken and shifted as a plain calendar date, and the midnight is read in `tz`
 * from a wall-clock string, so the runtime's own timezone (and its DST days) never takes part.
 */
function getZonedMidnight(tz: string, dayOffset: number): number {
  const [year, month, day] = formatInTimeZone(new Date(), tz, "yyyy-MM-dd").split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset)).toISOString().slice(0, 10);
  return getUnixTime(fromZonedTime(`${date}T00:00:00`, tz));
}

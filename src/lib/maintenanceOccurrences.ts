import { fromZonedTime } from "date-fns-tz";
import { rrulestr } from "rrule";

const DAY_MS = 86_400_000;
const UTC_UNTIL = /UNTIL=(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/i;

export interface MaintenanceSchedule {
  start_date_time: number;
  rrule: string;
  timezone?: string | null;
}

export type OccurrenceRange = { to: Date; limit?: never } | { limit: number; to?: never };

interface Clock {
  toWall: (instantMs: number) => number;
  toInstant: (wallMs: number) => number;
  gapNear: (instantMs: number) => number;
}

const UTC_CLOCK: Clock = { toWall: (ms) => ms, toInstant: (ms) => ms, gapNear: () => 0 };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timezone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  formatters.set(timezone, formatter);
  return formatter;
}

// date-fns-tz getTimezoneOffset reads its date as a local time of the server, so it cannot give the offset at an instant.
function offsetAt(timezone: string, instantMs: number): number {
  const part = Object.fromEntries(
    formatterFor(timezone)
      .formatToParts(instantMs)
      .map((p) => [p.type, Number(p.value)]),
  );
  const wallMs = Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute, part.second);
  return wallMs - Math.floor(instantMs / 1000) * 1000;
}

// RFC 5545 section 3.3.5: a missing local time uses the offset before the gap, and a repeated local time its first occurrence.
// fromZonedTime uses the offset after the gap, and its choice for a repeated time changes with the server timezone.
function wallClockToInstant(wallMs: number, timezone: string): number {
  const instantMs = fromZonedTime(new Date(wallMs).toISOString().slice(0, 19), timezone).getTime();
  const before = offsetAt(timezone, instantMs - DAY_MS);
  const after = offsetAt(timezone, instantMs + DAY_MS);
  if (before === after) return instantMs;
  const larger = Math.max(before, after);
  return offsetAt(timezone, wallMs - larger) === larger ? wallMs - larger : wallMs - Math.min(before, after);
}

const zonedClock = (timezone: string): Clock => ({
  toWall: (instantMs) => instantMs + offsetAt(timezone, instantMs),
  toInstant: (wallMs) => wallClockToInstant(wallMs, timezone),
  gapNear: (instantMs) => Math.max(0, offsetAt(timezone, instantMs + DAY_MS) - offsetAt(timezone, instantMs - DAY_MS)),
});

const rfcDateTime = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").split(".")[0];

// RFC 5545 section 3.3.10 makes UNTIL with Z an instant. rrule compares local times here, so it gets one day more and getOccurrences applies the instant.
function splitUtcUntil(rrule: string, clock: Clock): { wallRule: string; untilMs: number } {
  const match = rrule.match(UTC_UNTIL);
  if (!match) return { wallRule: rrule, untilMs: Infinity };
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const untilMs = Date.UTC(year, month - 1, day, hour, minute, second);
  return { wallRule: rrule.replace(UTC_UNTIL, `UNTIL=${rfcDateTime(clock.toWall(untilMs) + DAY_MS)}`), untilMs };
}

/**
 * The occurrences of a schedule from `from`, ascending and unique, up to `range.to` (inclusive) or `range.limit`.
 * The rule repeats in `schedule.timezone`, or in UTC when it is empty. The rrule TZID option stays unused, because its output changes with the server timezone.
 */
export function getOccurrences(schedule: MaintenanceSchedule, from: Date, range: OccurrenceRange): Date[] {
  const { start_date_time, rrule, timezone } = schedule;
  const clock = timezone ? zonedClock(timezone) : UTC_CLOCK;
  const { wallRule, untilMs } = timezone ? splitUtcUntil(rrule, clock) : { wallRule: rrule, untilMs: Infinity };
  const fromMs = from.getTime();
  const lastMs = Math.min(range.to?.getTime() ?? Infinity, untilMs);
  const found = new Set<number>();
  // A gap can move a local time past the next ones, so the walk stops one gap after the end.
  let stopMs = Number.isFinite(lastMs) ? lastMs + clock.gapNear(lastMs) : Infinity;

  const dtstart = rfcDateTime(clock.toWall(start_date_time * 1000));
  rrulestr(`DTSTART:${dtstart}Z\nRRULE:${wallRule}`).all((wall) => {
    if (wall.getTime() < fromMs - 2 * DAY_MS) return true;
    const instantMs = clock.toInstant(wall.getTime());
    if (instantMs >= fromMs && instantMs <= lastMs) found.add(instantMs);
    if (found.size === range.limit) stopMs = Math.min(stopMs, instantMs + clock.gapNear(instantMs));
    return instantMs <= stopMs;
  });

  return [...found]
    .sort((a, b) => a - b)
    .slice(0, range.limit)
    .map((ms) => new Date(ms));
}

export function isValidRrule(rrule: string): boolean {
  try {
    rrulestr(`DTSTART:${rfcDateTime(Date.now())}Z\nRRULE:${rrule}`);
    return true;
  } catch {
    return false;
  }
}

export function isValidTimezone(timezone: string): boolean {
  if (!/^[A-Za-z]/.test(timezone)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export const wallClockToStart = (wallClock: string, timezone: string): number =>
  zonedClock(timezone).toInstant(Date.parse(`${wallClock}Z`)) / 1000;

export const startToWallClock = (startDateTime: number, timezone: string): string =>
  new Date(zonedClock(timezone).toWall(startDateTime * 1000)).toISOString().slice(0, 16);

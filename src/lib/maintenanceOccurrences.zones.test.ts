import { describe, expect, it } from "vitest";
import { getOccurrences } from "./maintenanceOccurrences";

const ZONES = Intl.supportedValuesOf("timeZone");
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const FIRST_DAY_MS = Date.UTC(2026, 0, 1);
const DAYS_2026_TO_2028 = 1096;
const SLOT_MS = 15 * MINUTE_MS;
const SLOTS_PER_DAY = DAY_MS / SLOT_MS;
const DAYS_AROUND_TRANSITION = 6;
const REPEAT_LENGTHS_MS = [30, 60, 120].map((minutes) => minutes * MINUTE_MS);

type WallReader = (instantMs: number) => number;

const wallReader = (timeZone: string): WallReader => {
  const format = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return (instantMs) => Date.parse(`${format.format(instantMs).replace(" ", "T")}Z`);
};

function problemWith(wallOf: WallReader, wantedWall: number, instantMs: number): string | null {
  const offsetAt = (ms: number) => wallOf(ms) - ms;
  const before = offsetAt(instantMs - DAY_MS);
  const after = offsetAt(instantMs + DAY_MS);
  if (wallOf(instantMs) === wantedWall) {
    const earlier = REPEAT_LENGTHS_MS.some((length) => wallOf(instantMs - length) === wantedWall);
    return earlier ? "is not the first occurrence" : null;
  }
  const missing = wallOf(wantedWall - before) !== wantedWall && wallOf(wantedWall - after) !== wantedWall;
  if (!missing) return `shows ${new Date(wallOf(instantMs)).toISOString()}`;
  return instantMs === wantedWall - before ? null : "does not use the offset before the gap";
}

function checkDays(zone: string, wallOf: WallReader, firstWall: number, days: number, failures: string[]): number {
  const start = (firstWall - (wallOf(firstWall) - firstWall)) / 1000;
  const schedule = { start_date_time: start, rrule: "FREQ=DAILY", timezone: zone };
  const found = getOccurrences(schedule, new Date(start * 1000), { limit: days });
  if (found.length !== days) failures.push(`${zone} from ${firstWall}: ${found.length} of ${days} occurrences`);
  found.forEach((date, day) => {
    const wantedWall = firstWall + day * DAY_MS;
    const problem = problemWith(wallOf, wantedWall, date.getTime());
    if (problem) failures.push(`${zone} ${new Date(wantedWall).toISOString()} ${problem}`);
  });
  return found.length;
}

function transitionDays(wallOf: WallReader): number[] {
  const days: number[] = [];
  for (let day = 0; day < DAYS_2026_TO_2028; day++) {
    const dayMs = FIRST_DAY_MS + day * DAY_MS;
    if (wallOf(dayMs) - dayMs !== wallOf(dayMs + DAY_MS) - dayMs - DAY_MS) days.push(dayMs);
  }
  return days;
}

describe("every zone keeps the requested local time from 2026 to 2028, except in a gap", () => {
  it(
    `walks a daily 02:30 and a 15-minute grid around each transition in ${ZONES.length} zones`,
    {
      timeout: 120_000,
    },
    () => {
      const failures: string[] = [];
      let occurrences = 0;
      let transitions = 0;

      for (const zone of ZONES) {
        const wallOf = wallReader(zone);
        occurrences += checkDays(zone, wallOf, Date.UTC(2026, 0, 1, 2, 30), DAYS_2026_TO_2028, failures);
        for (const dayMs of transitionDays(wallOf)) {
          transitions++;
          for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
            const firstWall = dayMs - 2 * DAY_MS + slot * SLOT_MS;
            occurrences += checkDays(zone, wallOf, firstWall, DAYS_AROUND_TRANSITION, failures);
          }
        }
      }

      expect(failures.slice(0, 20)).toEqual([]);
      expect(ZONES.length).toBeGreaterThan(400);
      expect(transitions).toBeGreaterThan(300);
      expect(occurrences).toBe(ZONES.length * DAYS_2026_TO_2028 + transitions * SLOTS_PER_DAY * DAYS_AROUND_TRANSITION);
    },
  );
});

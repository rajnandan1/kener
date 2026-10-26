import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Writable } from "svelte/store";

vi.mock("$lib/stores/i18n", () => ({ i18n: { init: vi.fn() } }));
vi.mock("$lib/stores/timezone", async () => {
  const { writable } = await import("svelte/store");
  return { timezone: { init: vi.fn() }, selectedTimezone: writable("UTC") };
});

import { selectedTimezone } from "$lib/stores/timezone";
import { GetLayoutClientData } from "./layoutClientData";

const languageSetting = { defaultLocale: "en", locales: [] };

describe("GetLayoutClientData", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-20T15:30:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("falls back to UTC for a zone date-fns-tz cannot resolve", async () => {
    (selectedTimezone as Writable<string>).set("Etc/Unknown");
    expect(await GetLayoutClientData(languageSetting, fetch)).toEqual({
      localTz: "Etc/Unknown",
      startOfDayTodayAtTz: Date.UTC(2026, 9, 20) / 1000,
      nowAtTz: Date.UTC(2026, 9, 20, 15, 30) / 1000,
      endOfDayTodayAtTz: Date.UTC(2026, 9, 21) / 1000,
    });
  });
});

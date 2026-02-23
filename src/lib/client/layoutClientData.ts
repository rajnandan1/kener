import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, getUnixTime } from "date-fns";
import { get } from "svelte/store";
import { i18n } from "$lib/stores/i18n";
import { timezone, selectedTimezone } from "$lib/stores/timezone";

export interface LayoutClientData {
  localTz: string;
  startOfDayTodayAtTz: number;
  nowAtTz: number;
  endOfDayTodayAtTz: number;
}

interface LanguageSetting {
  defaultLocale: string;
  locales: Array<{ code: string; name: string; selected: boolean; disabled: boolean }>;
}

export async function GetLayoutClientData(
  languageSetting: LanguageSetting,
  fetchFn: typeof fetch,
): Promise<LayoutClientData> {
  // Initialize i18n store with available locales
  await i18n.init(languageSetting.locales, languageSetting.defaultLocale, fetchFn);

  // Initialize timezone store (checks localStorage, falls back to browser timezone)
  timezone.init();

  // Get the selected timezone from the store
  const localTz = get(selectedTimezone);

  // Calculate start of day in the selected timezone as Unix timestamp
  const now = new Date();
  const zonedTime = toZonedTime(now, localTz);
  const startOfZonedDay = startOfDay(zonedTime);
  const startOfDayInUTC = fromZonedTime(startOfZonedDay, localTz);
  const startOfDayTodayAtTz = getUnixTime(startOfDayInUTC);
  const nowAtTz = getUnixTime(fromZonedTime(now, localTz));

  return {
    localTz,
    startOfDayTodayAtTz,
    nowAtTz,
    endOfDayTodayAtTz: startOfDayTodayAtTz + 86400,
  };
}

import { fromZonedTime } from "date-fns-tz";
import { getUnixTime } from "date-fns";
import { get } from "svelte/store";
import { i18n } from "$lib/stores/i18n";
import { timezone, selectedTimezone } from "$lib/stores/timezone";
import { getStartOfDayAtTz, resolveTimezone } from "./datetime";

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

  const tz = resolveTimezone(localTz);
  const startOfDayTodayAtTz = getStartOfDayAtTz(tz);
  const nowAtTz = getUnixTime(fromZonedTime(new Date(), tz));

  return {
    localTz,
    startOfDayTodayAtTz,
    nowAtTz,
    endOfDayTodayAtTz: startOfDayTodayAtTz + 86400,
  };
}

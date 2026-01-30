import type { LayoutLoad } from "./$types";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, getUnixTime } from "date-fns";
import { i18n } from "$lib/stores/i18n";

export const load: LayoutLoad = async ({ data, fetch }) => {
  // Initialize i18n store with available locales
  await i18n.init(data.languageSetting.locales, data.languageSetting.defaultLocale, fetch);
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Calculate start of day in the user's timezone as Unix timestamp
  const now = new Date();
  const zonedTime = toZonedTime(now, localTz);
  const startOfZonedDay = startOfDay(zonedTime);
  const startOfDayInUTC = fromZonedTime(startOfZonedDay, localTz);
  const startOfDayTodayAtTz = getUnixTime(startOfDayInUTC);
  const nowAtTz = getUnixTime(fromZonedTime(now, localTz));

  //
  //

  return {
    ...data,
    localTz,
    startOfDayTodayAtTz,
    nowAtTz,
    endOfDayTodayAtTz: startOfDayTodayAtTz + 86400,
  };
};

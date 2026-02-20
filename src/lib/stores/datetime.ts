import { derived, get } from "svelte/store";
import { format, formatDistanceStrict } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  af,
  ar,
  arDZ,
  arEG,
  arMA,
  arSA,
  arTN,
  az,
  be,
  bg,
  bn,
  bs,
  ca,
  cs,
  cy,
  da,
  de,
  deAT,
  el,
  enAU,
  enCA,
  enGB,
  enIE,
  enIN,
  enNZ,
  enUS,
  enZA,
  eo,
  es,
  et,
  eu,
  faIR,
  fi,
  fr,
  frCA,
  frCH,
  fy,
  gd,
  gl,
  gu,
  he,
  hi,
  hr,
  ht,
  hu,
  hy,
  id,
  is,
  it,
  ja,
  jaHira,
  ka,
  kk,
  km,
  kn,
  ko,
  lb,
  lt,
  lv,
  mk,
  mn,
  ms,
  mt,
  nb,
  nl,
  nlBE,
  nn,
  oc,
  pl,
  pt,
  ptBR,
  ro,
  ru,
  sk,
  sl,
  sq,
  sr,
  srLatn,
  sv,
  ta,
  te,
  th,
  tr,
  ug,
  uk,
  uz,
  uzCyrl,
  vi,
  zhCN,
  zhHK,
  zhTW,
} from "date-fns/locale";
import { selectedTimezone } from "./timezone";
import { currentLocale } from "./i18n";
import type { Locale } from "date-fns";

// Map i18n locale codes to date-fns locale objects
const localeMap: Record<string, Locale> = {
  af: af,
  ar: ar,
  "ar-DZ": arDZ,
  "ar-EG": arEG,
  "ar-MA": arMA,
  "ar-SA": arSA,
  "ar-TN": arTN,
  az: az,
  be: be,
  bg: bg,
  bn: bn,
  bs: bs,
  ca: ca,
  cs: cs,
  cy: cy,
  da: da,
  de: de,
  "de-AT": deAT,
  el: el,
  en: enUS,
  "en-AU": enAU,
  "en-CA": enCA,
  "en-GB": enGB,
  "en-IE": enIE,
  "en-IN": enIN,
  "en-NZ": enNZ,
  "en-US": enUS,
  "en-ZA": enZA,
  eo: eo,
  es: es,
  et: et,
  eu: eu,
  "fa-IR": faIR,
  fi: fi,
  fr: fr,
  "fr-CA": frCA,
  "fr-CH": frCH,
  fy: fy,
  gd: gd,
  gl: gl,
  gu: gu,
  he: he,
  hi: hi,
  hr: hr,
  ht: ht,
  hu: hu,
  hy: hy,
  id: id,
  is: is,
  it: it,
  ja: ja,
  "ja-Hira": jaHira,
  ka: ka,
  kk: kk,
  km: km,
  kn: kn,
  ko: ko,
  lb: lb,
  lt: lt,
  lv: lv,
  mk: mk,
  mn: mn,
  ms: ms,
  mt: mt,
  nb: nb,
  nl: nl,
  "nl-BE": nlBE,
  nn: nn,
  oc: oc,
  pl: pl,
  pt: pt,
  "pt-BR": ptBR,
  ro: ro,
  ru: ru,
  sk: sk,
  sl: sl,
  sq: sq,
  sr: sr,
  "sr-Latn": srLatn,
  sv: sv,
  ta: ta,
  te: te,
  th: th,
  tr: tr,
  ug: ug,
  uk: uk,
  uz: uz,
  "uz-Cyrl": uzCyrl,
  vi: vi,
  "zh-CN": zhCN,
  "zh-HK": zhHK,
  "zh-TW": zhTW,
};

/**
 * Get the date-fns locale object for a given locale code
 * Falls back to enUS if locale not found
 */
export function getDateFnsLocale(localeCode: string): Locale {
  return localeMap[localeCode] || localeMap[localeCode.split("-")[0]] || enUS;
}

/**
 * Derived store that provides the current date-fns locale
 */
export const dateFnsLocale = derived(currentLocale, ($locale) => getDateFnsLocale($locale));

/**
 * Parse incoming date values from app/DB payloads.
 * Supports:
 * - Unix timestamps (seconds/milliseconds)
 * - Date objects
 * - UTC strings from DB like "YYYY-MM-DD HH:mm:ss"
 * - ISO strings
 */
function parseDateInput(date: Date | number | string): Date {
  if (typeof date === "number") {
    // Check if timestamp is in seconds (Unix) or milliseconds
    return date < 10000000000 ? new Date(date * 1000) : new Date(date);
  }

  if (date instanceof Date) {
    return date;
  }

  // DB UTC format without timezone offset: "YYYY-MM-DD HH:mm:ss"
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(date)) {
    return new Date(date.replace(" ", "T") + "Z");
  }

  return new Date(date);
}

/**
 * Format a date with timezone and locale support
 * @param date - Date object or timestamp (in milliseconds or seconds)
 * @param formatStr - date-fns format string (e.g., "PPpp", "yyyy-MM-dd")
 * @param tz - Optional timezone override (uses store value if not provided)
 * @param locale - Optional locale override (uses store value if not provided)
 */
export function formatDateTz(date: Date | number | string, formatStr: string, tz?: string, locale?: Locale): string {
  const timezone = tz || get(selectedTimezone);
  const loc = locale || get(dateFnsLocale);

  const dateObj = parseDateInput(date);

  // Convert to the target timezone
  const zonedDate = toZonedTime(dateObj, timezone);

  // Format with locale
  return format(zonedDate, formatStr, { locale: loc });
}

/**
 * Derived store that provides a reactive format function
 * Use: $formatDate(timestamp, "PPpp")
 */
export const formatDate = derived([selectedTimezone, dateFnsLocale], ([$tz, $locale]) => {
  return (date: Date | number | string, formatStr: string): string => {
    const dateObj = parseDateInput(date);

    // Convert to the target timezone
    const zonedDate = toZonedTime(dateObj, $tz);

    // Format with locale
    return format(zonedDate, formatStr, { locale: $locale });
  };
});

/**
 * Derived store that provides a reactive duration formatting function
 * Formats the duration between two timestamps with locale support
 * Use: $formatDuration(startTimestamp, endTimestamp)
 * @param start - Start timestamp (Unix seconds or milliseconds)
 * @param end - End timestamp (Unix seconds or milliseconds), or null for ongoing
 * @param ongoingText - Text to show if end is null (default: "Ongoing")
 */
export const formatDuration = derived([dateFnsLocale], ([$locale]) => {
  return (start: number, end: number | null, ongoingText: string = "Ongoing"): string => {
    if (end === null || end === undefined) return ongoingText;

    // Convert timestamps to Date objects
    const startDate = start < 10000000000 ? new Date(start * 1000) : new Date(start);
    const endDate = end < 10000000000 ? new Date(end * 1000) : new Date(end);

    return formatDistanceStrict(startDate, endDate, { locale: $locale });
  };
});

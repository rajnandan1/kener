import { format, formatDistance, formatDistanceToNow, formatDuration, type Duration } from "date-fns";
import {
  ru,
  enUS,
  hi,
  de,
  zhCN,
  vi,
  ja,
  nl,
  da,
  fr,
  ko,
  ptBR,
  tr,
  nb,
  pl,
  es,
  it,
  faIR,
  type Locale,
} from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

type LocaleKey =
  | "ru"
  | "en"
  | "hi"
  | "de"
  | "zh-CN"
  | "vi"
  | "ja"
  | "nl"
  | "dk"
  | "fr"
  | "ko"
  | "pt-BR"
  | "tr"
  | "nb-NO"
  | "pl"
  | "es"
  | "it"
  | "fa";

const locales: Record<LocaleKey, Locale> = {
  ru,
  en: enUS,
  hi,
  de,
  "zh-CN": zhCN,
  vi,
  ja,
  nl,
  dk: da,
  fr,
  ko,
  "pt-BR": ptBR,
  tr,
  "nb-NO": nb,
  pl,
  es,
  it,
  fa: faIR,
};

const f = function (date: Date | number | string, formatStr: string, locale: string, tz: string): string {
  return formatInTimeZone(date, tz, formatStr, {
    locale: locales[locale as LocaleKey] || enUS,
  });
};

const fd = function (start: Date | number, end: Date | number, locale: string): string {
  return formatDistance(start, end, { addSuffix: false, locale: locales[locale as LocaleKey] });
};
const fdn = function (start: Date | number, locale: string): string {
  return formatDistanceToNow(start, { addSuffix: true, locale: locales[locale as LocaleKey] });
};
const fdm = function (duration: Duration, locale: string): string {
  return formatDuration(duration, {
    format: ["days", "hours", "minutes"],
    zero: false,
    delimiter: " ",
    locale: locales[locale as LocaleKey],
  });
};

const l = function (sessionLangMap: Record<string, string>, key: string, args: Record<string, string> = {}): string {
  try {
    let obj = sessionLangMap[key];

    // Replace placeholders in the string using the args object
    if (obj && typeof obj === "string") {
      obj = obj.replace(/%\w+/g, (placeholder) => {
        const argKey = placeholder.slice(1); // Remove the `%` to get the key
        return args[argKey] !== undefined ? args[argKey] : placeholder;
      });
    }
    return obj || key;
  } catch (e) {
    return key;
  }
};
const summaryTime = function (summaryStatus: string): string {
  if (summaryStatus == "No Data") {
    return "No Data";
  }
  if (summaryStatus == "UP") {
    return "Status OK";
  }

  return "%status for %duration";
};

export { l, summaryTime, f, formatDistance, fd, fdn, fdm };

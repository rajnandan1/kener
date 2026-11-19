import { cs, enGB, pl } from "date-fns/locale";
import english from "./en.json";
import polish from "./pl.json";
import czech from "./cs.json";

/** Register a catalogue, its native name, and its date formats in one place. */
export const adminLanguages = [
  { code: "en", label: "English", localeTag: "en-GB", dateLocale: enGB, messages: english },
  { code: "pl", label: "Polski", localeTag: "pl-PL", dateLocale: pl, messages: polish },
  { code: "cs", label: "Čeština", localeTag: "cs-CZ", dateLocale: cs, messages: czech },
] as const;

export type AdminLocale = (typeof adminLanguages)[number]["code"];

export function isAdminLocale(value: unknown): value is AdminLocale {
  return adminLanguages.some((language) => language.code === value);
}

export function getAdminLanguage(locale: AdminLocale) {
  return adminLanguages.find((language) => language.code === locale)!;
}

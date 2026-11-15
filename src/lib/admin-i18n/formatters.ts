import { formatDistanceToNow } from "date-fns";
import { enGB, pl } from "date-fns/locale";
import { adminLocaleTag, type AdminLocale } from "./messages";

/** Display-only duration formatting; source timestamps and stored values remain unchanged. */
export function formatAdminDuration(seconds: number, locale: AdminLocale, useDays = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const value = Math.floor(seconds);
  const unit = (amount: number, name: string) =>
    new Intl.NumberFormat(adminLocaleTag(locale), {
      style: "unit",
      unit: name,
      unitDisplay: "short",
      maximumFractionDigits: 0,
    }).format(amount);
  if (value < 60) return unit(value, "second");
  const minutes = Math.floor(value / 60);
  if (minutes < 60) return unit(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (useDays && hours >= 24) return [unit(Math.floor(hours / 24), "day"), unit(hours % 24, "hour")].join(" ");
  return [unit(hours, "hour"), minutes % 60 ? unit(minutes % 60, "minute") : ""].filter(Boolean).join(" ");
}

export function formatAdminRelative(date: Date, locale: AdminLocale): string {
  return formatDistanceToNow(date, { addSuffix: false, locale: locale === "pl" ? pl : enGB });
}

export function formatAdminDate(date: Date, locale: AdminLocale, timeZone?: string): string {
  return new Intl.DateTimeFormat(adminLocaleTag(locale), {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

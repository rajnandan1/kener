import type { ContentTranslations } from "$lib/types/common";

/**
 * Normalize a raw translations value (DB JSON string, already-parsed object,
 * or null/undefined) into a ContentTranslations object. Never throws;
 * malformed input degrades to null ("no translations").
 */
export function parseContentTranslations(value: unknown): ContentTranslations | null {
  if (value === null || value === undefined) return null;
  let parsed: unknown = value;
  if (typeof value === "string") {
    if (value.trim() === "") return null;
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  return parsed as ContentTranslations;
}

/**
 * Resolve one translated field. Returns translations[locale][field] when it is
 * a non-empty string, else the fallback (base-language) text. Accepts the raw
 * DB string form so payloads that pass records through whole need no parsing.
 */
export function resolveTranslation(
  translations: ContentTranslations | string | null | undefined,
  locale: string,
  field: string,
  fallback: string,
): string {
  const parsed = parseContentTranslations(translations);
  if (!parsed) return fallback;
  const localeFields = parsed[locale];
  if (typeof localeFields !== "object" || localeFields === null || Array.isArray(localeFields)) return fallback;
  const value = (localeFields as Record<string, unknown>)[field];
  if (typeof value === "string" && value.trim() !== "") return value;
  return fallback;
}

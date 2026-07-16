/**
 * Server-side validation for per-entity content translations.
 * Locale codes are valid iff Kener ships a locale file for them — NOT
 * restricted to currently-enabled locales, so toggling a locale off never
 * invalidates stored data.
 */

import { isLocaleAvailable } from "./i18n.js";
import type { ContentTranslations } from "../types/common.js";

export const MONITOR_TRANSLATABLE_FIELDS = ["name", "description"] as const;
export const INCIDENT_TRANSLATABLE_FIELDS = ["title"] as const;
export const INCIDENT_COMMENT_TRANSLATABLE_FIELDS = ["comment"] as const;
export const MAINTENANCE_TRANSLATABLE_FIELDS = ["title", "description"] as const;

// Caps match the smallest supported column type of the base fields.
const FIELD_LENGTH_CAPS: Record<string, number> = {
  name: 255,
  title: 255,
  description: 65535,
  comment: 65535,
};

export function validateContentTranslations(
  input: unknown,
  allowedFields: readonly string[],
): ContentTranslations | null {
  if (input === null || input === undefined) return null;

  let value: unknown = input;
  if (typeof value === "string") {
    if (value.trim() === "") return null;
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error("translations must be valid JSON");
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("translations must be an object keyed by locale code");
  }

  const result: ContentTranslations = {};
  for (const [locale, fields] of Object.entries(value as Record<string, unknown>)) {
    if (!isLocaleAvailable(locale)) {
      throw new Error(`Unknown locale "${locale}" in translations`);
    }
    if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
      throw new Error(`translations["${locale}"] must be an object of field to string`);
    }
    const localeResult: Record<string, string> = {};
    for (const [field, text] of Object.entries(fields as Record<string, unknown>)) {
      if (!allowedFields.includes(field)) {
        throw new Error(`Field "${field}" is not translatable for this content`);
      }
      if (typeof text !== "string") {
        throw new Error(`translations["${locale}"]["${field}"] must be a string`);
      }
      const cap = FIELD_LENGTH_CAPS[field] ?? 255;
      if (text.length > cap) {
        throw new Error(`translations["${locale}"]["${field}"] exceeds ${cap} characters`);
      }
      if (text.trim() === "") continue; // empty values are never stored
      localeResult[field] = text;
    }
    if (Object.keys(localeResult).length > 0) {
      result[locale] = localeResult;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function serializeContentTranslations(
  input: unknown,
  allowedFields: readonly string[],
): string | null {
  const validated = validateContentTranslations(input, allowedFields);
  return validated ? JSON.stringify(validated) : null;
}

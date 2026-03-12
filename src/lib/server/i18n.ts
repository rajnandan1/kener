/**
 * Server-side i18n helper for translating strings outside of Svelte components.
 * Reads locale JSON files from disk using Node.js fs (compatible with both
 * Vite dev server and esbuild production bundle).
 */

import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const localeModules: Record<string, { name: string; mappings: Record<string, string> }> = {};

const localesDir = join(process.cwd(), "src", "lib", "locales");
try {
  const files = readdirSync(localesDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const key = `/src/lib/locales/${file}`;
    localeModules[key] = JSON.parse(readFileSync(join(localesDir, file), "utf-8"));
  }
} catch {
  console.warn("Could not load locale files from", localesDir);
}

const localeCache = new Map<string, Record<string, string>>();

function getMappings(locale: string): Record<string, string> {
  if (localeCache.has(locale)) return localeCache.get(locale)!;
  const key = `/src/lib/locales/${locale}.json`;
  const mappings = localeModules[key]?.mappings ?? {};
  localeCache.set(locale, mappings);
  return mappings;
}

/**
 * Translate a key for a given locale. Falls back to the default locale, then to the key itself.
 */
export function translate(locale: string, key: string, defaultLocale: string = "en"): string {
  const mappings = getMappings(locale);
  if (mappings[key]) return mappings[key];
  if (locale !== defaultLocale) {
    const fallbackMappings = getMappings(defaultLocale);
    if (fallbackMappings[key]) return fallbackMappings[key];
  }
  return key;
}

/**
 * Check if a locale code has a corresponding locale file.
 */
export function isLocaleAvailable(locale: string): boolean {
  const key = `/src/lib/locales/${locale}.json`;
  return key in localeModules;
}

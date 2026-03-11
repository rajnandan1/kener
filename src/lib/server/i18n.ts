/**
 * Server-side i18n helper for translating strings outside of Svelte components.
 * Reads locale JSON files eagerly via Vite's import.meta.glob.
 */

const localeModules = import.meta.glob("/src/lib/locales/*.json", {
  eager: true,
  import: "default",
}) as Record<string, { name: string; mappings: Record<string, string> }>;

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

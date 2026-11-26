import { writable, derived, get } from "svelte/store";

// Pre-import locale JSON files at build time for SSR (avoids fetch during SSR)
const localeModules = import.meta.glob("/src/lib/locales/*.json", {
  eager: true,
  import: "default",
}) as Record<string, { name: string; mappings: Record<string, string> }>;

/**
 * List of available locales derived from the locale files in src/lib/locales/.
 * Each entry has a code and human-readable name (read from the JSON file itself).
 */
export const availableLocalesList: { code: string; name: string }[] = Object.keys(localeModules)
  .map((key) => {
    const code = key.replace("/src/lib/locales/", "").replace(".json", "");
    return { code, name: localeModules[key]?.name || code };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

function getLocaleFromModules(locale: string): Record<string, string> | null {
  const key = `/src/lib/locales/${locale}.json`;
  return localeModules[key]?.mappings ?? null;
}

const LOCALE_STORAGE_KEY = "kener_preferred_locale";

export interface LocaleInfo {
  code: string;
  name: string;
  disabled?: boolean;
  selected?: boolean;
}

/**
 * Translations of text the site owner typed in (monitor names, page headers, the footer...),
 * keyed by locale code, then by the text exactly as it was typed.
 */
export type ContentTranslations = Record<string, Record<string, string>>;

export interface I18nStore {
  currentLocale: string;
  translations: Record<string, string>;
  contentTranslations: ContentTranslations;
  availableLocales: LocaleInfo[];
  isLoading: boolean;
}

const defaultState: I18nStore = {
  currentLocale: "en",
  translations: {},
  contentTranslations: {},
  availableLocales: [],
  isLoading: false,
};

// Store the fetch function for later use (client-side locale changes)
let storedFetch: typeof fetch = globalThis.fetch;

function createI18nStore() {
  const { subscribe, set, update } = writable<I18nStore>(defaultState);

  return {
    subscribe,

    /**
     * Initialize the store with available locales and load the appropriate locale
     * Checks localStorage first, then falls back to defaultLocale
     * @param fetchFn - The fetch function from SvelteKit load
     * @param contentTranslations - Translations of the site's own text, by locale
     */
    async init(
      availableLocales: LocaleInfo[],
      defaultLocale: string,
      fetchFn: typeof fetch,
      contentTranslations: ContentTranslations = {},
    ): Promise<void> {
      // Store fetch for later use
      storedFetch = fetchFn;

      // Determine which locale to use
      let preferredLocale = defaultLocale;

      // Check localStorage for saved preference (only in browser)
      if (typeof window !== "undefined") {
        const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (savedLocale && availableLocales.some((l) => l.code === savedLocale)) {
          preferredLocale = savedLocale;
        }
      }

      update((state) => ({
        ...state,
        availableLocales,
        contentTranslations,
        currentLocale: preferredLocale,
        isLoading: true,
      }));

      // Fetch the translations
      await this.loadTranslations(preferredLocale);
    },

    /**
     * Load translations for a specific locale
     */
    async loadTranslations(locale: string): Promise<void> {
      update((state) => ({ ...state, isLoading: true }));

      try {
        // Use pre-imported locale modules (works for both SSR and client)
        let translations = getLocaleFromModules(locale);
        if (!translations && locale !== "en") {
          console.error(`Failed to load locale ${locale}, falling back to en`);
          translations = getLocaleFromModules("en");
          locale = "en";
        }

        if (translations) {
          update((state) => ({
            ...state,
            currentLocale: locale,
            translations,
            isLoading: false,
          }));
        } else {
          update((state) => ({ ...state, isLoading: false }));
        }
      } catch (error) {
        console.error(`Error loading translations for ${locale}:`, error);
        update((state) => ({ ...state, isLoading: false }));
      }
    },

    /**
     * Change the current locale
     */
    async setLocale(locale: string): Promise<void> {
      const state = get({ subscribe });

      // Verify the locale is available
      if (!state.availableLocales.some((l) => l.code === locale)) {
        console.error(`Locale ${locale} is not available`);
        return;
      }

      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      }

      // Load the new translations
      await this.loadTranslations(locale);
    },

    /**
     * Get a translated string by key
     * Returns the key itself if translation not found
     */
    t(key: string): string {
      const state = get({ subscribe });
      return state.translations[key] || key;
    },

    /**
     * Reset the store to default state
     */
    reset(): void {
      set(defaultState);
    },
  };
}

export const i18n = createI18nStore();

/**
 * Derived store for easy access to current locale
 */
export const currentLocale = derived(i18n, ($i18n) => $i18n.currentLocale);

/**
 * Derived store for translations
 */
export const translations = derived(i18n, ($i18n) => $i18n.translations);

/**
 * Helper function to get translated string with variable replacement (reactive)
 * Use this in components: $t("key") or $t("key", { name: "value" })
 * Placeholders in translations use %varname format, e.g. "Hello %name"
 */
export const t = derived(i18n, ($i18n) => {
  return (key: string, args: Record<string, string> = {}): string => {
    try {
      let str = $i18n.translations[key];

      // Replace placeholders in the string using the args object
      if (str && typeof str === "string") {
        str = str.replace(/%\w+/g, (placeholder) => {
          const argKey = placeholder.slice(1); // Remove the `%` to get the key
          return args[argKey] !== undefined ? args[argKey] : placeholder;
        });
      }

      //warn if missing translation
      if (!str) {
        console.warn(`Missing translation for key: "${key}"`);
      }

      return str || key;
    } catch (e) {
      return key;
    }
  };
});

/**
 * Translate a text the site owner typed in, such as a monitor name or a page header.
 * Returns the translation for the current locale, or the text unchanged when there is none.
 * Unlike `t`, a missing translation is expected here and is not logged.
 */
export function TranslateContent(
  contentTranslations: ContentTranslations | undefined,
  locale: string,
  text: string | null | undefined,
): string {
  if (!text) return text ?? "";
  const translated = contentTranslations?.[locale]?.[text.trim()];
  return typeof translated === "string" && translated.trim() !== "" ? translated : text;
}

/**
 * Reactive helper for the site's own text. Use in components: $tc(monitor.name)
 */
export const tc = derived(i18n, ($i18n) => {
  return (text: string | null | undefined): string =>
    TranslateContent($i18n.contentTranslations, $i18n.currentLocale, text);
});

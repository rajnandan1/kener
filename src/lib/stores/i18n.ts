import { writable, derived, get } from "svelte/store";

const LOCALE_STORAGE_KEY = "kener_preferred_locale";

export interface LocaleInfo {
  code: string;
  name: string;
  disabled?: boolean;
  selected?: boolean;
}

export interface I18nStore {
  currentLocale: string;
  translations: Record<string, string>;
  availableLocales: LocaleInfo[];
  isLoading: boolean;
}

const defaultState: I18nStore = {
  currentLocale: "en",
  translations: {},
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
     */
    async init(availableLocales: LocaleInfo[], defaultLocale: string, fetchFn: typeof fetch): Promise<void> {
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
        const response = await storedFetch(`/locales/${locale}.json`);
        if (!response.ok) {
          console.error(`Failed to load locale ${locale}, falling back to en`);
          // Try to load English as fallback
          if (locale !== "en") {
            const fallbackResponse = await storedFetch("/locales/en.json");
            if (fallbackResponse.ok) {
              const translations = await fallbackResponse.json();
              update((state) => ({
                ...state,
                currentLocale: "en",
                translations,
                isLoading: false,
              }));
              return;
            }
          }
          update((state) => ({ ...state, isLoading: false }));
          return;
        }

        const translations = await response.json();
        update((state) => ({
          ...state,
          currentLocale: locale,
          translations,
          isLoading: false,
        }));
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

      return str || key;
    } catch (e) {
      return key;
    }
  };
});

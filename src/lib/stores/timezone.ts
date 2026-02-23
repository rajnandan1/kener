import { writable, derived } from "svelte/store";

const TIMEZONE_STORAGE_KEY = "kener_preferred_timezone";

export interface TimezoneStore {
  selectedTimezone: string;
  availableTimezones: string[];
}

function getDefaultTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getAllTimezones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

const defaultState: TimezoneStore = {
  selectedTimezone: getDefaultTimezone(),
  availableTimezones: [],
};

function createTimezoneStore() {
  const { subscribe, set, update } = writable<TimezoneStore>(defaultState);

  return {
    subscribe,

    /**
     * Initialize the store
     * Checks localStorage first, then falls back to browser's timezone
     */
    init(): void {
      const allTimezones = getAllTimezones();
      let preferredTimezone = getDefaultTimezone();

      // Check localStorage for saved preference (only in browser)
      if (typeof window !== "undefined") {
        const savedTimezone = localStorage.getItem(TIMEZONE_STORAGE_KEY);
        if (savedTimezone && allTimezones.includes(savedTimezone)) {
          preferredTimezone = savedTimezone;
        } else {
          // Save the default timezone to localStorage
          localStorage.setItem(TIMEZONE_STORAGE_KEY, preferredTimezone);
        }
      }

      set({
        selectedTimezone: preferredTimezone,
        availableTimezones: allTimezones,
      });
    },

    /**
     * Set the timezone and persist to localStorage
     */
    setTimezone(timezone: string): void {
      update((state) => {
        if (state.availableTimezones.includes(timezone)) {
          // Save to localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem(TIMEZONE_STORAGE_KEY, timezone);
          }
          return {
            ...state,
            selectedTimezone: timezone,
          };
        }
        return state;
      });
    },

    /**
     * Reset to browser's default timezone
     */
    reset(): void {
      const defaultTz = getDefaultTimezone();
      this.setTimezone(defaultTz);
    },
  };
}

export const timezone = createTimezoneStore();

// Derived store for easy access to just the selected timezone
export const selectedTimezone = derived(timezone, ($tz) => $tz.selectedTimezone);

// Derived store for available timezones
export const availableTimezones = derived(timezone, ($tz) => $tz.availableTimezones);

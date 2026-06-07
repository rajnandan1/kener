import type { PageSettings, PageSettingsPatch } from "$lib/types/api";
import GC from "$lib/global-constants";

// Stored page_settings_json keys differ from the API contract for the meta
// fields: the manage UI writes camelCase (metaPageTitle, metaPageDescription,
// socialPagePreviewImage) while the v4 API exposes snake_case. The mapping
// lives here, at the storage boundary.
interface StoredPageSettings {
  incidents?: unknown;
  include_maintenances?: unknown;
  monitor_status_history_days?: { desktop?: number; mobile?: number };
  monitor_layout_style?: string;
  metaPageTitle?: string;
  metaPageDescription?: string;
  socialPagePreviewImage?: string;
  [key: string]: unknown;
}

const HISTORY_DAYS_MIN = GC.STATUS_HISTORY_DAYS_MIN;
const HISTORY_DAYS_MAX = GC.STATUS_HISTORY_DAYS_MAX;

export function getDefaultPageSettings(): PageSettings {
  return {
    incidents: {
      enabled: true,
      ongoing: { show: true },
      resolved: { show: true, max_count: 5, days_in_past: 7 },
    },
    include_maintenances: {
      enabled: true,
      ongoing: {
        show: true,
        past: { show: true, max_count: 5, days_in_past: 7 },
        upcoming: { show: true, max_count: 5, days_in_future: 30 },
      },
    },
    monitor_status_history_days: {
      desktop: GC.DEFAULT_STATUS_HISTORY_DAYS_DESKTOP,
      mobile: GC.DEFAULT_STATUS_HISTORY_DAYS_MOBILE,
    },
    monitor_layout_style: GC.DEFAULT_MONITOR_LAYOUT_STYLE,
  };
}

function parseStored(storedJson: string | null | undefined): StoredPageSettings {
  if (!storedJson) return {};
  try {
    const parsed = JSON.parse(storedJson);
    return typeof parsed === "object" && parsed !== null ? (parsed as StoredPageSettings) : {};
  } catch {
    return {};
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Recursively merges patch into base: objects merge key-by-key, everything
// else replaces. Keys absent from the patch — including ones this module does
// not know about — are left untouched.
function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = result[key];
    result[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }
  return result;
}

export function mergePageSettings(defaults: PageSettings, partial?: PageSettingsPatch): PageSettings {
  if (!partial) {
    return defaults;
  }

  const merged: PageSettings = {
    incidents: {
      enabled: partial.incidents?.enabled ?? defaults.incidents.enabled,
      ongoing: {
        show: partial.incidents?.ongoing?.show ?? defaults.incidents.ongoing.show,
      },
      resolved: {
        show: partial.incidents?.resolved?.show ?? defaults.incidents.resolved.show,
        max_count: partial.incidents?.resolved?.max_count ?? defaults.incidents.resolved.max_count,
        days_in_past: partial.incidents?.resolved?.days_in_past ?? defaults.incidents.resolved.days_in_past,
      },
    },
    include_maintenances: {
      enabled: partial.include_maintenances?.enabled ?? defaults.include_maintenances.enabled,
      ongoing: {
        show: partial.include_maintenances?.ongoing?.show ?? defaults.include_maintenances.ongoing.show,
        past: {
          show: partial.include_maintenances?.ongoing?.past?.show ?? defaults.include_maintenances.ongoing.past.show,
          max_count:
            partial.include_maintenances?.ongoing?.past?.max_count ??
            defaults.include_maintenances.ongoing.past.max_count,
          days_in_past:
            partial.include_maintenances?.ongoing?.past?.days_in_past ??
            defaults.include_maintenances.ongoing.past.days_in_past,
        },
        upcoming: {
          show:
            partial.include_maintenances?.ongoing?.upcoming?.show ??
            defaults.include_maintenances.ongoing.upcoming.show,
          max_count:
            partial.include_maintenances?.ongoing?.upcoming?.max_count ??
            defaults.include_maintenances.ongoing.upcoming.max_count,
          days_in_future:
            partial.include_maintenances?.ongoing?.upcoming?.days_in_future ??
            defaults.include_maintenances.ongoing.upcoming.days_in_future,
        },
      },
    },
    monitor_status_history_days: {
      desktop: partial.monitor_status_history_days?.desktop ?? defaults.monitor_status_history_days.desktop,
      mobile: partial.monitor_status_history_days?.mobile ?? defaults.monitor_status_history_days.mobile,
    },
    monitor_layout_style: partial.monitor_layout_style ?? defaults.monitor_layout_style,
  };

  const metaPageTitle = partial.meta_page_title ?? defaults.meta_page_title;
  const metaPageDescription = partial.meta_page_description ?? defaults.meta_page_description;
  const socialPagePreviewImage = partial.social_page_preview_image ?? defaults.social_page_preview_image;
  if (metaPageTitle !== undefined) merged.meta_page_title = metaPageTitle;
  if (metaPageDescription !== undefined) merged.meta_page_description = metaPageDescription;
  if (socialPagePreviewImage !== undefined) merged.social_page_preview_image = socialPagePreviewImage;

  return merged;
}

function isValidHistoryDays(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= HISTORY_DAYS_MIN && (value as number) <= HISTORY_DAYS_MAX;
}

function isValidLayoutStyle(value: unknown): value is PageSettings["monitor_layout_style"] {
  return (GC.MONITOR_LAYOUT_STYLES as readonly string[]).includes(value as string);
}

/**
 * Builds the API view of stored settings: defaults overlaid with stored
 * values. Stored values that violate the API contract (unknown layout style,
 * out-of-range days — e.g. from manual edits or older versions) are ignored
 * so responses stay schema-compliant.
 */
export function toApiPageSettings(storedJson: string | null | undefined): PageSettings {
  const stored = parseStored(storedJson);
  const storedDays = isPlainObject(stored.monitor_status_history_days) ? stored.monitor_status_history_days : {};
  const fromStore: PageSettingsPatch = {
    incidents: (isPlainObject(stored.incidents) ? stored.incidents : undefined) as unknown as PageSettings["incidents"],
    include_maintenances: (isPlainObject(stored.include_maintenances)
      ? stored.include_maintenances
      : undefined) as unknown as PageSettings["include_maintenances"],
    monitor_status_history_days: {
      desktop: isValidHistoryDays(storedDays.desktop) ? (storedDays.desktop as number) : undefined,
      mobile: isValidHistoryDays(storedDays.mobile) ? (storedDays.mobile as number) : undefined,
    },
    monitor_layout_style: isValidLayoutStyle(stored.monitor_layout_style) ? stored.monitor_layout_style : undefined,
    meta_page_title: typeof stored.metaPageTitle === "string" ? stored.metaPageTitle : undefined,
    meta_page_description: typeof stored.metaPageDescription === "string" ? stored.metaPageDescription : undefined,
    social_page_preview_image:
      typeof stored.socialPagePreviewImage === "string" ? stored.socialPagePreviewImage : undefined,
  };
  return mergePageSettings(getDefaultPageSettings(), fromStore);
}

/**
 * Deep-merges a partial API payload into the stored settings JSON and returns
 * the new JSON string. Only keys present in the patch are written; everything
 * else in the stored JSON — including nested keys and top-level keys this
 * module does not know about — is preserved, so an API write can never wipe
 * settings written by other parts of the app, and clients may persist extra
 * keys (the schema allows additional properties).
 */
export function applyPageSettingsPatch(
  storedJson: string | null | undefined,
  patch: PageSettingsPatch | undefined,
): string {
  const stored = parseStored(storedJson);
  if (!patch) {
    return JSON.stringify(stored);
  }

  // Map the API's snake_case meta fields to their stored camelCase keys; all
  // other keys are stored under their API names
  const { meta_page_title, meta_page_description, social_page_preview_image, ...rest } = patch;
  const mappedPatch: Record<string, unknown> = { ...rest };
  if (meta_page_title !== undefined) mappedPatch.metaPageTitle = meta_page_title;
  if (meta_page_description !== undefined) mappedPatch.metaPageDescription = meta_page_description;
  if (social_page_preview_image !== undefined) mappedPatch.socialPagePreviewImage = social_page_preview_image;

  return JSON.stringify(deepMerge(stored, mappedPatch));
}

/**
 * Validates a partial page_settings payload from the API. Returns an error
 * message, or null when valid. Bounds mirror the manage UI (history days
 * 1-365, layout style one of the four shipped styles).
 */
export function validatePageSettings(partial: unknown): string | null {
  if (partial === undefined) return null;
  if (typeof partial !== "object" || partial === null || Array.isArray(partial)) {
    return "page_settings must be an object";
  }

  const settings = partial as PageSettingsPatch;

  // The event display branches and their known sub-objects must be objects;
  // anything else would be deep-merged into storage as-is
  if (settings.incidents !== undefined) {
    if (!isPlainObject(settings.incidents)) {
      return "incidents must be an object";
    }
    for (const key of ["ongoing", "resolved"] as const) {
      if (settings.incidents[key] !== undefined && !isPlainObject(settings.incidents[key])) {
        return `incidents.${key} must be an object`;
      }
    }
  }

  if (settings.include_maintenances !== undefined) {
    if (!isPlainObject(settings.include_maintenances)) {
      return "include_maintenances must be an object";
    }
    const ongoing = settings.include_maintenances.ongoing;
    if (ongoing !== undefined) {
      if (!isPlainObject(ongoing)) {
        return "include_maintenances.ongoing must be an object";
      }
      for (const key of ["past", "upcoming"] as const) {
        if (ongoing[key] !== undefined && !isPlainObject(ongoing[key])) {
          return `include_maintenances.ongoing.${key} must be an object`;
        }
      }
    }
  }

  if (settings.monitor_layout_style !== undefined) {
    if (!GC.MONITOR_LAYOUT_STYLES.includes(settings.monitor_layout_style)) {
      return `monitor_layout_style must be one of: ${GC.MONITOR_LAYOUT_STYLES.join(", ")}`;
    }
  }

  if (settings.monitor_status_history_days !== undefined) {
    const days = settings.monitor_status_history_days;
    if (typeof days !== "object" || days === null || Array.isArray(days)) {
      return "monitor_status_history_days must be an object";
    }
    for (const key of ["desktop", "mobile"] as const) {
      const value = days[key];
      if (value !== undefined) {
        if (!Number.isInteger(value) || value < HISTORY_DAYS_MIN || value > HISTORY_DAYS_MAX) {
          return `monitor_status_history_days.${key} must be an integer between ${HISTORY_DAYS_MIN} and ${HISTORY_DAYS_MAX}`;
        }
      }
    }
  }

  for (const key of ["meta_page_title", "meta_page_description", "social_page_preview_image"] as const) {
    const value = settings[key];
    if (value !== undefined && typeof value !== "string") {
      return `${key} must be a string`;
    }
  }

  return null;
}

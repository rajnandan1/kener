import type { PageSettings } from "$lib/types/api";
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

export function mergePageSettings(defaults: PageSettings, partial?: Partial<PageSettings>): PageSettings {
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

/** Builds the API view of stored settings: defaults overlaid with stored values. */
export function toApiPageSettings(storedJson: string | null | undefined): PageSettings {
  const stored = parseStored(storedJson);
  const fromStore: Partial<PageSettings> = {
    incidents: stored.incidents as PageSettings["incidents"],
    include_maintenances: stored.include_maintenances as PageSettings["include_maintenances"],
    monitor_status_history_days: stored.monitor_status_history_days as PageSettings["monitor_status_history_days"],
    monitor_layout_style: stored.monitor_layout_style as PageSettings["monitor_layout_style"],
    meta_page_title: stored.metaPageTitle,
    meta_page_description: stored.metaPageDescription,
    social_page_preview_image: stored.socialPagePreviewImage,
  };
  return mergePageSettings(getDefaultPageSettings(), fromStore);
}

/**
 * Overlays a partial API payload onto the stored settings JSON and returns the
 * new JSON string. Keys this module does not know about are preserved, so an
 * API write can never wipe settings written by other parts of the app.
 */
export function applyPageSettingsPatch(
  storedJson: string | null | undefined,
  patch: Partial<PageSettings> | undefined,
): string {
  const stored = parseStored(storedJson);
  const merged = mergePageSettings(toApiPageSettings(storedJson), patch);

  stored.incidents = merged.incidents;
  stored.include_maintenances = merged.include_maintenances;
  stored.monitor_status_history_days = merged.monitor_status_history_days;
  stored.monitor_layout_style = merged.monitor_layout_style;
  if (merged.meta_page_title !== undefined) stored.metaPageTitle = merged.meta_page_title;
  if (merged.meta_page_description !== undefined) stored.metaPageDescription = merged.meta_page_description;
  if (merged.social_page_preview_image !== undefined) stored.socialPagePreviewImage = merged.social_page_preview_image;

  return JSON.stringify(stored);
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

  const settings = partial as Partial<PageSettings>;

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

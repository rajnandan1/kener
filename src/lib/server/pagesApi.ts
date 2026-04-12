import db from "$lib/server/db/db";
import {
  GetPageMonitorStructure,
  type PageMonitorStructureGroupInput,
  type PageMonitorStructureMonitorInput,
} from "$lib/server/controllers/pagesController.js";
import type {
  PageMonitorGroupRequest,
  PageMonitorRequest,
  PageResponse,
  PageSettings,
} from "$lib/types/api";
import type { PageRecord } from "$lib/server/types/db";

function formatDateToISO(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString();
  }

  const parsed = new Date(date.replace(" ", "T") + "Z");
  return parsed.toISOString();
}

export function getDefaultApiPageSettings(): PageSettings {
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
  };
}

export function mergeApiPageSettings(defaults: PageSettings, partial?: Partial<PageSettings>): PageSettings {
  if (!partial) {
    return defaults;
  }

  return {
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
  };
}

export function normalizePageMonitorRequest(
  input: PageMonitorRequest,
  fallbackPosition: number,
): PageMonitorStructureMonitorInput {
  if (typeof input === "string") {
    return {
      monitor_tag: input,
      position: fallbackPosition,
    };
  }

  if (!input || typeof input.monitor_tag !== "string" || input.monitor_tag.trim().length === 0) {
    throw new Error("Each monitor must include a non-empty monitor_tag");
  }

  return {
    monitor_tag: input.monitor_tag,
    position: typeof input.position === "number" ? input.position : fallbackPosition,
  };
}

export function normalizePageMonitorGroupRequest(
  input: PageMonitorGroupRequest,
  fallbackPosition: number,
): PageMonitorStructureGroupInput {
  if (!input || typeof input.name !== "string" || input.name.trim().length === 0) {
    throw new Error("Each monitor group must include a non-empty name");
  }

  return {
    id: typeof input.id === "number" ? input.id : undefined,
    name: input.name.trim(),
    description: typeof input.description === "string" ? input.description.trim() || null : null,
    default_expanded: input.default_expanded ?? false,
    adopt_child_status: input.adopt_child_status ?? false,
    position: typeof input.position === "number" ? input.position : fallbackPosition,
    monitors: (input.monitors || []).map((monitor, index) => normalizePageMonitorRequest(monitor, index)),
  };
}

export async function validatePageMonitorStructureInput(data: {
  monitors?: PageMonitorStructureMonitorInput[];
  monitor_groups?: PageMonitorStructureGroupInput[];
}): Promise<void> {
  const seenMonitorTags = new Set<string>();
  const monitorTags = [
    ...(data.monitors || []).map((monitor) => monitor.monitor_tag),
    ...(data.monitor_groups || []).flatMap((group) => (group.monitors || []).map((monitor) => monitor.monitor_tag)),
  ];

  for (const monitorTag of monitorTags) {
    if (seenMonitorTags.has(monitorTag)) {
      throw new Error(`Monitor with tag '${monitorTag}' is duplicated in the page structure`);
    }

    seenMonitorTags.add(monitorTag);

    const monitor = await db.getMonitorByTag(monitorTag);
    if (!monitor) {
      throw new Error(`Monitor with tag '${monitorTag}' does not exist`);
    }
  }
}

export async function formatApiPageResponse(page: PageRecord): Promise<PageResponse> {
  let pageSettings: PageSettings = getDefaultApiPageSettings();

  if (page.page_settings_json) {
    try {
      const parsed = JSON.parse(page.page_settings_json);
      pageSettings = mergeApiPageSettings(getDefaultApiPageSettings(), parsed);
    } catch {
      pageSettings = getDefaultApiPageSettings();
    }
  }

  const structure = await GetPageMonitorStructure(page.id);

  return {
    id: page.id,
    page_path: page.page_path,
    page_title: page.page_title,
    page_header: page.page_header,
    page_subheader: page.page_subheader,
    page_logo: page.page_logo,
    page_settings: pageSettings,
    monitors: structure.monitors.map((monitor) => ({
      monitor_tag: monitor.monitor_tag,
      group_id: null,
      position: monitor.position,
    })),
    monitor_groups: structure.monitor_groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      default_expanded: group.default_expanded,
      adopt_child_status: group.adopt_child_status,
      position: group.position,
      monitors: group.monitors.map((monitor) => ({
        monitor_tag: monitor.monitor_tag,
        group_id: group.id,
        position: monitor.position,
      })),
    })),
    created_at: formatDateToISO(page.created_at),
    updated_at: formatDateToISO(page.updated_at),
  };
}

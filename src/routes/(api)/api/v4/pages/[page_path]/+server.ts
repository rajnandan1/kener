import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  GetPageResponse,
  PageResponse,
  PageSettings,
  UpdatePageRequest,
  UpdatePageResponse,
  DeletePageResponse,
  BadRequestResponse,
  NotFoundResponse,
} from "$lib/types/api";
import type { PageRecord } from "$lib/server/types/db";

function formatDateToISO(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString();
  }
  // Handle string dates (e.g., from SQLite: "2026-01-27 16:07:19")
  const parsed = new Date(date.replace(" ", "T") + "Z");
  return parsed.toISOString();
}

function getDefaultPageSettings(): PageSettings {
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

function mergePageSettings(defaults: PageSettings, partial?: Partial<PageSettings>): PageSettings {
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

async function formatPageResponse(page: PageRecord): Promise<PageResponse> {
  let pageSettings: PageSettings = getDefaultPageSettings();

  if (page.page_settings_json) {
    try {
      const parsed = JSON.parse(page.page_settings_json);
      pageSettings = mergePageSettings(getDefaultPageSettings(), parsed);
    } catch {
      // Use defaults on parse error
    }
  }

  const pageMonitors = await db.getPageMonitors(page.id);

  return {
    id: page.id,
    page_path: page.page_path,
    page_title: page.page_title,
    page_header: page.page_header,
    page_subheader: page.page_subheader,
    page_logo: page.page_logo,
    page_settings: pageSettings,
    monitors: pageMonitors.map((pm) => ({ monitor_tag: pm.monitor_tag })),
    created_at: formatDateToISO(page.created_at),
    updated_at: formatDateToISO(page.updated_at),
  };
}

export const GET: RequestHandler = async ({ locals }) => {
  const page = locals.page;

  if (!page) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: "Page not found",
      },
    };
    return json(errorResponse, { status: 404 });
  }

  const response: GetPageResponse = {
    page: await formatPageResponse(page),
  };

  return json(response);
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
  const page = locals.page;

  if (!page) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: "Page not found",
      },
    };
    return json(errorResponse, { status: 404 });
  }

  let body: UpdatePageRequest;

  try {
    body = await request.json();
  } catch {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Invalid JSON body",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Validate page_path if provided
  if (body.page_path !== undefined) {
    if (typeof body.page_path !== "string") {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "page_path must be a string",
        },
      };
      return json(errorResponse, { status: 400 });
    }

    // Make page_path URL-friendly: lowercase, replace spaces with hyphens, remove special chars
    const sanitizedPagePath = body.page_path
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "");

    // Check if page_path is being changed and conflicts with existing page
    if (sanitizedPagePath !== page.page_path) {
      const existingPage = await db.getPageByPath(sanitizedPagePath);
      if (existingPage) {
        const errorResponse: BadRequestResponse = {
          error: {
            code: "BAD_REQUEST",
            message: `Page with path '${sanitizedPagePath}' already exists`,
          },
        };
        return json(errorResponse, { status: 400 });
      }
    }

    // Store sanitized path for later use
    body.page_path = sanitizedPagePath;
  }

  // Validate page_title if provided
  if (body.page_title !== undefined) {
    if (typeof body.page_title !== "string" || body.page_title.trim().length === 0) {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "page_title must be a non-empty string",
        },
      };
      return json(errorResponse, { status: 400 });
    }
  }

  // Validate page_header if provided
  if (body.page_header !== undefined) {
    if (typeof body.page_header !== "string" || body.page_header.trim().length === 0) {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "page_header must be a non-empty string",
        },
      };
      return json(errorResponse, { status: 400 });
    }
  }

  // Validate monitors if provided
  if (body.monitors !== undefined && Array.isArray(body.monitors)) {
    for (const monitorTag of body.monitors) {
      const monitor = await db.getMonitorByTag(monitorTag);
      if (!monitor) {
        const errorResponse: BadRequestResponse = {
          error: {
            code: "BAD_REQUEST",
            message: `Monitor with tag '${monitorTag}' does not exist`,
          },
        };
        return json(errorResponse, { status: 400 });
      }
    }
  }

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {};

  if (body.page_path !== undefined) {
    updateData.page_path = body.page_path;
  }

  if (body.page_title !== undefined) {
    updateData.page_title = body.page_title.trim();
  }

  if (body.page_header !== undefined) {
    updateData.page_header = body.page_header.trim();
  }

  if (body.page_subheader !== undefined) {
    updateData.page_subheader = body.page_subheader;
  }

  if (body.page_logo !== undefined) {
    updateData.page_logo = body.page_logo;
  }

  // Handle page_settings merge
  if (body.page_settings !== undefined) {
    let currentSettings: PageSettings = getDefaultPageSettings();

    if (page.page_settings_json) {
      try {
        const parsed = JSON.parse(page.page_settings_json);
        currentSettings = mergePageSettings(getDefaultPageSettings(), parsed);
      } catch {
        // Use defaults on parse error
      }
    }

    const mergedSettings = mergePageSettings(currentSettings, body.page_settings);
    updateData.page_settings_json = JSON.stringify(mergedSettings);
  }

  // Update page if there are changes
  if (Object.keys(updateData).length > 0) {
    await db.updatePage(page.id, updateData);
  }

  // Handle monitors update - replace all monitors
  if (body.monitors !== undefined && Array.isArray(body.monitors)) {
    // Delete all existing page monitors
    await db.deletePageMonitorsByPageId(page.id);

    // Add new monitors
    for (const monitorTag of body.monitors) {
      await db.addMonitorToPage({
        page_id: page.id,
        monitor_tag: monitorTag,
        monitor_settings_json: null,
      });
    }
  }

  // Fetch updated page
  const updatedPage = await db.getPageById(page.id);

  if (!updatedPage) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: "Page not found after update",
      },
    };
    return json(errorResponse, { status: 404 });
  }

  const response: UpdatePageResponse = {
    page: await formatPageResponse(updatedPage),
  };

  return json(response);
};

export const DELETE: RequestHandler = async ({ locals }) => {
  const page = locals.page;

  if (!page) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: "Page not found",
      },
    };
    return json(errorResponse, { status: 404 });
  }

  // Delete all page monitors first
  await db.deletePageMonitorsByPageId(page.id);

  // Delete the page
  await db.deletePage(page.id);

  const response: DeletePageResponse = {
    message: `Page '${page.page_path}' deleted successfully`,
  };

  return json(response);
};

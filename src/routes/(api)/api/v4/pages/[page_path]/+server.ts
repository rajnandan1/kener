import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  GetPageResponse,
  PageResponse,
  UpdatePageRequest,
  UpdatePageResponse,
  DeletePageResponse,
  BadRequestResponse,
  NotFoundResponse,
} from "$lib/types/api";
import type { PageRecord } from "$lib/server/types/db";
import GC from "$lib/global-constants";
import { toApiPageSettings, applyPageSettingsPatch, validatePageSettings } from "$lib/server/pageSettings";

function formatDateToISO(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString();
  }
  // Handle string dates (e.g., from SQLite: "2026-01-27 16:07:19")
  const parsed = new Date(date.replace(" ", "T") + "Z");
  return parsed.toISOString();
}

async function formatPageResponse(page: PageRecord): Promise<PageResponse> {
  const pageSettings = toApiPageSettings(page.page_settings_json);

  const pageMonitors = await db.getPageMonitors(page.id);

  return {
    id: page.id,
    // The home page's empty page_path renders as the addressable ~home token
    page_path: page.page_path === "" ? GC.HOME_PAGE_TOKEN : page.page_path,
    page_title: page.page_title,
    page_header: page.page_header,
    page_subheader: page.page_subheader,
    page_logo: page.page_logo,
    page_settings: pageSettings,
    monitors: pageMonitors.map((pm) => ({ monitor_tag: pm.monitor_tag, position: pm.position })),
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

  // API responses render the home page's path as ~home, so a read-modify-write
  // client sends it back unchanged; treat that as "no path change"
  if (page.page_path === "" && body.page_path === GC.HOME_PAGE_TOKEN) {
    body.page_path = undefined;
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

    // The home page's path is fixed; matches the manage UI which disables
    // the field with "Home page path cannot be changed"
    if (page.page_path === "" && sanitizedPagePath !== "") {
      const errorResponse: BadRequestResponse = {
        error: {
          code: "BAD_REQUEST",
          message: "Home page path cannot be changed",
        },
      };
      return json(errorResponse, { status: 400 });
    }

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

  // Validate page_settings if provided
  const settingsError = validatePageSettings(body.page_settings);
  if (settingsError) {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: settingsError,
      },
    };
    return json(errorResponse, { status: 400 });
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

  // Handle page_settings merge; unknown stored keys are preserved
  if (body.page_settings !== undefined) {
    updateData.page_settings_json = applyPageSettingsPatch(page.page_settings_json, body.page_settings);
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
    for (let i = 0; i < body.monitors.length; i++) {
      await db.addMonitorToPage({
        page_id: page.id,
        monitor_tag: body.monitors[i],
        monitor_settings_json: null,
        position: i,
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

  // The home page must always exist; DeletePage in pagesController enforces
  // the same invariant for the manage UI
  if (page.page_path === "") {
    const errorResponse: BadRequestResponse = {
      error: {
        code: "BAD_REQUEST",
        message: "Cannot delete the home page",
      },
    };
    return json(errorResponse, { status: 400 });
  }

  // Delete all page monitors first
  await db.deletePageMonitorsByPageId(page.id);

  // Delete the page
  await db.deletePage(page.id);

  const response: DeletePageResponse = {
    message: `Page '${page.page_path || GC.HOME_PAGE_TOKEN}' deleted successfully`,
  };

  return json(response);
};

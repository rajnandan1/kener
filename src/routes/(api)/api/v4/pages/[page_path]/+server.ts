import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import { UpdatePage, ReplacePageMonitorStructure } from "$lib/server/controllers/pagesController.js";
import {
  formatApiPageResponse,
  getDefaultApiPageSettings,
  mergeApiPageSettings,
  normalizePageMonitorGroupRequest,
  normalizePageMonitorRequest,
  validatePageMonitorStructureInput,
} from "$lib/server/pagesApi.js";
import type {
  BadRequestResponse,
  DeletePageResponse,
  GetPageResponse,
  NotFoundResponse,
  UpdatePageRequest,
  UpdatePageResponse,
} from "$lib/types/api";

export const GET: RequestHandler = async ({ locals }) => {
  const page = locals.page;

  if (!page) {
    return json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Page not found",
        },
      } satisfies NotFoundResponse,
      { status: 404 },
    );
  }

  const response: GetPageResponse = {
    page: await formatApiPageResponse(page),
  };

  return json(response);
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
  const page = locals.page;

  if (!page) {
    return json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Page not found",
        },
      } satisfies NotFoundResponse,
      { status: 404 },
    );
  }

  let body: UpdatePageRequest;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Invalid JSON body",
        },
      } satisfies BadRequestResponse,
      { status: 400 },
    );
  }

  if (body.page_path !== undefined) {
    if (typeof body.page_path !== "string") {
      return json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "page_path must be a string",
          },
        } satisfies BadRequestResponse,
        { status: 400 },
      );
    }

    const sanitizedPagePath = body.page_path
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "");

    if (sanitizedPagePath !== page.page_path) {
      const existingPage = await db.getPageByPath(sanitizedPagePath);
      if (existingPage) {
        return json(
          {
            error: {
              code: "BAD_REQUEST",
              message: `Page with path '${sanitizedPagePath}' already exists`,
            },
          } satisfies BadRequestResponse,
          { status: 400 },
        );
      }
    }

    body.page_path = sanitizedPagePath;
  }

  if (body.page_title !== undefined && (typeof body.page_title !== "string" || body.page_title.trim().length === 0)) {
    return json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "page_title must be a non-empty string",
        },
      } satisfies BadRequestResponse,
      { status: 400 },
    );
  }

  if (
    body.page_header !== undefined &&
    (typeof body.page_header !== "string" || body.page_header.trim().length === 0)
  ) {
    return json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "page_header must be a non-empty string",
        },
      } satisfies BadRequestResponse,
      { status: 400 },
    );
  }

  const normalizedMonitors =
    body.monitors !== undefined ? body.monitors.map((monitor, index) => normalizePageMonitorRequest(monitor, index)) : [];
  const normalizedMonitorGroups =
    body.monitor_groups !== undefined
      ? body.monitor_groups.map((group, index) =>
          normalizePageMonitorGroupRequest(group, normalizedMonitors.length + index),
        )
      : [];

  if (body.monitors !== undefined || body.monitor_groups !== undefined) {
    try {
      await validatePageMonitorStructureInput({
        monitors: normalizedMonitors,
        monitor_groups: normalizedMonitorGroups,
      });
    } catch (error) {
      return json(
        {
          error: {
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "Invalid page monitor structure",
          },
        } satisfies BadRequestResponse,
        { status: 400 },
      );
    }
  }

  const updateData: Record<string, unknown> = {};

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

  if (body.page_settings !== undefined) {
    let currentSettings = getDefaultApiPageSettings();

    if (page.page_settings_json) {
      try {
        const parsed = JSON.parse(page.page_settings_json);
        currentSettings = mergeApiPageSettings(getDefaultApiPageSettings(), parsed);
      } catch {
        currentSettings = getDefaultApiPageSettings();
      }
    }

    const mergedSettings = mergeApiPageSettings(currentSettings, body.page_settings);
    updateData.page_settings_json = JSON.stringify(mergedSettings);
  }

  if (Object.keys(updateData).length > 0) {
    await UpdatePage(page.id, updateData);
  }

  if (body.monitors !== undefined || body.monitor_groups !== undefined) {
    await ReplacePageMonitorStructure(page.id, {
      monitors: normalizedMonitors,
      monitor_groups: normalizedMonitorGroups,
    });
  }

  const updatedPage = await db.getPageById(page.id);
  if (!updatedPage) {
    return json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Page not found after update",
        },
      } satisfies NotFoundResponse,
      { status: 404 },
    );
  }

  const response: UpdatePageResponse = {
    page: await formatApiPageResponse(updatedPage),
  };

  return json(response);
};

export const DELETE: RequestHandler = async ({ locals }) => {
  const page = locals.page;

  if (!page) {
    return json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Page not found",
        },
      } satisfies NotFoundResponse,
      { status: 404 },
    );
  }

  await db.deletePageMonitorsByPageId(page.id);

  const groups = await db.getPageMonitorGroups(page.id);
  for (const group of groups) {
    await db.deletePageMonitorGroup(group.id);
  }

  await db.deletePage(page.id);

  const response: DeletePageResponse = {
    message: `Page '${page.page_path}' deleted successfully`,
  };

  return json(response);
};

import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import {
  CreatePage,
  ReplacePageMonitorStructure,
} from "$lib/server/controllers/pagesController.js";
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
  CreatePageRequest,
  CreatePageResponse,
  GetPagesListResponse,
} from "$lib/types/api";

export const GET: RequestHandler = async () => {
  const rawPages = await db.getAllPages();
  const pages = await Promise.all(rawPages.map(formatApiPageResponse));

  const response: GetPagesListResponse = {
    pages,
  };

  return json(response);
};

export const POST: RequestHandler = async ({ request }) => {
  let body: CreatePageRequest;

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

  if (!body.page_path || typeof body.page_path !== "string") {
    return json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "page_path is required and must be a string",
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

  if (!body.page_title || typeof body.page_title !== "string" || body.page_title.trim().length === 0) {
    return json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "page_title is required and must be a non-empty string",
        },
      } satisfies BadRequestResponse,
      { status: 400 },
    );
  }

  if (!body.page_header || typeof body.page_header !== "string" || body.page_header.trim().length === 0) {
    return json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "page_header is required and must be a non-empty string",
        },
      } satisfies BadRequestResponse,
      { status: 400 },
    );
  }

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

  const normalizedMonitors = (body.monitors || []).map((monitor, index) => normalizePageMonitorRequest(monitor, index));
  const normalizedMonitorGroups = (body.monitor_groups || []).map((group, index) =>
    normalizePageMonitorGroupRequest(group, normalizedMonitors.length + index),
  );

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

  const pageSettings = mergeApiPageSettings(getDefaultApiPageSettings(), body.page_settings);

  const createdPage = await CreatePage({
    page_path: sanitizedPagePath,
    page_title: body.page_title.trim(),
    page_header: body.page_header.trim(),
    page_subheader: body.page_subheader ?? null,
    page_logo: body.page_logo ?? null,
    page_settings_json: JSON.stringify(pageSettings),
  });

  if (normalizedMonitors.length > 0 || normalizedMonitorGroups.length > 0) {
    await ReplacePageMonitorStructure(createdPage.id, {
      monitors: normalizedMonitors,
      monitor_groups: normalizedMonitorGroups,
    });
  }

  const freshPage = await db.getPageById(createdPage.id);
  const response: CreatePageResponse = {
    page: await formatApiPageResponse(freshPage || createdPage),
  };

  return json(response, { status: 201 });
};

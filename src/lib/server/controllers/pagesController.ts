import db from "../db/db.js";
import type { PageRecord, PageRecordInsert, PageMonitorRecord, PageMonitorRecordInsert } from "../types/db.js";
import type { PageMonitorInput } from "../../types/api.js";

// ============ Page Monitor Input ============

const MAX_GROUP_NAME_LENGTH = 255;
const MAX_POSITION = 2_147_483_647;

export interface NormalizedPageMonitorInput {
  tag: string;
  group: string | null;
  position: number;
}

/**
 * Normalize the `monitors` field on Create/Update Page requests.
 * Accepts either a plain string (the tag, ungrouped) or an object with
 * `{ tag, group?, position? }`. Throws on malformed entries; returns
 * objects with explicit position (index fallback) and group (null fallback).
 */
export function normalizePageMonitorInputs(input: PageMonitorInput[]): NormalizedPageMonitorInput[] {
  return input.map((item, idx) => {
    if (typeof item === "string") {
      return { tag: item, group: null, position: idx };
    }
    if (!item || typeof item !== "object" || typeof item.tag !== "string" || item.tag.trim().length === 0) {
      throw new Error("Each monitor must be a string tag or an object with a non-empty `tag` field");
    }
    const group = item.group ?? null;
    if (group !== null && typeof group !== "string") {
      throw new Error("Monitor `group` must be a string or null");
    }
    const normalizedGroup = group === null ? null : group.trim() || null;
    if (normalizedGroup && normalizedGroup.length > MAX_GROUP_NAME_LENGTH) {
      throw new Error(`Monitor \`group\` must be ${MAX_GROUP_NAME_LENGTH} characters or fewer`);
    }
    if (
      item.position !== undefined &&
      (!Number.isInteger(item.position) || item.position < 0 || item.position > MAX_POSITION)
    ) {
      throw new Error("Monitor `position` must be a non-negative integer");
    }
    return { tag: item.tag.trim(), group: normalizedGroup, position: item.position ?? idx };
  });
}

// ============ Page CRUD Operations ============

/**
 * Create a new page
 */
export async function CreatePage(data: PageRecordInsert): Promise<PageRecord> {
  // Validate required fields
  if (data.page_path === undefined || data.page_path === null || !data.page_title || !data.page_header) {
    throw new Error("page_path, page_title, and page_header are required");
  }

  // Make page_path URL-friendly: lowercase, replace spaces with hyphens, remove special chars (including leading slashes)
  data.page_path = data.page_path
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");

  // Check if page with this path already exists
  const existingPage = await db.getPageByPath(data.page_path);
  if (existingPage) {
    throw new Error(`Page with path "${data.page_path}" already exists`);
  }

  return await db.createPage(data);
}

/**
 * Get page by path
 */
export async function GetPageByPath(page_path: string): Promise<PageRecord | undefined> {
  return await db.getPageByPath(page_path);
}

/**
 * Get page by ID
 */
export async function GetPageById(id: number): Promise<PageRecord | undefined> {
  return await db.getPageById(id);
}

/**
 * Get all pages
 */
export async function GetAllPages(): Promise<PageRecord[]> {
  return await db.getAllPages();
}

/**
 * Update page by ID
 */
export async function UpdatePage(id: number, data: Partial<PageRecordInsert>): Promise<PageRecord> {
  // Check if page exists
  const existingPage = await db.getPageById(id);
  if (!existingPage) {
    throw new Error(`Page with id ${id} not found`);
  }

  // If updating page_path, make it URL-friendly
  if (data.page_path !== undefined) {
    data.page_path = data.page_path
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "");
  }

  // If updating page_path, check if it conflicts with another page
  if (data.page_path !== undefined && data.page_path !== existingPage.page_path) {
    const conflictingPage = await db.getPageByPath(data.page_path);
    if (conflictingPage) {
      throw new Error(`Page with path "${data.page_path}" already exists`);
    }
  }

  await db.updatePage(id, data);
  return (await db.getPageById(id))!;
}

/**
 * Delete page by ID
 */
export async function DeletePage(id: number): Promise<void> {
  // Check if page exists
  const existingPage = await db.getPageById(id);
  if (!existingPage) {
    throw new Error(`Page with id ${id} not found`);
  }

  // Prevent deleting the home page (empty path)
  if (existingPage.page_path === "") {
    throw new Error("Cannot delete the home page");
  }

  await db.deletePage(id);
}

// ============ Page Monitor Operations ============

/**
 * Add monitor to a page
 */
export async function AddMonitorToPage(
  page_id: number,
  monitor_tag: string,
  monitor_settings_json?: string | null,
  position?: number,
  group_name?: string | null,
): Promise<void> {
  // Check if page exists
  const page = await db.getPageById(page_id);
  if (!page) {
    throw new Error(`Page with id ${page_id} not found`);
  }

  // Check if monitor already exists on page
  const exists = await db.monitorExistsOnPage(page_id, monitor_tag);
  if (exists) {
    throw new Error(`Monitor "${monitor_tag}" already exists on this page`);
  }

  // If no position specified, append at end
  let finalPosition = position;
  if (finalPosition === undefined) {
    const existing = await db.getPageMonitors(page_id);
    finalPosition = existing.length > 0 ? Math.max(...existing.map((m) => m.position)) + 1 : 0;
  }

  await db.addMonitorToPage({
    page_id,
    monitor_tag,
    monitor_settings_json: monitor_settings_json || null,
    position: finalPosition,
    group_name: group_name ?? null,
  });
}

/** Replaces a page's monitor assignments atomically after validation. */
export async function ReplacePageMonitors(page_id: number, monitors: NormalizedPageMonitorInput[]): Promise<void> {
  const page = await db.getPageById(page_id);
  if (!page) {
    throw new Error(`Page with id ${page_id} not found`);
  }

  const tags = new Set<string>();
  for (const monitor of monitors) {
    if (tags.has(monitor.tag)) {
      throw new Error(`Monitor "${monitor.tag}" is listed more than once`);
    }
    tags.add(monitor.tag);
  }

  await db.replacePageMonitors(
    page_id,
    monitors.map((monitor) => ({
      page_id,
      monitor_tag: monitor.tag,
      monitor_settings_json: null,
      position: monitor.position,
      group_name: monitor.group,
    })),
  );
}

/**
 * Set or clear the group of a single monitor on a page. group_name=null
 * moves it back to "ungrouped" — same as removing the group label.
 */
export async function UpdatePageMonitorGroup(
  page_id: number,
  monitor_tag: string,
  group_name: string | null,
): Promise<void> {
  const page = await db.getPageById(page_id);
  if (!page) {
    throw new Error(`Page with id ${page_id} not found`);
  }
  const exists = await db.monitorExistsOnPage(page_id, monitor_tag);
  if (!exists) {
    throw new Error(`Monitor "${monitor_tag}" not found on this page`);
  }
  const normalized = group_name === null ? null : group_name.trim() || null;
  if (normalized && normalized.length > MAX_GROUP_NAME_LENGTH) {
    throw new Error(`Monitor \`group\` must be ${MAX_GROUP_NAME_LENGTH} characters or fewer`);
  }
  await db.updatePageMonitorGroup(page_id, monitor_tag, normalized);
}

/**
 * Reorder monitors on a page
 */
export async function ReorderPageMonitors(page_id: number, monitor_tags: string[]): Promise<void> {
  const page = await db.getPageById(page_id);
  if (!page) {
    throw new Error(`Page with id ${page_id} not found`);
  }

  const monitorPositions = monitor_tags.map((tag, index) => ({
    monitor_tag: tag,
    position: index,
  }));

  await db.updatePageMonitorPositions(page_id, monitorPositions);
}

/**
 * Remove monitor from a page
 */
export async function RemoveMonitorFromPage(page_id: number, monitor_tag: string): Promise<void> {
  // Check if page exists
  const page = await db.getPageById(page_id);
  if (!page) {
    throw new Error(`Page with id ${page_id} not found`);
  }

  const deleted = await db.removeMonitorFromPage(page_id, monitor_tag);
  if (deleted === 0) {
    throw new Error(`Monitor "${monitor_tag}" not found on this page`);
  }
}

/**
 * Get all monitors for a page
 */
export async function GetPageMonitors(page_id: number): Promise<PageMonitorRecord[]> {
  return await db.getPageMonitors(page_id);
}

/**
 * Update monitor settings on a page
 */
export async function UpdatePageMonitorSettings(
  page_id: number,
  monitor_tag: string,
  monitor_settings_json: string | null,
): Promise<void> {
  // Check if page exists
  const page = await db.getPageById(page_id);
  if (!page) {
    throw new Error(`Page with id ${page_id} not found`);
  }

  // Check if monitor exists on page
  const exists = await db.monitorExistsOnPage(page_id, monitor_tag);
  if (!exists) {
    throw new Error(`Monitor "${monitor_tag}" not found on this page`);
  }

  await db.updatePageMonitorSettings(page_id, monitor_tag, monitor_settings_json);
}

/**
 * Get page with its monitors
 */
export async function GetPageWithMonitors(
  page_id: number,
): Promise<{ page: PageRecord; monitors: PageMonitorRecord[] } | undefined> {
  const page = await db.getPageById(page_id);
  if (!page) {
    return undefined;
  }

  const monitors = await db.getPageMonitors(page_id);
  return { page, monitors };
}

/**
 * Get page by path with its active monitors (hidden monitors only when includeHidden)
 */
export async function GetPageByPathWithMonitors(
  page_path: string,
  includeHidden = false,
): Promise<{ page: PageRecord; monitors: PageMonitorRecord[] } | undefined> {
  const page = await db.getPageByPath(page_path);
  if (!page) {
    return undefined;
  }

  const monitors = await db.getActivePageMonitors(page.id, includeHidden);
  return { page, monitors };
}

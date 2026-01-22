import db from "../db/db.js";
import type { PageRecord, PageRecordInsert, PageMonitorRecord, PageMonitorRecordInsert } from "../types/db.js";

// ============ Page CRUD Operations ============

/**
 * Create a new page
 */
export async function CreatePage(data: PageRecordInsert): Promise<PageRecord> {
  // Validate required fields
  if (!data.page_path || !data.page_title || !data.page_header) {
    throw new Error("page_path, page_title, and page_header are required");
  }

  // Ensure page_path starts with /
  if (!data.page_path.startsWith("/")) {
    data.page_path = "/" + data.page_path;
  }

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

  // If updating page_path, ensure it starts with /
  if (data.page_path && !data.page_path.startsWith("/")) {
    data.page_path = "/" + data.page_path;
  }

  // If updating page_path, check if it conflicts with another page
  if (data.page_path && data.page_path !== existingPage.page_path) {
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

  // Prevent deleting the home page
  if (existingPage.page_path === "/") {
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

  await db.addMonitorToPage({
    page_id,
    monitor_tag,
    monitor_settings_json: monitor_settings_json || null,
  });
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
 * Get page by path with its monitors (excluding hidden monitors)
 */
export async function GetPageByPathWithMonitors(
  page_path: string,
): Promise<{ page: PageRecord; monitors: PageMonitorRecord[] } | undefined> {
  const page = await db.getPageByPath(page_path);
  if (!page) {
    return undefined;
  }

  const monitors = await db.getPageMonitorsExcludeHidden(page.id);
  return { page, monitors };
}

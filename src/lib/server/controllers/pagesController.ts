import db from "../db/db.js";
import type {
  PageRecord,
  PageRecordInsert,
  PageMonitorRecord,
  PageMonitorRecordInsert,
  UserRecordPublic,
} from "../types/db.js";
import { GetSiteDataByKey } from "./siteDataController.js";

// ============ Page CRUD Operations ============

/**
 * Create a new page.
 * When the site setting "autoPublicPages" is true (default),
 * newly created pages automatically get the "public" access group.
 */
export async function CreatePage(data: PageRecordInsert): Promise<PageRecord> {
  // Validate required fields
  if (data.page_path === undefined || data.page_path === null || !data.page_title || !data.page_header) {
    throw new Error("page_path, page_title, and page_header are required");
  }

  // Make page_path URL-friendly
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

  const newPage = await db.createPage(data);

  // Auto-assign "public" group to new pages (unless disabled in settings)
  const autoPublic = await GetSiteDataByKey("autoPublicPages");
  if (autoPublic !== false && autoPublic !== "false") {
    await db.setPageAccessGroups(newPage.id, ["public"]);
  }

  return newPage;
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
  });
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

// ============ Access Group Operations ============

// Reserved group ID: role with "admin" can see all pages
const ADMIN_GROUP = "admin";
// Reserved group ID: pages with "public" are visible without login
const PUBLIC_GROUP = "public";

/**
 * Check if a user can access a specific page.
 *
 * Rules (evaluated top to bottom, first match wins):
 *   1. Page has "public" group → allow (no login needed)
 *   2. No login → redirect to sign-in
 *   3. User's roles include the "admin" group → allow (admin sees everything)
 *   4. Page has no access groups → denied (unconfigured pages are hidden)
 *   5. Any overlap between page groups and role groups → allow
 *   6. No overlap → denied
 *
 * Returns: "allow" | "login_required" | "denied"
 */
export async function CheckPageAccess(
  page_id: number,
  user: UserRecordPublic | null,
): Promise<"allow" | "login_required" | "denied"> {
  const pageGroups = await db.getAccessGroupsForPage(page_id);

  // Rule 1: public pages are visible to everyone
  if (pageGroups.includes(PUBLIC_GROUP)) {
    return "allow";
  }

  // Rule 2: non-public pages require login
  if (!user) {
    return "login_required";
  }

  // Rule 3: admin group grants access to all pages
  const roleGroups = await db.getAccessGroupsForRoles(user.role_ids);
  if (roleGroups.includes(ADMIN_GROUP)) {
    return "allow";
  }

  // Rule 4: pages with no groups are hidden (except for admin)
  if (pageGroups.length === 0) {
    return "denied";
  }

  // Rule 5+6: check for overlap between page and role groups
  const hasAccess = pageGroups.some((pg) => roleGroups.includes(pg));
  return hasAccess ? "allow" : "denied";
}

/**
 * Get all pages that a user is allowed to see.
 * Used by the page switcher to filter the dropdown.
 */
export async function GetAccessiblePages(
  user: UserRecordPublic | null,
): Promise<PageRecord[]> {
  const allPages = await db.getAllPages();
  if (allPages.length === 0) return [];

  // Load access groups for all pages in one query
  const pageIds = allPages.map((p) => p.id);
  const pageGroupsMap = await db.getAccessGroupsForPages(pageIds);

  // Load user's role groups (if logged in)
  let roleGroups: string[] = [];
  let isAdmin = false;
  if (user) {
    roleGroups = await db.getAccessGroupsForRoles(user.role_ids);
    isAdmin = roleGroups.includes(ADMIN_GROUP);
  }

  return allPages.filter((page) => {
    const groups = pageGroupsMap.get(page.id) || [];

    // Public pages are visible to everyone
    if (groups.includes(PUBLIC_GROUP)) return true;

    // Non-public pages require login
    if (!user) return false;

    // Admin sees everything
    if (isAdmin) return true;

    // Pages with no groups are hidden
    if (groups.length === 0) return false;

    // Check if role groups overlap with page groups
    return groups.some((g) => roleGroups.includes(g));
  });
}

// ============ Access Group Admin Operations ============

/**
 * Get all access groups (for admin UI dropdowns)
 */
export async function GetAllAccessGroups() {
  return await db.getAllAccessGroups();
}

/**
 * Create a new access group
 */
export async function CreateAccessGroup(data: { id: string; group_name: string; description?: string }) {
  if (!data.id || !data.group_name) {
    throw new Error("id and group_name are required");
  }

  // Normalize ID: lowercase, hyphens, no special chars
  data.id = data.id.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");

  if (data.id === "public") {
    throw new Error("Cannot create a group with the reserved ID 'public'");
  }

  const existing = (await db.getAllAccessGroups()).find((g) => g.id === data.id);
  if (existing) {
    throw new Error(`Access group '${data.id}' already exists`);
  }

  await db.createAccessGroup(data);
  return { success: true, id: data.id };
}

/**
 * Delete an access group. System groups (public, admin) cannot be deleted.
 */
export async function DeleteAccessGroup(id: string) {
  const allGroups = await db.getAllAccessGroups();
  const group = allGroups.find((g) => g.id === id);
  if (!group) {
    throw new Error(`Access group '${id}' not found`);
  }
  if ((group as any).is_system === 1) {
    throw new Error(`Cannot delete system group '${id}'`);
  }
  await db.deleteAccessGroup(id);
  return { success: true };
}

/**
 * Get access groups assigned to a page
 */
export async function GetPageAccessGroups(page_id: number): Promise<string[]> {
  return await db.getAccessGroupsForPage(page_id);
}

/**
 * Set access groups for a page (replaces all existing assignments)
 */
export async function SetPageAccessGroups(page_id: number, group_ids: string[]) {
  await db.setPageAccessGroups(page_id, group_ids);
  return { success: true };
}

/**
 * Get access groups assigned to a role
 */
export async function GetRoleAccessGroups(role_id: string): Promise<string[]> {
  return await db.getAccessGroupsForRole(role_id);
}

/**
 * Set access groups for a role (replaces all existing assignments)
 */
export async function SetRoleAccessGroups(role_id: string, group_ids: string[]) {
  await db.setRoleAccessGroups(role_id, group_ids);
  return { success: true };
}

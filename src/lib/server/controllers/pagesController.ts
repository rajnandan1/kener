import db from "../db/db.js";
import type {
  AccessGroupRecord,
  PageRecord,
  PageRecordInsert,
  PageMonitorRecord,
  PageMonitorRecordInsert,
  UserRecordPublic,
} from "../types/db.js";
import { GetSiteDataByKey } from "./siteDataController.js";
import {
  ACCESS_GROUP_ID_MAX_LENGTH,
  ACCESS_GROUP_NAME_MAX_LENGTH,
  ADMIN_ACCESS_GROUP,
  ADMIN_ROLE_ID,
  BuildPageViewer,
  CanViewerSeePage,
  NormalizeAccessGroupId,
  PUBLIC_ACCESS_GROUP,
  RESERVED_ACCESS_GROUP_IDS,
  type PageViewer,
} from "../../pageAccess.js";

// ============ Page CRUD Operations ============

/**
 * Create a new page.
 *
 * accessGroupIds sets who may see the page. Without it the page gets the
 * "public" group, unless "New pages are public" is switched off in
 * Site Configurations; then it starts without groups (admins only).
 */
export async function CreatePage(data: PageRecordInsert, accessGroupIds?: unknown): Promise<PageRecord> {
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

  // Check the groups before anything is written
  const groups =
    accessGroupIds === undefined
      ? await DefaultAccessGroupsForNewPage()
      : await ValidatePageAccessGroups(accessGroupIds);

  return await db.createPage(data, groups);
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

// ============ Page Access Groups ============
// The rule itself lives in $lib/pageAccess.ts; these functions load what it needs.

/** Groups a new page gets when the request names none. */
async function DefaultAccessGroupsForNewPage(): Promise<string[]> {
  return (await GetSiteDataByKey("autoPublicPages")) === "NO" ? [] : [PUBLIC_ACCESS_GROUP];
}

/** null for visitors who are not signed in. */
export async function GetPageViewer(user: UserRecordPublic | null): Promise<PageViewer | null> {
  if (!user) return null;
  const roleIds = user.role_ids ?? [];
  return BuildPageViewer(roleIds, await db.getAccessGroupsForRoles(roleIds));
}

/**
 * Returns the page at this path if the user may see it, otherwise undefined.
 * Callers answer undefined with 404, so a restricted page looks like a missing one.
 */
export async function GetVisiblePageByPath(
  page_path: string,
  user: UserRecordPublic | null,
): Promise<PageRecord | undefined> {
  const page = await db.getPageByPath(page_path);
  if (!page) return undefined;
  const visible = CanViewerSeePage(await db.getAccessGroupsForPage(page.id), await GetPageViewer(user));
  return visible ? page : undefined;
}

/** All pages the user may see, e.g. for the page switcher and the sitemap. */
export async function GetAccessiblePages(user: UserRecordPublic | null): Promise<PageRecord[]> {
  const pages = await db.getAllPages();
  if (pages.length === 0) return [];
  const groupsByPage = await db.getAccessGroupsForPages(pages.map((page) => page.id));
  const viewer = await GetPageViewer(user);
  return pages.filter((page) => CanViewerSeePage(groupsByPage.get(page.id) ?? [], viewer));
}

export async function GetAllAccessGroups(): Promise<AccessGroupRecord[]> {
  return await db.getAllAccessGroups();
}

/**
 * Create a custom access group. The ID is normalized (see NormalizeAccessGroupId)
 * and must not be empty, reserved or taken.
 */
export async function CreateAccessGroup(data: {
  id?: unknown;
  group_name?: unknown;
  description?: unknown;
}): Promise<AccessGroupRecord> {
  if (typeof data.id !== "string" || typeof data.group_name !== "string") {
    throw new Error("id and group_name are required");
  }
  const id = NormalizeAccessGroupId(data.id);
  const group_name = data.group_name.trim();
  const description = typeof data.description === "string" && data.description.trim() ? data.description.trim() : null;

  if (!id) {
    throw new Error("id must contain at least one letter, digit, hyphen or underscore");
  }
  if (id.length > ACCESS_GROUP_ID_MAX_LENGTH) {
    throw new Error(`id must be at most ${ACCESS_GROUP_ID_MAX_LENGTH} characters`);
  }
  if (RESERVED_ACCESS_GROUP_IDS.includes(id)) {
    throw new Error(`id '${id}' is reserved for a built-in group`);
  }
  if (!group_name) {
    throw new Error("group_name must not be empty");
  }
  if (group_name.length > ACCESS_GROUP_NAME_MAX_LENGTH) {
    throw new Error(`group_name must be at most ${ACCESS_GROUP_NAME_MAX_LENGTH} characters`);
  }
  if (await db.getAccessGroupById(id)) {
    throw new Error(`Access group '${id}' already exists`);
  }

  await db.createAccessGroup({ id, group_name, description });
  return { id, group_name, description, is_system: false };
}

/** Delete a custom group. It is removed from all pages and roles. Built-in groups stay. */
export async function DeleteAccessGroup(id: unknown): Promise<{ success: true }> {
  const group = typeof id === "string" ? await db.getAccessGroupById(id) : undefined;
  if (!group) {
    throw new Error(`Access group '${String(id)}' not found`);
  }
  if (group.is_system) {
    throw new Error(`Built-in group '${group.id}' cannot be deleted`);
  }
  await db.deleteAccessGroup(group.id);
  return { success: true };
}

/**
 * Checks a list of group IDs before it is saved and returns it without duplicates.
 * Throws with a message that names the problem; callers turn that into a 400.
 */
async function ValidateAccessGroupIds(value: unknown, notAllowed: string, reason: string): Promise<string[]> {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string")) {
    throw new Error("access_groups must be a list of group IDs");
  }
  const ids = [...new Set(value as string[])];
  const known = new Set((await db.getAllAccessGroups()).map((group) => group.id));
  for (const id of ids) {
    if (!known.has(id)) {
      throw new Error(`Access group '${id}' does not exist`);
    }
    if (id === notAllowed) {
      throw new Error(`Access group '${id}' ${reason}`);
    }
  }
  return ids;
}

/** "admin" only makes sense on roles: it lets a role see every page. */
export async function ValidatePageAccessGroups(value: unknown): Promise<string[]> {
  return await ValidateAccessGroupIds(value, ADMIN_ACCESS_GROUP, "can only be given to roles");
}

/** "public" only makes sense on pages: every visitor already sees public pages. */
async function ValidateRoleAccessGroups(value: unknown): Promise<string[]> {
  return await ValidateAccessGroupIds(value, PUBLIC_ACCESS_GROUP, "can only be given to pages");
}

export async function GetPageAccessGroups(page_id: number): Promise<string[]> {
  return await db.getAccessGroupsForPage(page_id);
}

/** Replace the groups of a page. */
export async function SetPageAccessGroups(page_id: unknown, group_ids: unknown): Promise<{ success: true }> {
  const page = typeof page_id === "number" ? await db.getPageById(page_id) : undefined;
  if (!page) {
    throw new Error(`Page with id ${String(page_id)} not found`);
  }
  await db.setPageAccessGroups(page.id, await ValidatePageAccessGroups(group_ids));
  return { success: true };
}

export async function GetRoleAccessGroups(role_id: string): Promise<string[]> {
  return await db.getAccessGroupsForRole(role_id);
}

/**
 * Replace the groups of a role. The Administrator role always sees every page,
 * so its groups are fixed.
 */
export async function SetRoleAccessGroups(role_id: unknown, group_ids: unknown): Promise<{ success: true }> {
  const role = typeof role_id === "string" ? await db.getRoleById(role_id) : undefined;
  if (!role) {
    throw new Error(`Role '${String(role_id)}' not found`);
  }
  if (role.id === ADMIN_ROLE_ID) {
    throw new Error("The Administrator role always sees every page; its access groups cannot be changed");
  }
  await db.setRoleAccessGroups(role.id, await ValidateRoleAccessGroups(group_ids));
  return { success: true };
}

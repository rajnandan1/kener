/**
 * Page access groups: who may see which status page.
 *
 * A page lists the groups that may see it, a role lists the groups it belongs to.
 * The rule, in order:
 *   1. A page in the "public" group is visible to everyone, signed in or not.
 *   2. Anyone else must be signed in.
 *   3. The Administrator role, and every role in the "admin" group, sees every page.
 *   4. Otherwise a page is visible when it shares at least one group with the user's roles.
 *      A page without any group is therefore only visible to the roles from rule 3.
 *
 * Pages the user may not see answer with 404, so their existence is not revealed.
 */

export const PUBLIC_ACCESS_GROUP = "public";
export const ADMIN_ACCESS_GROUP = "admin";
export const ADMIN_ROLE_ID = "admin";

export const RESERVED_ACCESS_GROUP_IDS: readonly string[] = [PUBLIC_ACCESS_GROUP, ADMIN_ACCESS_GROUP];

/** Group IDs share the column size of role IDs */
export const ACCESS_GROUP_ID_MAX_LENGTH = 100;
export const ACCESS_GROUP_NAME_MAX_LENGTH = 255;

/** What the page access check needs to know about a signed-in user. */
export interface PageViewer {
  /** Administrator role or a role in the "admin" group */
  seesAllPages: boolean;
  /** Access groups of all the user's active roles */
  groups: string[];
}

export function BuildPageViewer(roleIds: string[], roleGroups: string[]): PageViewer {
  return {
    seesAllPages: roleIds.includes(ADMIN_ROLE_ID) || roleGroups.includes(ADMIN_ACCESS_GROUP),
    groups: roleGroups,
  };
}

/** viewer is null for visitors who are not signed in. */
export function CanViewerSeePage(pageGroups: string[], viewer: PageViewer | null): boolean {
  if (pageGroups.includes(PUBLIC_ACCESS_GROUP)) return true;
  if (!viewer) return false;
  if (viewer.seesAllPages) return true;
  return pageGroups.some((group) => viewer.groups.includes(group));
}

/**
 * Turns user input into a group ID: lowercase, spaces become hyphens, anything
 * other than a-z, 0-9, "-" and "_" is removed. Can return an empty string.
 */
export function NormalizeAccessGroupId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

import db from "../db/db.js";
import type {
  PageMonitorGroupRecord,
  PageMonitorRecord,
  PageRecord,
  PageRecordInsert,
} from "../types/db.js";

export interface PageMonitorGroupWithMonitors extends PageMonitorGroupRecord {
  monitors: PageMonitorRecord[];
}

export interface PageMonitorStructure {
  monitors: PageMonitorRecord[];
  monitor_groups: PageMonitorGroupWithMonitors[];
  all_monitors: PageMonitorRecord[];
}

export interface PageMonitorStructureMonitorInput {
  monitor_tag: string;
  position?: number;
}

export interface PageMonitorStructureGroupInput {
  id?: number;
  name: string;
  description?: string | null;
  default_expanded?: boolean;
  adopt_child_status?: boolean;
  position?: number;
  monitors?: PageMonitorStructureMonitorInput[];
}

async function ensurePageExists(page_id: number): Promise<PageRecord> {
  const page = await db.getPageById(page_id);
  if (!page) {
    throw new Error(`Page with id ${page_id} not found`);
  }

  return page;
}

async function ensureGroupExists(page_id: number, group_id: number): Promise<PageMonitorGroupRecord> {
  const group = await db.getPageMonitorGroupById(group_id);
  if (!group || group.page_id !== page_id) {
    throw new Error(`Page monitor group "${group_id}" not found on this page`);
  }

  return group;
}

async function getNextTopLevelPosition(page_id: number): Promise<number> {
  const [groups, monitors] = await Promise.all([db.getPageMonitorGroups(page_id), db.getPageMonitors(page_id)]);
  const topLevelMonitorPositions = monitors.filter((monitor) => monitor.page_monitor_group_id === null).map((monitor) => monitor.position);
  const groupPositions = groups.map((group) => group.position);

  return Math.max(-1, ...topLevelMonitorPositions, ...groupPositions) + 1;
}

export async function GetPageMonitorStructure(
  page_id: number,
  options: { excludeHidden?: boolean; includeEmptyGroups?: boolean } = {},
): Promise<PageMonitorStructure> {
  const { excludeHidden = false, includeEmptyGroups = true } = options;
  const [groups, allMonitors] = await Promise.all([
    db.getPageMonitorGroups(page_id),
    excludeHidden ? db.getPageMonitorsExcludeHidden(page_id) : db.getPageMonitors(page_id),
  ]);

  const monitorsByGroup = new Map<number, PageMonitorRecord[]>();
  const topLevelMonitors: PageMonitorRecord[] = [];

  for (const monitor of allMonitors) {
    if (monitor.page_monitor_group_id === null) {
      topLevelMonitors.push(monitor);
      continue;
    }

    if (!monitorsByGroup.has(monitor.page_monitor_group_id)) {
      monitorsByGroup.set(monitor.page_monitor_group_id, []);
    }

    monitorsByGroup.get(monitor.page_monitor_group_id)!.push(monitor);
  }

  const structuredGroups = groups
    .map<PageMonitorGroupWithMonitors>((group) => ({
      ...group,
      monitors: (monitorsByGroup.get(group.id) || []).sort((a, b) => a.position - b.position),
    }))
    .filter((group) => includeEmptyGroups || group.monitors.length > 0);

  return {
    monitors: topLevelMonitors.sort((a, b) => a.position - b.position),
    monitor_groups: structuredGroups,
    all_monitors: allMonitors,
  };
}

// ============ Page CRUD Operations ============

export async function CreatePage(data: PageRecordInsert): Promise<PageRecord> {
  if (data.page_path === undefined || data.page_path === null || !data.page_title || !data.page_header) {
    throw new Error("page_path, page_title, and page_header are required");
  }

  data.page_path = data.page_path
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");

  const existingPage = await db.getPageByPath(data.page_path);
  if (existingPage) {
    throw new Error(`Page with path "${data.page_path}" already exists`);
  }

  return await db.createPage(data);
}

export async function GetPageByPath(page_path: string): Promise<PageRecord | undefined> {
  return await db.getPageByPath(page_path);
}

export async function GetPageById(id: number): Promise<PageRecord | undefined> {
  return await db.getPageById(id);
}

export async function GetAllPages(): Promise<PageRecord[]> {
  return await db.getAllPages();
}

export async function UpdatePage(id: number, data: Partial<PageRecordInsert>): Promise<PageRecord> {
  const existingPage = await db.getPageById(id);
  if (!existingPage) {
    throw new Error(`Page with id ${id} not found`);
  }

  if (data.page_path !== undefined) {
    data.page_path = data.page_path
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "");
  }

  if (data.page_path !== undefined && data.page_path !== existingPage.page_path) {
    const conflictingPage = await db.getPageByPath(data.page_path);
    if (conflictingPage) {
      throw new Error(`Page with path "${data.page_path}" already exists`);
    }
  }

  await db.updatePage(id, data);
  return (await db.getPageById(id))!;
}

export async function DeletePage(id: number): Promise<void> {
  const existingPage = await db.getPageById(id);
  if (!existingPage) {
    throw new Error(`Page with id ${id} not found`);
  }

  if (existingPage.page_path === "") {
    throw new Error("Cannot delete the home page");
  }

  await db.deletePage(id);
}

// ============ Page Monitor Group Operations ============

export async function CreatePageMonitorGroup(
  page_id: number,
  name: string,
  default_expanded: boolean = false,
  adopt_child_status: boolean = false,
  description: string | null = null,
  position?: number,
): Promise<PageMonitorGroupRecord> {
  await ensurePageExists(page_id);

  const normalizedDescription = typeof description === "string" ? description.trim() || null : null;
  const finalPosition = typeof position === "number" ? position : await getNextTopLevelPosition(page_id);
  return await db.createPageMonitorGroup({
    page_id,
    name,
    description: normalizedDescription,
    default_expanded,
    adopt_child_status,
    position: finalPosition,
  });
}

export async function UpdatePageMonitorGroup(
  page_id: number,
  group_id: number,
  data: { name?: string; description?: string | null; default_expanded?: boolean; adopt_child_status?: boolean },
): Promise<PageMonitorGroupRecord> {
  await ensurePageExists(page_id);
  await ensureGroupExists(page_id, group_id);

  await db.updatePageMonitorGroup(group_id, {
    ...data,
    description: typeof data.description === "string" ? data.description.trim() || null : data.description,
  });
  return (await db.getPageMonitorGroupById(group_id))!;
}

export async function DeletePageMonitorGroup(page_id: number, group_id: number): Promise<void> {
  await ensurePageExists(page_id);
  await ensureGroupExists(page_id, group_id);
  await db.deletePageMonitorGroupAndPromoteChildren(page_id, group_id);
}

export async function GetPageMonitorGroups(page_id: number): Promise<PageMonitorGroupRecord[]> {
  await ensurePageExists(page_id);
  return await db.getPageMonitorGroups(page_id);
}

export async function ReorderPageTopLevelItems(
  page_id: number,
  items: Array<{ kind: "monitor" | "group"; id: string | number }>,
): Promise<void> {
  await ensurePageExists(page_id);

  const monitorPositions = items
    .filter((item): item is { kind: "monitor"; id: string } => item.kind === "monitor")
    .map((item, index) => ({
      monitor_tag: item.id,
      position: index,
    }));

  const groupPositions = items
    .filter((item): item is { kind: "group"; id: number } => item.kind === "group")
    .map((item, index) => ({
      id: item.id,
      position: index,
    }));

  await Promise.all([
    db.updatePageMonitorPositions(page_id, monitorPositions),
    db.updatePageMonitorGroupPositions(page_id, groupPositions),
  ]);
}

// ============ Page Monitor Operations ============

export async function AddMonitorToPage(
  page_id: number,
  monitor_tag: string,
  monitor_settings_json?: string | null,
  position?: number,
  page_monitor_group_id?: number | null,
): Promise<void> {
  await ensurePageExists(page_id);

  const exists = await db.monitorExistsOnPage(page_id, monitor_tag);
  if (exists) {
    throw new Error(`Monitor "${monitor_tag}" already exists on this page`);
  }

  if (page_monitor_group_id !== undefined && page_monitor_group_id !== null) {
    await ensureGroupExists(page_id, page_monitor_group_id);
  }

  let finalPosition = position;
  if (finalPosition === undefined) {
    if (page_monitor_group_id === undefined || page_monitor_group_id === null) {
      finalPosition = await getNextTopLevelPosition(page_id);
    } else {
      const existing = await db.getPageMonitors(page_id);
      const groupChildren = existing.filter((monitor) => monitor.page_monitor_group_id === page_monitor_group_id);
      finalPosition = groupChildren.length > 0 ? Math.max(...groupChildren.map((monitor) => monitor.position)) + 1 : 0;
    }
  }

  await db.addMonitorToPage({
    page_id,
    monitor_tag,
    page_monitor_group_id: page_monitor_group_id ?? null,
    monitor_settings_json: monitor_settings_json || null,
    position: finalPosition,
  });
}

export async function ReorderPageMonitors(page_id: number, monitor_tags: string[]): Promise<void> {
  await ensurePageExists(page_id);

  const monitorPositions = monitor_tags.map((tag, index) => ({
    monitor_tag: tag,
    position: index,
  }));

  await db.updatePageMonitorPositions(page_id, monitorPositions);
}

export async function ReorderPageGroupMonitors(page_id: number, group_id: number, monitor_tags: string[]): Promise<void> {
  await ensurePageExists(page_id);
  await ensureGroupExists(page_id, group_id);

  const monitorPositions = monitor_tags.map((tag, index) => ({
    monitor_tag: tag,
    position: index,
  }));

  await db.updatePageMonitorPositions(page_id, monitorPositions);
}

export async function MovePageMonitorToGroup(
  page_id: number,
  monitor_tag: string,
  group_id: number | null,
  position?: number,
): Promise<void> {
  await ensurePageExists(page_id);

  const exists = await db.monitorExistsOnPage(page_id, monitor_tag);
  if (!exists) {
    throw new Error(`Monitor "${monitor_tag}" not found on this page`);
  }

  if (group_id !== null) {
    await ensureGroupExists(page_id, group_id);
  }

  await db.movePageMonitorToGroup(page_id, monitor_tag, group_id, position);
}

export async function ReplacePageMonitorStructure(
  page_id: number,
  data: {
    monitors?: PageMonitorStructureMonitorInput[];
    monitor_groups?: PageMonitorStructureGroupInput[];
  },
): Promise<PageMonitorStructure> {
  await ensurePageExists(page_id);

  const topLevelMonitors = data.monitors || [];
  const monitorGroups = data.monitor_groups || [];
  const existingGroups = await db.getPageMonitorGroups(page_id);
  const existingGroupById = new Map(existingGroups.map((group) => [group.id, group]));
  const retainedGroupIds = new Set<number>();

  await db.deletePageMonitorsByPageId(page_id);

  for (const group of monitorGroups) {
    if (typeof group.id === "number" && existingGroupById.has(group.id)) {
      retainedGroupIds.add(group.id);
    }
  }

  for (const group of existingGroups) {
    if (!retainedGroupIds.has(group.id)) {
      await db.deletePageMonitorGroup(group.id);
    }
  }

  const topLevelItems = [
    ...topLevelMonitors.map((monitor, index) => ({
      kind: "monitor" as const,
      monitor,
      order: typeof monitor.position === "number" ? monitor.position : index,
    })),
    ...monitorGroups.map((group, index) => ({
      kind: "group" as const,
      group,
      order: typeof group.position === "number" ? group.position : topLevelMonitors.length + index,
    })),
  ].sort((a, b) => a.order - b.order);

  const actualGroupIds = new Map<number, number>();

  for (let index = 0; index < topLevelItems.length; index++) {
    const item = topLevelItems[index];

    if (item.kind === "group") {
      const name = item.group.name.trim();
      const description =
        typeof item.group.description === "string" ? item.group.description.trim() || null : null;
      if (!name) {
        throw new Error("Group name is required");
      }

      if (typeof item.group.id === "number" && existingGroupById.has(item.group.id)) {
        await db.updatePageMonitorGroup(item.group.id, {
          name,
          description,
          default_expanded: item.group.default_expanded ?? false,
          adopt_child_status: item.group.adopt_child_status ?? false,
          position: index,
        });
        actualGroupIds.set(item.group.id, item.group.id);
      } else {
        const createdGroup = await db.createPageMonitorGroup({
          page_id,
          name,
          description,
          default_expanded: item.group.default_expanded ?? false,
          adopt_child_status: item.group.adopt_child_status ?? false,
          position: index,
        });
        if (typeof item.group.id === "number") {
          actualGroupIds.set(item.group.id, createdGroup.id);
        }
        actualGroupIds.set(createdGroup.id, createdGroup.id);
        item.group.id = createdGroup.id;
      }
    }
  }

  for (let index = 0; index < topLevelItems.length; index++) {
    const item = topLevelItems[index];
    if (item.kind !== "monitor") continue;

    await AddMonitorToPage(page_id, item.monitor.monitor_tag, null, index, null);
  }

  for (const group of monitorGroups) {
    const actualGroupId =
      typeof group.id === "number" ? actualGroupIds.get(group.id) || group.id : undefined;
    if (!actualGroupId) continue;

    const childMonitors = (group.monitors || []).map((monitor, index) => ({
      ...monitor,
      position: typeof monitor.position === "number" ? monitor.position : index,
    }));

    childMonitors.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    for (let index = 0; index < childMonitors.length; index++) {
      await AddMonitorToPage(page_id, childMonitors[index].monitor_tag, null, index, actualGroupId);
    }
  }

  return await GetPageMonitorStructure(page_id);
}

export async function RemoveMonitorFromPage(page_id: number, monitor_tag: string): Promise<void> {
  await ensurePageExists(page_id);

  const deleted = await db.removeMonitorFromPage(page_id, monitor_tag);
  if (deleted === 0) {
    throw new Error(`Monitor "${monitor_tag}" not found on this page`);
  }
}

export async function GetPageMonitors(page_id: number): Promise<PageMonitorRecord[]> {
  return await db.getPageMonitors(page_id);
}

export async function UpdatePageMonitorSettings(
  page_id: number,
  monitor_tag: string,
  monitor_settings_json: string | null,
): Promise<void> {
  await ensurePageExists(page_id);

  const exists = await db.monitorExistsOnPage(page_id, monitor_tag);
  if (!exists) {
    throw new Error(`Monitor "${monitor_tag}" not found on this page`);
  }

  await db.updatePageMonitorSettings(page_id, monitor_tag, monitor_settings_json);
}

// ============ Convenience Helpers ============

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

export async function GetPageWithMonitorStructure(
  page_id: number,
  options: { excludeHidden?: boolean; includeEmptyGroups?: boolean } = {},
): Promise<{ page: PageRecord; structure: PageMonitorStructure } | undefined> {
  const page = await db.getPageById(page_id);
  if (!page) {
    return undefined;
  }

  const structure = await GetPageMonitorStructure(page_id, options);
  return { page, structure };
}

export async function GetPageByPathWithMonitorStructure(
  page_path: string,
  options: { excludeHidden?: boolean; includeEmptyGroups?: boolean } = {},
): Promise<{ page: PageRecord; structure: PageMonitorStructure } | undefined> {
  const page = await db.getPageByPath(page_path);
  if (!page) {
    return undefined;
  }

  const structure = await GetPageMonitorStructure(page.id, options);
  return { page, structure };
}

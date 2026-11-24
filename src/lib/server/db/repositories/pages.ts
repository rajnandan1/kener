import { BaseRepository } from "./base.js";
import { GetDbType } from "../../tool.js";
import type {
  AccessGroupRecord,
  AccessGroupRecordInsert,
  PageRecord,
  PageRecordInsert,
  PageMonitorRecord,
  PageMonitorRecordInsert,
} from "../../types/db.js";

/**
 * Repository for pages and page monitors operations
 */
export class PagesRepository extends BaseRepository {
  // ============ Pages ============

  /**
   * Inserts a page. When accessGroupIds is given, the page and its access
   * groups are written in one transaction, so a failure leaves no page behind.
   */
  async createPage(data: PageRecordInsert, accessGroupIds: string[] = []): Promise<PageRecord> {
    const dbType = GetDbType();
    const insertData = {
      page_path: data.page_path,
      page_title: data.page_title,
      page_header: data.page_header,
      page_subheader: data.page_subheader,
      page_logo: data.page_logo,
      page_settings_json: data.page_settings_json,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    };

    return await this.knex.transaction(async (trx) => {
      let page: PageRecord;
      if (dbType === "postgresql") {
        const result = await trx("pages").insert(insertData).returning("*");
        page = Array.isArray(result) ? result[0] : result;
      } else {
        const result = await trx("pages").insert(insertData);
        const insertedId = result[0];
        const id = typeof insertedId === "object" ? (insertedId as { id: number }).id : insertedId;
        page = await trx("pages").where("id", id).first();
      }

      if (accessGroupIds.length > 0) {
        await trx("page_access_groups").insert(
          accessGroupIds.map((access_group_id) => ({ page_id: page.id, access_group_id })),
        );
      }
      return page;
    });
  }

  async getPageById(id: number): Promise<PageRecord | undefined> {
    return await this.knex("pages").where("id", id).first();
  }

  async getPageByPath(page_path: string): Promise<PageRecord | undefined> {
    return await this.knex("pages").where("page_path", page_path).first();
  }

  async getAllPages(): Promise<PageRecord[]> {
    return await this.knex("pages").orderBy("id", "asc");
  }

  async updatePage(id: number, data: Partial<PageRecordInsert>): Promise<number> {
    return await this.knex("pages")
      .where("id", id)
      .update({
        ...data,
        updated_at: this.knex.fn.now(),
      });
  }

  async deletePage(id: number): Promise<number> {
    return await this.knex("pages").where("id", id).del();
  }

  // ============ Pages Monitors ============

  async addMonitorToPage(data: PageMonitorRecordInsert): Promise<void> {
    await this.knex("pages_monitors").insert({
      page_id: data.page_id,
      monitor_tag: data.monitor_tag,
      monitor_settings_json: data.monitor_settings_json,
      position: data.position ?? 0,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  async removeMonitorFromPage(page_id: number, monitor_tag: string): Promise<number> {
    return await this.knex("pages_monitors").where({ page_id, monitor_tag }).del();
  }

  async getPageMonitors(page_id: number): Promise<PageMonitorRecord[]> {
    return await this.knex("pages_monitors").where("page_id", page_id).orderBy("position", "asc");
  }

  async getActivePageMonitors(page_id: number, includeHidden = false): Promise<PageMonitorRecord[]> {
    const query = this.knex("pages_monitors")
      .join("monitors", "pages_monitors.monitor_tag", "monitors.tag")
      .where("pages_monitors.page_id", page_id)
      .andWhere("monitors.status", "ACTIVE");
    if (!includeHidden) {
      query.andWhere("monitors.is_hidden", "NO");
    }
    return await query.orderBy("pages_monitors.position", "asc").select("pages_monitors.*");
  }

  async getPagesByMonitorTag(monitor_tag: string): Promise<PageMonitorRecord[]> {
    return await this.knex("pages_monitors").where("monitor_tag", monitor_tag);
  }

  async updatePageMonitorSettings(
    page_id: number,
    monitor_tag: string,
    monitor_settings_json: string | null,
  ): Promise<number> {
    return await this.knex("pages_monitors").where({ page_id, monitor_tag }).update({
      monitor_settings_json,
      updated_at: this.knex.fn.now(),
    });
  }

  async monitorExistsOnPage(page_id: number, monitor_tag: string): Promise<boolean> {
    const result = await this.knex("pages_monitors").where({ page_id, monitor_tag }).first();
    return !!result;
  }

  async deletePageMonitorsByTag(monitor_tag: string): Promise<number> {
    return await this.knex("pages_monitors").where({ monitor_tag }).del();
  }

  async deletePageMonitorsByPageId(page_id: number): Promise<number> {
    return await this.knex("pages_monitors").where({ page_id }).del();
  }

  async updatePageMonitorPositions(
    page_id: number,
    monitorPositions: { monitor_tag: string; position: number }[],
  ): Promise<void> {
    await this.knex.transaction(async (trx) => {
      for (const mp of monitorPositions) {
        await trx("pages_monitors")
          .where({ page_id, monitor_tag: mp.monitor_tag })
          .update({ position: mp.position, updated_at: trx.fn.now() });
      }
    });
  }

  // ============ Access Groups ============

  async getAllAccessGroups(): Promise<AccessGroupRecord[]> {
    const rows = await this.knex("access_groups").select("id", "group_name", "description", "is_system");
    // System groups first, then by name
    return rows
      .map((row: AccessGroupRecord & { is_system: number | boolean }) => ({
        id: row.id,
        group_name: row.group_name,
        description: row.description ?? null,
        is_system: Number(row.is_system) === 1,
      }))
      .sort((a, b) => Number(b.is_system) - Number(a.is_system) || a.group_name.localeCompare(b.group_name));
  }

  async getAccessGroupById(id: string): Promise<AccessGroupRecord | undefined> {
    return (await this.getAllAccessGroups()).find((group) => group.id === id);
  }

  async createAccessGroup(data: AccessGroupRecordInsert): Promise<void> {
    await this.knex("access_groups").insert({
      id: data.id,
      group_name: data.group_name,
      description: data.description ?? null,
      is_system: 0,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  /** Deletes a group. ON DELETE CASCADE removes it from every page and role. */
  async deleteAccessGroup(id: string): Promise<number> {
    return await this.knex("access_groups").where("id", id).del();
  }

  async getAccessGroupsForPage(page_id: number): Promise<string[]> {
    const rows = await this.knex("page_access_groups").where("page_id", page_id).select("access_group_id");
    return rows.map((row: { access_group_id: string }) => row.access_group_id).sort();
  }

  async getAccessGroupsForPages(page_ids: number[]): Promise<Map<number, string[]>> {
    const map = new Map<number, string[]>();
    if (page_ids.length === 0) return map;
    const rows = await this.knex("page_access_groups")
      .whereIn("page_id", page_ids)
      .select("page_id", "access_group_id");
    for (const row of rows as { page_id: number; access_group_id: string }[]) {
      const list = map.get(Number(row.page_id)) ?? [];
      list.push(row.access_group_id);
      map.set(Number(row.page_id), list);
    }
    return map;
  }

  async getAccessGroupsForRole(role_id: string): Promise<string[]> {
    const rows = await this.knex("role_access_groups").where("role_id", role_id).select("access_group_id");
    return rows.map((row: { access_group_id: string }) => row.access_group_id).sort();
  }

  /** Groups of the given roles. Inactive roles count for nothing, as with permissions. */
  async getAccessGroupsForRoles(role_ids: string[]): Promise<string[]> {
    if (role_ids.length === 0) return [];
    const rows = await this.knex("role_access_groups")
      .join("roles", "roles.id", "role_access_groups.role_id")
      .whereIn("role_access_groups.role_id", role_ids)
      .andWhere("roles.status", "ACTIVE")
      .distinct("role_access_groups.access_group_id as access_group_id");
    return rows.map((row: { access_group_id: string }) => row.access_group_id).sort();
  }

  /** Replaces all access groups of a page. */
  async setPageAccessGroups(page_id: number, group_ids: string[]): Promise<void> {
    await this.knex.transaction(async (trx) => {
      await trx("page_access_groups").where("page_id", page_id).del();
      if (group_ids.length > 0) {
        await trx("page_access_groups").insert(group_ids.map((access_group_id) => ({ page_id, access_group_id })));
      }
    });
  }

  /** Replaces all access groups of a role. */
  async setRoleAccessGroups(role_id: string, group_ids: string[]): Promise<void> {
    await this.knex.transaction(async (trx) => {
      await trx("role_access_groups").where("role_id", role_id).del();
      if (group_ids.length > 0) {
        await trx("role_access_groups").insert(group_ids.map((access_group_id) => ({ role_id, access_group_id })));
      }
    });
  }
}

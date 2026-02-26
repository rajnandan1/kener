import { BaseRepository } from "./base.js";
import { GetDbType } from "../../tool.js";
import type { PageRecord, PageRecordInsert, PageMonitorRecord, PageMonitorRecordInsert } from "../../types/db.js";

/**
 * Repository for pages and page monitors operations
 */
export class PagesRepository extends BaseRepository {
  // ============ Pages ============

  async createPage(data: PageRecordInsert): Promise<PageRecord> {
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

    if (dbType === "postgresql") {
      const result = await this.knex("pages").insert(insertData).returning("*");
      const page = Array.isArray(result) ? result[0] : result;
      return page;
    }

    const result = await this.knex("pages").insert(insertData);
    const insertedId = result[0];
    const id = typeof insertedId === "object" ? (insertedId as { id: number }).id : insertedId;
    return (await this.getPageById(id))!;
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
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  async removeMonitorFromPage(page_id: number, monitor_tag: string): Promise<number> {
    return await this.knex("pages_monitors").where({ page_id, monitor_tag }).del();
  }

  async getPageMonitors(page_id: number): Promise<PageMonitorRecord[]> {
    return await this.knex("pages_monitors").where("page_id", page_id);
  }

  async getPageMonitorsExcludeHidden(page_id: number): Promise<PageMonitorRecord[]> {
    return await this.knex("pages_monitors")
      .join("monitors", "pages_monitors.monitor_tag", "monitors.tag")
      .where("pages_monitors.page_id", page_id)
      .andWhere("monitors.is_hidden", "NO")
      .andWhere("monitors.status", "ACTIVE")
      .select("pages_monitors.*");
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
}

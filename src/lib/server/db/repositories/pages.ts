import { BaseRepository } from "./base.js";
import { GetDbType } from "../../tool.js";
import type {
  PageRecord,
  PageRecordInsert,
  PageMonitorGroupRecord,
  PageMonitorGroupRecordInsert,
  PageMonitorRecord,
  PageMonitorRecordInsert,
} from "../../types/db.js";

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

  // ============ Page Monitor Groups ============

  async createPageMonitorGroup(data: PageMonitorGroupRecordInsert): Promise<PageMonitorGroupRecord> {
    const dbType = GetDbType();
    const insertData = {
      page_id: data.page_id,
      name: data.name,
      description: data.description ?? null,
      default_expanded: data.default_expanded ?? false,
      adopt_child_status: data.adopt_child_status ?? false,
      position: data.position ?? 0,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    };

    if (dbType === "postgresql") {
      const result = await this.knex("pages_monitor_groups").insert(insertData).returning("*");
      const group = Array.isArray(result) ? result[0] : result;
      return group;
    }

    const result = await this.knex("pages_monitor_groups").insert(insertData);
    const insertedId = result[0];
    const id = typeof insertedId === "object" ? (insertedId as { id: number }).id : insertedId;
    return (await this.getPageMonitorGroupById(id))!;
  }

  async getPageMonitorGroupById(id: number): Promise<PageMonitorGroupRecord | undefined> {
    return await this.knex("pages_monitor_groups").where("id", id).first();
  }

  async getPageMonitorGroups(page_id: number): Promise<PageMonitorGroupRecord[]> {
    return await this.knex("pages_monitor_groups").where("page_id", page_id).orderBy("position", "asc");
  }

  async updatePageMonitorGroup(
    id: number,
    data: Partial<Omit<PageMonitorGroupRecordInsert, "page_id">>,
  ): Promise<number> {
    return await this.knex("pages_monitor_groups")
      .where("id", id)
      .update({
        ...data,
        updated_at: this.knex.fn.now(),
      });
  }

  async deletePageMonitorGroup(id: number): Promise<number> {
    return await this.knex("pages_monitor_groups").where("id", id).del();
  }

  async updatePageMonitorGroupPositions(
    page_id: number,
    groupPositions: { id: number; position: number }[],
  ): Promise<void> {
    await this.knex.transaction(async (trx) => {
      for (const gp of groupPositions) {
        await trx("pages_monitor_groups")
          .where({ page_id, id: gp.id })
          .update({ position: gp.position, updated_at: trx.fn.now() });
      }
    });
  }

  async deletePageMonitorGroupAndPromoteChildren(page_id: number, group_id: number): Promise<void> {
    await this.knex.transaction(async (trx) => {
      const group = await trx("pages_monitor_groups").where({ page_id, id: group_id }).first();
      if (!group) return;

      const groupPosition = group.position;
      const childMonitors = await trx("pages_monitors")
        .where({ page_id, page_monitor_group_id: group_id })
        .orderBy("position", "asc");

      const delta = childMonitors.length - 1;

      for (let index = 0; index < childMonitors.length; index++) {
        await trx("pages_monitors")
          .where({ page_id, monitor_tag: childMonitors[index].monitor_tag })
          .update({
            page_monitor_group_id: null,
            position: groupPosition + index,
            updated_at: trx.fn.now(),
          });
      }

      if (delta !== 0) {
        await trx("pages_monitors")
          .where("page_id", page_id)
          .whereNull("page_monitor_group_id")
          .andWhere("position", ">", groupPosition)
          .update({
            position: trx.raw("?? + ?", ["position", delta]),
            updated_at: trx.fn.now(),
          });

        await trx("pages_monitor_groups")
          .where("page_id", page_id)
          .andWhere("position", ">", groupPosition)
          .update({
            position: trx.raw("?? + ?", ["position", delta]),
            updated_at: trx.fn.now(),
          });
      } else {
        await trx("pages_monitors")
          .where("page_id", page_id)
          .whereNull("page_monitor_group_id")
          .andWhere("position", ">", groupPosition)
          .update({
            position: trx.raw("?? - 1", ["position"]),
            updated_at: trx.fn.now(),
          });

        await trx("pages_monitor_groups")
          .where("page_id", page_id)
          .andWhere("position", ">", groupPosition)
          .update({
            position: trx.raw("?? - 1", ["position"]),
            updated_at: trx.fn.now(),
          });
      }

      await trx("pages_monitor_groups").where({ page_id, id: group_id }).del();
    });
  }

  // ============ Pages Monitors ============

  async addMonitorToPage(data: PageMonitorRecordInsert): Promise<void> {
    await this.knex("pages_monitors").insert({
      page_id: data.page_id,
      monitor_tag: data.monitor_tag,
      page_monitor_group_id: data.page_monitor_group_id ?? null,
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

  async getPageMonitorsExcludeHidden(page_id: number): Promise<PageMonitorRecord[]> {
    return await this.knex("pages_monitors")
      .join("monitors", "pages_monitors.monitor_tag", "monitors.tag")
      .where("pages_monitors.page_id", page_id)
      .andWhere("monitors.is_hidden", "NO")
      .andWhere("monitors.status", "ACTIVE")
      .orderBy("pages_monitors.position", "asc")
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

  async movePageMonitorToGroup(
    page_id: number,
    monitor_tag: string,
    page_monitor_group_id: number | null,
    position?: number,
  ): Promise<void> {
    await this.knex.transaction(async (trx) => {
      const existing = await trx("pages_monitors").where({ page_id, monitor_tag }).first();
      if (!existing) return;

      const sourceGroupId = existing.page_monitor_group_id as number | null;
      const sourcePosition = existing.position as number;

      if (sourceGroupId === page_monitor_group_id) {
        return;
      }

      if (sourceGroupId === null) {
        await trx("pages_monitors")
          .where("page_id", page_id)
          .whereNull("page_monitor_group_id")
          .andWhere("position", ">", sourcePosition)
          .update({
            position: trx.raw("?? - 1", ["position"]),
            updated_at: trx.fn.now(),
          });

        await trx("pages_monitor_groups")
          .where("page_id", page_id)
          .andWhere("position", ">", sourcePosition)
          .update({
            position: trx.raw("?? - 1", ["position"]),
            updated_at: trx.fn.now(),
          });
      } else {
        await trx("pages_monitors")
          .where({ page_id, page_monitor_group_id: sourceGroupId })
          .andWhere("position", ">", sourcePosition)
          .update({
            position: trx.raw("?? - 1", ["position"]),
            updated_at: trx.fn.now(),
          });
      }

      let nextPosition = position;
      if (page_monitor_group_id === null) {
        if (typeof nextPosition !== "number") {
          const maxTopLevelMonitor = await trx("pages_monitors")
            .where("page_id", page_id)
            .whereNull("page_monitor_group_id")
            .max<{ max_position: number | null }>("position as max_position")
            .first();
          const maxGroup = await trx("pages_monitor_groups")
            .where("page_id", page_id)
            .max<{ max_position: number | null }>("position as max_position")
            .first();

          nextPosition = Math.max(maxTopLevelMonitor?.max_position ?? -1, maxGroup?.max_position ?? -1) + 1;
        } else {
          await trx("pages_monitors")
            .where("page_id", page_id)
            .whereNull("page_monitor_group_id")
            .andWhere("position", ">=", nextPosition)
            .update({
              position: trx.raw("?? + 1", ["position"]),
              updated_at: trx.fn.now(),
            });

          await trx("pages_monitor_groups")
            .where("page_id", page_id)
            .andWhere("position", ">=", nextPosition)
            .update({
              position: trx.raw("?? + 1", ["position"]),
              updated_at: trx.fn.now(),
            });
        }
      } else {
        if (typeof nextPosition !== "number") {
          const maxGroupPosition = await trx("pages_monitors")
            .where({ page_id, page_monitor_group_id })
            .max<{ max_position: number | null }>("position as max_position")
            .first();
          nextPosition = (maxGroupPosition?.max_position ?? -1) + 1;
        } else {
          await trx("pages_monitors")
            .where({ page_id, page_monitor_group_id })
            .andWhere("position", ">=", nextPosition)
            .update({
              position: trx.raw("?? + 1", ["position"]),
              updated_at: trx.fn.now(),
            });
        }
      }

      await trx("pages_monitors")
        .where({ page_id, monitor_tag })
        .update({
          page_monitor_group_id,
          position: nextPosition,
          updated_at: trx.fn.now(),
        });
    });
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
}

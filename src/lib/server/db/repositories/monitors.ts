import type { Knex as KnexType } from "knex";
import { BaseRepository, type MonitorFilter, type CountResult } from "./base.js";
import type { MonitorRecord, MonitorRecordInsert } from "../../types/db.js";

/**
 * Repository for monitors CRUD operations
 */
export class MonitorsRepository extends BaseRepository {
  async getMonitorsByTags(tags: string[]): Promise<MonitorRecord[]> {
    return await this.knex("monitors").whereIn("tag", tags);
  }

  async getMonitorsByTag(tag: string): Promise<MonitorRecord | undefined> {
    return await this.knex("monitors").where("tag", tag).first();
  }

  async insertMonitor(data: MonitorRecordInsert): Promise<number[]> {
    return await this.knex("monitors").insert({
      tag: data.tag,
      name: data.name,
      description: data.description,
      image: data.image,
      cron: data.cron,
      default_status: data.default_status,
      status: data.status,
      category_name: data.category_name,
      monitor_type: data.monitor_type,
      type_data: data.type_data,
      day_degraded_minimum_count: data.day_degraded_minimum_count,
      day_down_minimum_count: data.day_down_minimum_count,
      include_degraded_in_downtime: data.include_degraded_in_downtime,
      is_hidden: data.is_hidden || "NO",
      monitor_settings_json: data.monitor_settings_json,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  async updateMonitor(data: MonitorRecord): Promise<number> {
    return await this.knex("monitors").where({ id: data.id }).update({
      tag: data.tag,
      name: data.name,
      description: data.description,
      image: data.image,
      cron: data.cron,
      default_status: data.default_status,
      status: data.status,
      category_name: data.category_name,
      monitor_type: data.monitor_type,
      type_data: data.type_data,
      day_degraded_minimum_count: data.day_degraded_minimum_count,
      day_down_minimum_count: data.day_down_minimum_count,
      include_degraded_in_downtime: data.include_degraded_in_downtime,
      is_hidden: data.is_hidden,
      monitor_settings_json: data.monitor_settings_json,
      updated_at: this.knex.fn.now(),
    });
  }

  async updateMonitorTrigger(data: {
    id: number;
    down_trigger: string | null;
    degraded_trigger: string | null;
  }): Promise<number> {
    return await this.knex("monitors").where({ id: data.id }).update({
      down_trigger: data.down_trigger,
      degraded_trigger: data.degraded_trigger,
      updated_at: this.knex.fn.now(),
    });
  }

  async getMonitors(data: MonitorFilter): Promise<MonitorRecord[]> {
    let query = this.knex("monitors").whereRaw("1=1");
    if (!!data.status) {
      query = query.andWhere("status", data.status);
    }
    if (data.category_name && data.category_name !== "All Categories") {
      query = query.andWhere("category_name", data.category_name);
    }
    if (!!data.id) {
      query = query.andWhere("id", data.id);
    }
    if (!!data.monitor_type) {
      query = query.andWhere("monitor_type", data.monitor_type);
    }
    if (!!data.tag) {
      query = query.andWhere("tag", data.tag);
    }
    if (!!data.tags) {
      query = query.andWhere((builder: KnexType.QueryBuilder) => {
        builder.whereIn("tag", data.tags as string[]);
      });
    }
    return await query.orderBy("id", "desc");
  }

  async getMonitorByTag(tag: string): Promise<MonitorRecord | undefined> {
    return await this.knex("monitors").where("tag", tag).first();
  }

  async deleteMonitorsByTag(tag: string): Promise<number> {
    return await this.knex("monitors").where("tag", tag).del();
  }
}

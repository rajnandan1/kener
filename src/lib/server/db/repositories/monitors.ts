import type { Knex as KnexType } from "knex";
import { BaseRepository, type MonitorFilter, type CountResult } from "./base.js";
import type { MonitorRecord, MonitorRecordInsert } from "../../types/db.js";

/**
 * Clamp the Confirmation Threshold to its 1–60 invariant at the data layer, so the bound holds
 * for every app write path (v4 API, manage API, clone, group), not only the v4 API validator.
 * A non-finite/missing value defaults to 1 (off).
 */
function clampConfirmationThreshold(value: number | null | undefined): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(60, Math.max(1, n));
}

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
      confirmation_threshold: clampConfirmationThreshold(data.confirmation_threshold),
      include_degraded_in_downtime: data.include_degraded_in_downtime,
      is_hidden: data.is_hidden || "NO",
      monitor_settings_json: data.monitor_settings_json,
      translations: data.translations ?? null,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
      external_url: data.external_url,
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
      confirmation_threshold: clampConfirmationThreshold(data.confirmation_threshold),
      include_degraded_in_downtime: data.include_degraded_in_downtime,
      is_hidden: data.is_hidden,
      monitor_settings_json: data.monitor_settings_json,
      translations: data.translations ?? null,
      updated_at: this.knex.fn.now(),
      external_url: data.external_url,
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
    if (!!data.is_hidden) {
      query = query.andWhere("is_hidden", data.is_hidden);
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
    if (!!data.search) {
      const term = `%${data.search}%`;
      query = query.andWhere((builder: KnexType.QueryBuilder) => {
        builder.where("name", "like", term).orWhere("tag", "like", term);
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

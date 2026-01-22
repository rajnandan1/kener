import { BaseRepository } from "./base.js";
import type { SiteData } from "../../types/db.js";

/**
 * Repository for site data operations
 */
export class SiteDataRepository extends BaseRepository {
  async insertOrUpdateSiteData(key: string, value: string, data_type: string): Promise<number[]> {
    return await this.knex("site_data")
      .insert({ key, value, data_type })
      .onConflict("key")
      .merge({ value, updated_at: this.knex.fn.now() });
  }

  async getAllSiteData(): Promise<SiteData[]> {
    return await this.knex("site_data");
  }

  async getSiteData(key: string): Promise<{ value: string } | undefined> {
    return await this.knex("site_data").select("value").where("key", key).first();
  }

  async getSiteDataByKey(key: string): Promise<SiteData | undefined> {
    return await this.knex("site_data").where("key", key).first();
  }

  async getAllSiteDataAnalytics(): Promise<SiteData[]> {
    return await this.knex("site_data").where("key", "like", "analytics.%");
  }
}

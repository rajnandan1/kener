import type { Knex } from "knex";
import type { SubscriptionConfigRecord, SubscriptionConfigUpdate, SubscriptionConfigParsed } from "../../types/db.js";

export class SubscriptionConfigRepository {
  constructor(private knex: Knex) {}

  /**
   * Get the subscription config (there should only be one row)
   */
  async getSubscriptionConfig(): Promise<SubscriptionConfigRecord | undefined> {
    return await this.knex("subscription_config").first();
  }

  /**
   * Get the subscription config with parsed JSON fields
   */
  async getSubscriptionConfigParsed(): Promise<SubscriptionConfigParsed | undefined> {
    const config = await this.getSubscriptionConfig();
    if (!config) return undefined;

    return {
      ...config,
      events_enabled: JSON.parse(config.events_enabled),
      methods_enabled: JSON.parse(config.methods_enabled),
      method_triggers: JSON.parse(config.method_triggers),
    };
  }

  /**
   * Update the subscription config
   */
  async updateSubscriptionConfig(id: number, data: SubscriptionConfigUpdate): Promise<number> {
    return await this.knex("subscription_config")
      .where({ id })
      .update({
        ...data,
        updated_at: this.knex.fn.now(),
      });
  }

  /**
   * Create a subscription config if it doesn't exist
   */
  async ensureSubscriptionConfig(): Promise<SubscriptionConfigRecord> {
    let config = await this.getSubscriptionConfig();
    if (!config) {
      await this.knex("subscription_config").insert({
        events_enabled: JSON.stringify({
          incidentUpdatesAll: false,
          maintenanceUpdatesAll: false,
          monitorUpdatesAll: false,
        }),
        methods_enabled: JSON.stringify({
          email: false,
          webhook: false,
          slack: false,
          discord: false,
        }),
        method_triggers: JSON.stringify({
          email: null,
          webhook: null,
          slack: null,
          discord: null,
        }),
      });
      config = await this.getSubscriptionConfig();
    }
    return config!;
  }
}

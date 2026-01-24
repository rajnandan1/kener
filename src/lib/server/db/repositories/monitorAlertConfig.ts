import { BaseRepository, type CountResult } from "./base.js";
import type {
  MonitorAlertConfigRecord,
  MonitorAlertConfigInsert,
  MonitorAlertConfigUpdate,
  MonitorAlertConfigFilter,
  MonitorAlertConfigTriggerRecord,
  MonitorAlertConfigTriggerInsert,
  MonitorAlertConfigWithTriggers,
  TriggerRecord,
  MonitorAlertV2Record,
  MonitorAlertV2Insert,
  MonitorAlertV2Update,
  MonitorAlertV2Filter,
  MonitorAlertStatusType,
  MonitorAlertV2WithConfig,
} from "../../types/db.js";

/**
 * Repository for monitor alert configuration operations
 */
export class MonitorAlertConfigRepository extends BaseRepository {
  // ============ Monitor Alert Config CRUD ============

  /**
   * Insert a new monitor alert config
   */
  async insertMonitorAlertConfig(data: MonitorAlertConfigInsert): Promise<number[]> {
    return await this.knex("monitor_alerts_config").insert({
      monitor_tag: data.monitor_tag,
      alert_for: data.alert_for,
      alert_value: data.alert_value,
      failure_threshold: data.failure_threshold,
      success_threshold: data.success_threshold,
      alert_description: data.alert_description || null,
      create_incident: data.create_incident || "NO",
      is_active: data.is_active || "YES",
      severity: data.severity || "WARNING",
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  /**
   * Update an existing monitor alert config by ID
   */
  async updateMonitorAlertConfig(id: number, data: MonitorAlertConfigUpdate): Promise<number> {
    const updateData: Record<string, unknown> = {
      updated_at: this.knex.fn.now(),
    };

    if (data.alert_for !== undefined) updateData.alert_for = data.alert_for;
    if (data.alert_value !== undefined) updateData.alert_value = data.alert_value;
    if (data.failure_threshold !== undefined) updateData.failure_threshold = data.failure_threshold;
    if (data.success_threshold !== undefined) updateData.success_threshold = data.success_threshold;
    if (data.alert_description !== undefined) updateData.alert_description = data.alert_description;
    if (data.create_incident !== undefined) updateData.create_incident = data.create_incident;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.severity !== undefined) updateData.severity = data.severity;

    return await this.knex("monitor_alerts_config").where({ id }).update(updateData);
  }

  /**
   * Get a single monitor alert config by ID
   */
  async getMonitorAlertConfigById(id: number): Promise<MonitorAlertConfigRecord | undefined> {
    return await this.knex("monitor_alerts_config").where({ id }).first();
  }

  /**
   * Get monitor alert configs with optional filtering
   */
  async getMonitorAlertConfigs(filter: MonitorAlertConfigFilter): Promise<MonitorAlertConfigRecord[]> {
    let query = this.knex("monitor_alerts_config").whereRaw("1=1");

    if (filter.id !== undefined) {
      query = query.andWhere("id", filter.id);
    }
    if (filter.monitor_tag !== undefined) {
      query = query.andWhere("monitor_tag", filter.monitor_tag);
    }
    if (filter.alert_for !== undefined) {
      query = query.andWhere("alert_for", filter.alert_for);
    }
    if (filter.is_active !== undefined) {
      query = query.andWhere("is_active", filter.is_active);
    }

    return await query.orderBy("id", "desc");
  }

  /**
   * Get all monitor alert configs for a specific monitor tag
   */
  async getMonitorAlertConfigsByMonitorTag(monitorTag: string): Promise<MonitorAlertConfigRecord[]> {
    return await this.knex("monitor_alerts_config").where({ monitor_tag: monitorTag }).orderBy("id", "desc");
  }

  /**
   * Get all active monitor alert configs
   */
  async getActiveMonitorAlertConfigs(): Promise<MonitorAlertConfigRecord[]> {
    return await this.knex("monitor_alerts_config").where({ is_active: "YES" }).orderBy("id", "desc");
  }

  /**
   * Get all active monitor alert configs for a specific monitor
   */
  async getActiveMonitorAlertConfigsByMonitorTag(monitorTag: string): Promise<MonitorAlertConfigRecord[]> {
    return await this.knex("monitor_alerts_config")
      .where({ monitor_tag: monitorTag, is_active: "YES" })
      .orderBy("id", "desc");
  }

  /**
   * Delete a monitor alert config by ID
   */
  async deleteMonitorAlertConfig(id: number): Promise<number> {
    return await this.knex("monitor_alerts_config").where({ id }).del();
  }

  /**
   * Delete all monitor alert configs for a specific monitor tag
   */
  async deleteMonitorAlertConfigsByMonitorTag(monitorTag: string): Promise<number> {
    return await this.knex("monitor_alerts_config").where({ monitor_tag: monitorTag }).del();
  }

  /**
   * Count monitor alert configs with optional filtering
   */
  async getMonitorAlertConfigsCount(filter: MonitorAlertConfigFilter): Promise<CountResult | undefined> {
    let query = this.knex("monitor_alerts_config").count("* as count");

    if (filter.id !== undefined) {
      query = query.andWhere("id", filter.id);
    }
    if (filter.monitor_tag !== undefined) {
      query = query.andWhere("monitor_tag", filter.monitor_tag);
    }
    if (filter.alert_for !== undefined) {
      query = query.andWhere("alert_for", filter.alert_for);
    }
    if (filter.is_active !== undefined) {
      query = query.andWhere("is_active", filter.is_active);
    }

    return await query.first<CountResult>();
  }

  // ============ Monitor Alert Config Triggers CRUD ============

  /**
   * Add a trigger to a monitor alert config
   */
  async addTriggerToMonitorAlertConfig(data: MonitorAlertConfigTriggerInsert): Promise<number[]> {
    return await this.knex("monitor_alerts_config_triggers").insert({
      monitor_alerts_id: data.monitor_alerts_id,
      trigger_id: data.trigger_id,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  /**
   * Add multiple triggers to a monitor alert config
   */
  async addTriggersToMonitorAlertConfig(monitorAlertsId: number, triggerIds: number[]): Promise<void> {
    if (triggerIds.length === 0) return;

    const inserts = triggerIds.map((triggerId) => ({
      monitor_alerts_id: monitorAlertsId,
      trigger_id: triggerId,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    }));

    await this.knex("monitor_alerts_config_triggers").insert(inserts);
  }

  /**
   * Remove a trigger from a monitor alert config
   */
  async removeTriggerFromMonitorAlertConfig(monitorAlertsId: number, triggerId: number): Promise<number> {
    return await this.knex("monitor_alerts_config_triggers")
      .where({ monitor_alerts_id: monitorAlertsId, trigger_id: triggerId })
      .del();
  }

  /**
   * Remove all triggers from a monitor alert config
   */
  async removeAllTriggersFromMonitorAlertConfig(monitorAlertsId: number): Promise<number> {
    return await this.knex("monitor_alerts_config_triggers").where({ monitor_alerts_id: monitorAlertsId }).del();
  }

  /**
   * Get all trigger associations for a monitor alert config
   */
  async getMonitorAlertConfigTriggers(monitorAlertsId: number): Promise<MonitorAlertConfigTriggerRecord[]> {
    return await this.knex("monitor_alerts_config_triggers")
      .where({ monitor_alerts_id: monitorAlertsId })
      .orderBy("trigger_id", "asc");
  }

  /**
   * Get trigger IDs for a monitor alert config
   */
  async getMonitorAlertConfigTriggerIds(monitorAlertsId: number): Promise<number[]> {
    const records = await this.knex("monitor_alerts_config_triggers")
      .select("trigger_id")
      .where({ monitor_alerts_id: monitorAlertsId });
    return records.map((r: { trigger_id: number }) => r.trigger_id);
  }

  /**
   * Replace all triggers for a monitor alert config (remove old, add new)
   */
  async replaceMonitorAlertConfigTriggers(monitorAlertsId: number, triggerIds: number[]): Promise<void> {
    await this.removeAllTriggersFromMonitorAlertConfig(monitorAlertsId);
    if (triggerIds.length > 0) {
      await this.addTriggersToMonitorAlertConfig(monitorAlertsId, triggerIds);
    }
  }

  // ============ Composite / Join Operations ============

  /**
   * Get monitor alert config with its associated triggers
   */
  async getMonitorAlertConfigWithTriggers(id: number): Promise<MonitorAlertConfigWithTriggers | undefined> {
    const config = await this.getMonitorAlertConfigById(id);
    if (!config) return undefined;

    const triggerRecords = await this.knex("monitor_alerts_config_triggers as mact")
      .join("triggers as t", "mact.trigger_id", "t.id")
      .select("t.*")
      .where("mact.monitor_alerts_id", id);

    return {
      ...config,
      triggers: triggerRecords as TriggerRecord[],
    };
  }

  /**
   * Get all monitor alert configs for a monitor with their triggers
   */
  async getMonitorAlertConfigsWithTriggersByMonitorTag(monitorTag: string): Promise<MonitorAlertConfigWithTriggers[]> {
    const configs = await this.getMonitorAlertConfigsByMonitorTag(monitorTag);

    const result: MonitorAlertConfigWithTriggers[] = [];
    for (const config of configs) {
      const triggerRecords = await this.knex("monitor_alerts_config_triggers as mact")
        .join("triggers as t", "mact.trigger_id", "t.id")
        .select("t.*")
        .where("mact.monitor_alerts_id", config.id);

      result.push({
        ...config,
        triggers: triggerRecords as TriggerRecord[],
      });
    }

    return result;
  }

  /**
   * Get all active monitor alert configs with their triggers
   */
  async getActiveMonitorAlertConfigsWithTriggers(): Promise<MonitorAlertConfigWithTriggers[]> {
    const configs = await this.getActiveMonitorAlertConfigs();

    const result: MonitorAlertConfigWithTriggers[] = [];
    for (const config of configs) {
      const triggerRecords = await this.knex("monitor_alerts_config_triggers as mact")
        .join("triggers as t", "mact.trigger_id", "t.id")
        .select("t.*")
        .where("mact.monitor_alerts_id", config.id);

      result.push({
        ...config,
        triggers: triggerRecords as TriggerRecord[],
      });
    }

    return result;
  }

  /**
   * Check if a trigger is associated with any monitor alert config
   */
  async isTriggerUsedInMonitorAlertConfig(triggerId: number): Promise<boolean> {
    const result = await this.knex("monitor_alerts_config_triggers")
      .count("* as count")
      .where({ trigger_id: triggerId })
      .first<CountResult>();
    return Number(result?.count) > 0;
  }

  /**
   * Get all monitor alert configs that use a specific trigger
   */
  async getMonitorAlertConfigsByTriggerId(triggerId: number): Promise<MonitorAlertConfigRecord[]> {
    return await this.knex("monitor_alerts_config as mac")
      .join("monitor_alerts_config_triggers as mact", "mac.id", "mact.monitor_alerts_id")
      .select("mac.*")
      .where("mact.trigger_id", triggerId)
      .orderBy("mac.id", "desc");
  }

  // ============ Monitor Alerts V2 CRUD ============

  /**
   * Insert a new monitor alert v2 record
   */
  async insertMonitorAlertV2(data: MonitorAlertV2Insert): Promise<number[]> {
    return await this.knex("monitor_alerts_v2").insert({
      config_id: data.config_id,
      incident_id: data.incident_id || null,
      alert_status: data.alert_status,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  /**
   * Update an existing monitor alert v2 by ID
   */
  async updateMonitorAlertV2(id: number, data: MonitorAlertV2Update): Promise<number> {
    const updateData: Record<string, unknown> = {
      updated_at: this.knex.fn.now(),
    };

    if (data.incident_id !== undefined) updateData.incident_id = data.incident_id;
    if (data.alert_status !== undefined) updateData.alert_status = data.alert_status;

    return await this.knex("monitor_alerts_v2").where({ id }).update(updateData);
  }

  /**
   * Update alert status by ID
   */
  async updateMonitorAlertV2Status(id: number, alertStatus: MonitorAlertStatusType): Promise<number> {
    return await this.knex("monitor_alerts_v2").where({ id }).update({
      alert_status: alertStatus,
      updated_at: this.knex.fn.now(),
    });
  }

  /**
   * Get a single monitor alert v2 by ID
   */
  async getMonitorAlertV2ById(id: number): Promise<MonitorAlertV2Record | undefined> {
    return await this.knex("monitor_alerts_v2").where({ id }).first();
  }

  /**
   * Get monitor alerts v2 with optional filtering
   */
  async getMonitorAlertsV2(filter: MonitorAlertV2Filter): Promise<MonitorAlertV2Record[]> {
    let query = this.knex("monitor_alerts_v2").whereRaw("1=1");

    if (filter.id !== undefined) {
      query = query.andWhere("id", filter.id);
    }
    if (filter.config_id !== undefined) {
      query = query.andWhere("config_id", filter.config_id);
    }
    if (filter.incident_id !== undefined) {
      query = query.andWhere("incident_id", filter.incident_id);
    }
    if (filter.alert_status !== undefined) {
      query = query.andWhere("alert_status", filter.alert_status);
    }

    return await query.orderBy("id", "desc");
  }

  /**
   * Get all monitor alerts v2 for a specific config
   */
  async getMonitorAlertsV2ByConfigId(configId: number): Promise<MonitorAlertV2Record[]> {
    return await this.knex("monitor_alerts_v2").where({ config_id: configId }).orderBy("id", "desc");
  }

  /**
   * Check if a triggered alert exists for a specific config
   */
  async hasTriggeredAlertForConfig(configId: number): Promise<boolean> {
    const result = await this.knex("monitor_alerts_v2")
      .count("* as count")
      .where({ config_id: configId, alert_status: "TRIGGERED" })
      .first<CountResult>();
    return Number(result?.count) > 0;
  }

  /**
   * Get the active (TRIGGERED) alert for a specific config
   */
  async getActiveAlertForConfig(configId: number): Promise<MonitorAlertV2Record | undefined> {
    return await this.knex("monitor_alerts_v2")
      .where({ config_id: configId, alert_status: "TRIGGERED" })
      .orderBy("id", "desc")
      .first();
  }

  /**
   * Get all triggered alerts
   */
  async getAllTriggeredAlerts(): Promise<MonitorAlertV2Record[]> {
    return await this.knex("monitor_alerts_v2").where({ alert_status: "TRIGGERED" }).orderBy("id", "desc");
  }

  /**
   * Delete a monitor alert v2 by ID
   */
  async deleteMonitorAlertV2(id: number): Promise<number> {
    return await this.knex("monitor_alerts_v2").where({ id }).del();
  }

  /**
   * Delete all monitor alerts v2 for a specific config
   */
  async deleteMonitorAlertsV2ByConfigId(configId: number): Promise<number> {
    return await this.knex("monitor_alerts_v2").where({ config_id: configId }).del();
  }

  /**
   * Get monitor alert v2 with its config details
   */
  async getMonitorAlertV2WithConfig(id: number): Promise<MonitorAlertV2WithConfig | undefined> {
    const alert = await this.getMonitorAlertV2ById(id);
    if (!alert) return undefined;

    const config = await this.getMonitorAlertConfigById(alert.config_id);
    if (!config) return undefined;

    return {
      ...alert,
      config,
    };
  }

  /**
   * Get all triggered alerts with their config details
   */
  async getAllTriggeredAlertsWithConfig(): Promise<MonitorAlertV2WithConfig[]> {
    const alerts = await this.getAllTriggeredAlerts();
    const result: MonitorAlertV2WithConfig[] = [];

    for (const alert of alerts) {
      const config = await this.getMonitorAlertConfigById(alert.config_id);
      if (config) {
        result.push({ ...alert, config });
      }
    }

    return result;
  }

  /**
   * Add incident ID to an alert
   */
  async addIncidentToAlert(alertId: number, incidentId: number): Promise<number> {
    return await this.knex("monitor_alerts_v2").where({ id: alertId }).update({
      incident_id: incidentId,
      updated_at: this.knex.fn.now(),
    });
  }

  /**
   * Get alerts by incident ID
   */
  async getAlertsByIncidentId(incidentId: number): Promise<MonitorAlertV2Record[]> {
    return await this.knex("monitor_alerts_v2").where({ incident_id: incidentId }).orderBy("id", "desc");
  }

  /**
   * Count monitor alerts v2 with optional filtering
   */
  async getMonitorAlertsV2Count(filter: MonitorAlertV2Filter): Promise<CountResult | undefined> {
    let query = this.knex("monitor_alerts_v2").count("* as count");

    if (filter.id !== undefined) {
      query = query.andWhere("id", filter.id);
    }
    if (filter.config_id !== undefined) {
      query = query.andWhere("config_id", filter.config_id);
    }
    if (filter.incident_id !== undefined) {
      query = query.andWhere("incident_id", filter.incident_id);
    }
    if (filter.alert_status !== undefined) {
      query = query.andWhere("alert_status", filter.alert_status);
    }

    return await query.first<CountResult>();
  }
}

import { BaseRepository, type TriggerFilter, type CountResult } from "./base.js";
import type { MonitorAlert, MonitorAlertInsert, TriggerRecord, TriggerRecordInsert } from "../../types/db.js";

/**
 * Repository for alerts and triggers operations
 */
export class AlertsRepository extends BaseRepository {
  // ============ Monitor Alerts ============

  async insertAlert(data: MonitorAlertInsert): Promise<number[]> {
    return await this.knex("monitor_alerts").insert({
      monitor_tag: data.monitor_tag,
      monitor_status: data.monitor_status,
      alert_status: data.alert_status,
      health_checks: data.health_checks,
    });
  }

  async alertExistsIncident(incident_number: number): Promise<boolean> {
    const result = await this.knex("monitor_alerts")
      .count("* as count")
      .where({ incident_number })
      .first<CountResult>();
    return Number(result?.count) > 0;
  }

  async alertExists(monitor_tag: string, monitor_status: string, alert_status: string): Promise<boolean> {
    const result = await this.knex("monitor_alerts")
      .count("* as count")
      .where({ monitor_tag, monitor_status, alert_status })
      .first<CountResult>();
    return Number(result?.count) > 0;
  }

  async getActiveAlertIncident(
    monitor_tag: string,
    monitor_status: string,
    incident_number: number,
  ): Promise<MonitorAlert | undefined> {
    return await this.knex("monitor_alerts").where({ monitor_tag, monitor_status, incident_number }).first();
  }

  async getAllActiveAlertIncidents(monitor_tag: string): Promise<MonitorAlert[]> {
    return await this.knex("monitor_alerts")
      .where({ monitor_tag, alert_status: "TRIGGERED" })
      .andWhere("incident_number", ">", 0)
      .orderBy("id", "desc");
  }

  async getActiveAlert(
    monitor_tag: string,
    monitor_status: string,
    alert_status: string,
  ): Promise<MonitorAlert | undefined> {
    return await this.knex("monitor_alerts").where({ monitor_tag, monitor_status, alert_status }).first();
  }

  async getMonitorAlertsPaginated(page: number, limit: number): Promise<MonitorAlert[]> {
    return await this.knex("monitor_alerts")
      .orderBy("id", "desc")
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async getMonitorAlertsCount(): Promise<CountResult | undefined> {
    return await this.knex("monitor_alerts").count("* as count").first<CountResult>();
  }

  async updateAlertStatus(id: number, alert_status: string): Promise<number> {
    return await this.knex("monitor_alerts").where({ id }).update({
      alert_status,
      updated_at: this.knex.fn.now(),
    });
  }

  async incrementAlertHealthChecks(id: number): Promise<number> {
    return await this.knex("monitor_alerts")
      .where({ id })
      .increment("health_checks", 1)
      .update({ updated_at: this.knex.fn.now() });
  }

  async addIncidentNumberToAlert(id: number, incident_number: number): Promise<number> {
    return await this.knex("monitor_alerts").where({ id }).update({
      incident_number,
      updated_at: this.knex.fn.now(),
    });
  }

  async deleteMonitorAlertsByTag(tag: string): Promise<number> {
    return await this.knex("monitor_alerts").where("monitor_tag", tag).del();
  }

  // ============ Triggers ============

  async createNewTrigger(data: TriggerRecordInsert): Promise<number[]> {
    return await this.knex("triggers").insert({
      name: data.name,
      trigger_type: data.trigger_type,
      trigger_status: data.trigger_status,
      trigger_meta: data.trigger_meta,
      trigger_desc: data.trigger_desc,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  async updateTrigger(data: TriggerRecord): Promise<number> {
    return await this.knex("triggers").where({ id: data.id }).update({
      name: data.name,
      trigger_type: data.trigger_type,
      trigger_status: data.trigger_status,
      trigger_desc: data.trigger_desc,
      trigger_meta: data.trigger_meta,
      updated_at: this.knex.fn.now(),
    });
  }

  async getTriggers(data: TriggerFilter): Promise<TriggerRecord[]> {
    let query = this.knex("triggers").whereRaw("1=1");
    if (!!data.status) {
      query = query.andWhere("trigger_status", data.status);
    }
    if (!!data.id) {
      query = query.andWhere("id", data.id);
    }
    return await query.orderBy("id", "desc");
  }

  async getTriggerByID(id: number): Promise<TriggerRecord | undefined> {
    return await this.knex("triggers").where("id", id).first();
  }
  //get by ids
  async getTriggersByIDs(ids: number[]): Promise<TriggerRecord[]> {
    return await this.knex("triggers").whereIn("id", ids);
  }
}

import { BaseRepository, type CountResult } from "./base.js";
import { GetDbType } from "../../tool.js";
import type {
  MaintenanceRecord,
  MaintenanceRecordInsert,
  MaintenanceMonitorRecord,
  MaintenanceMonitorRecordInsert,
  MaintenanceEventRecord,
  MaintenanceEventRecordInsert,
  MaintenanceFilter,
  MaintenanceEventFilter,
  MaintenanceEventRecordDetailed,
  MaintenanceEventsMonitorList,
} from "../../types/db.js";
import GC from "../../../global-constants.js";

/**
 * Repository for maintenances, maintenance monitors, and maintenance events operations
 */
export class MaintenancesRepository extends BaseRepository {
  // ============ Maintenances ============

  async createMaintenance(data: MaintenanceRecordInsert): Promise<MaintenanceRecord> {
    const dbType = GetDbType();
    const insertData = {
      title: data.title,
      description: data.description || null,
      start_date_time: data.start_date_time,
      rrule: data.rrule,
      duration_seconds: data.duration_seconds,
      status: data.status || "ACTIVE",
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    };

    if (dbType === "postgresql") {
      const [maintenance] = await this.knex("maintenances").insert(insertData).returning("*");
      return maintenance;
    } else {
      const result = await this.knex("maintenances").insert(insertData);
      const id = result[0];
      return (await this.getMaintenanceById(id))!;
    }
  }

  async getMaintenanceById(id: number): Promise<MaintenanceRecord | undefined> {
    return await this.knex("maintenances").where("id", id).first();
  }

  async getMaintenancesByIds(ids: number[]): Promise<MaintenanceRecord[]> {
    if (ids.length === 0) return [];
    return await this.knex("maintenances").whereIn("id", ids);
  }

  async getAllMaintenances(filter?: MaintenanceFilter): Promise<MaintenanceRecord[]> {
    let query = this.knex("maintenances").select("*").whereRaw("1=1");

    if (filter?.status) {
      query = query.andWhere("status", filter.status);
    }
    if (filter?.id) {
      query = query.andWhere("id", filter.id);
    }

    return await query.orderBy("id", "desc");
  }

  async getMaintenancesPaginated(
    page: number,
    limit: number,
    filter?: MaintenanceFilter,
  ): Promise<MaintenanceRecord[]> {
    let query = this.knex("maintenances").select("*").whereRaw("1=1");

    if (filter?.status) {
      query = query.andWhere("status", filter.status);
    }

    return await query
      .orderBy("id", "desc")
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async getMaintenancesCount(filter?: MaintenanceFilter): Promise<CountResult | undefined> {
    let query = this.knex("maintenances").count("id as count").whereRaw("1=1");

    if (filter?.status) {
      query = query.andWhere("status", filter.status);
    }

    return (await query.first()) as CountResult | undefined;
  }

  async updateMaintenance(id: number, data: Partial<MaintenanceRecordInsert>): Promise<number> {
    return await this.knex("maintenances")
      .where("id", id)
      .update({
        ...data,
        updated_at: this.knex.fn.now(),
      });
  }

  async deleteMaintenance(id: number): Promise<number> {
    return await this.knex("maintenances").where("id", id).del();
  }

  // ============ Maintenance Monitors ============

  async addMonitorToMaintenance(data: MaintenanceMonitorRecordInsert): Promise<void> {
    await this.knex("maintenance_monitors")
      .insert({
        maintenance_id: data.maintenance_id,
        monitor_tag: data.monitor_tag,
        created_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      })
      .onConflict(["maintenance_id", "monitor_tag"])
      .ignore();
  }

  async addMonitorsToMaintenance(maintenance_id: number, monitor_tags: string[]): Promise<void> {
    if (monitor_tags.length === 0) return;

    const insertData = monitor_tags.map((tag) => ({
      maintenance_id,
      monitor_tag: tag,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    }));

    await this.knex("maintenance_monitors").insert(insertData).onConflict(["maintenance_id", "monitor_tag"]).ignore();
  }

  async addMonitorsToMaintenanceWithStatus(
    maintenance_id: number,
    monitors: Array<{ monitor_tag: string; monitor_impact: "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE" }>,
  ): Promise<void> {
    if (monitors.length === 0) return;

    const insertData = monitors.map((m) => ({
      maintenance_id,
      monitor_tag: m.monitor_tag,
      monitor_impact: m.monitor_impact,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    }));

    await this.knex("maintenance_monitors")
      .insert(insertData)
      .onConflict(["maintenance_id", "monitor_tag"])
      .merge(["monitor_impact", "updated_at"]);
  }

  async removeMonitorFromMaintenance(maintenance_id: number, monitor_tag: string): Promise<number> {
    return await this.knex("maintenance_monitors").where({ maintenance_id, monitor_tag }).del();
  }

  async removeAllMonitorsFromMaintenance(maintenance_id: number): Promise<number> {
    return await this.knex("maintenance_monitors").where({ maintenance_id }).del();
  }

  async deleteMaintenanceMonitorsByTag(monitor_tag: string): Promise<number> {
    return await this.knex("maintenance_monitors").where({ monitor_tag }).del();
  }

  //update monitor impact in maintenance_monitors table
  async updateMonitorImpactInMaintenanceMonitors(
    maintenance_id: number,
    monitor_tag: string,
    monitor_impact: "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE",
  ): Promise<number> {
    return await this.knex("maintenance_monitors").where({ maintenance_id, monitor_tag }).update({
      monitor_impact,
      updated_at: this.knex.fn.now(),
    });
  }

  async getMaintenanceMonitors(maintenance_id: number): Promise<MaintenanceMonitorRecord[]> {
    return await this.knex("maintenance_monitors").where("maintenance_id", maintenance_id);
  }

  async getMaintenancesForMonitor(monitor_tag: string, status?: "ACTIVE" | "INACTIVE"): Promise<MaintenanceRecord[]> {
    let query = this.knex("maintenances")
      .join("maintenance_monitors", "maintenances.id", "maintenance_monitors.maintenance_id")
      .where("maintenance_monitors.monitor_tag", monitor_tag)
      .select("maintenances.*");

    if (status) {
      query = query.andWhere("maintenances.status", status);
    }

    return await query;
  }

  // ============ Maintenance Events ============

  async createMaintenanceEvent(data: MaintenanceEventRecordInsert): Promise<MaintenanceEventRecord> {
    const dbType = GetDbType();
    const insertData = {
      maintenance_id: data.maintenance_id,
      start_date_time: data.start_date_time,
      end_date_time: data.end_date_time,
      status: data.status || "SCHEDULED",
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    };

    if (dbType === "postgresql") {
      const [event] = await this.knex("maintenances_events").insert(insertData).returning("*");
      return event;
    } else {
      const result = await this.knex("maintenances_events").insert(insertData);
      const id = result[0];
      return (await this.getMaintenanceEventById(id))!;
    }
  }

  async getMaintenanceEventById(id: number): Promise<MaintenanceEventRecord | undefined> {
    return await this.knex("maintenances_events").where("id", id).first();
  }

  async getMaintenanceEventsByMaintenanceId(maintenance_id: number): Promise<MaintenanceEventRecord[]> {
    return await this.knex("maintenances_events")
      .where("maintenance_id", maintenance_id)
      .orderBy("start_date_time", "asc");
  }

  /**
   * Get maintenance events with limited past and upcoming events
   * Returns limited past events + current events + limited upcoming events
   */
  async getMaintenanceEventsByMaintenanceIdWithLimits(
    maintenance_id: number,
    currentTimestamp: number,
    pastLimit: number = 5,
    daysInPast: number = 7,
    upcomingLimit: number = 10,
    daysInFuture: number = 30,
  ): Promise<MaintenanceEventRecord[]> {
    const pastTimestamp = currentTimestamp - daysInPast * 24 * 60 * 60;
    const futureTimestamp = currentTimestamp + daysInFuture * 24 * 60 * 60;

    // Get current/ongoing events (events that span the current time)
    const currentEvents = await this.knex("maintenances_events")
      .where("maintenance_id", maintenance_id)
      .andWhere("start_date_time", "<=", currentTimestamp)
      .andWhere("end_date_time", ">=", currentTimestamp)
      .orderBy("start_date_time", "asc");

    // Get past events (limited) - events that ended before now
    const pastEvents = await this.knex("maintenances_events")
      .where("maintenance_id", maintenance_id)
      .andWhere("end_date_time", "<", currentTimestamp)
      .andWhere("end_date_time", ">=", pastTimestamp)
      .orderBy("end_date_time", "desc")
      .limit(pastLimit);

    // Get upcoming events (limited) - events that start after now
    const upcomingEvents = await this.knex("maintenances_events")
      .where("maintenance_id", maintenance_id)
      .andWhere("start_date_time", ">", currentTimestamp)
      .andWhere("start_date_time", "<=", futureTimestamp)
      .orderBy("start_date_time", "asc")
      .limit(upcomingLimit);

    // Combine and sort by start_date_time (past reversed to be chronological, then current, then upcoming)
    const allEvents = [...pastEvents.reverse(), ...currentEvents, ...upcomingEvents];
    return allEvents;
  }

  async getMaintenanceEvents(filter?: MaintenanceEventFilter): Promise<MaintenanceEventRecord[]> {
    let query = this.knex("maintenances_events").select("*").whereRaw("1=1");

    if (filter?.maintenance_id) {
      query = query.andWhere("maintenance_id", filter.maintenance_id);
    }
    if (filter?.status) {
      query = query.andWhere("status", filter.status);
    }
    if (filter?.id) {
      query = query.andWhere("id", filter.id);
    }

    return await query.orderBy("start_date_time", "desc");
  }

  async getActiveMaintenanceEvents(start: number, end: number): Promise<MaintenanceEventRecord[]> {
    return await this.knex("maintenances_events")
      .whereIn("status", ["SCHEDULED", "ONGOING"])
      .andWhere("start_date_time", "<=", end)
      .andWhere("end_date_time", ">=", start)
      .orderBy("start_date_time", "asc");
  }

  async getMaintenanceEventsForMonitor(
    monitor_tag: string,
    start: number,
    end: number,
  ): Promise<MaintenanceEventRecord[]> {
    return await this.knex("maintenances_events")
      .join("maintenance_monitors", "maintenances_events.maintenance_id", "maintenance_monitors.maintenance_id")
      .where("maintenance_monitors.monitor_tag", monitor_tag)
      .andWhere("maintenances_events.start_date_time", "<=", end)
      .andWhere("maintenances_events.end_date_time", ">=", start)
      .select("maintenances_events.*");
  }

  async getMaintenancesByMonitorTagRealtime(
    monitor_tag: string,
    timestamp: number,
  ): Promise<
    Array<{ id: number; start_date_time: number; end_date_time: number | null; monitor_impact: string | null }>
  > {
    return await this.knex("maintenances_events as me")
      .select(
        "me.id as id",
        "me.start_date_time as start_date_time",
        "me.end_date_time as end_date_time",
        "mm.monitor_impact",
      )
      .innerJoin("maintenance_monitors as mm", "me.maintenance_id", "mm.maintenance_id")
      .innerJoin("maintenances as m", "me.maintenance_id", "m.id")
      .where("mm.monitor_tag", monitor_tag)
      .andWhere("me.start_date_time", "<=", timestamp)
      .andWhere("me.end_date_time", ">=", timestamp)
      .whereIn("me.status", ["SCHEDULED", "READY", "ONGOING"])
      .andWhere("m.status", "ACTIVE");
  }

  async updateMaintenanceEvent(id: number, data: Partial<MaintenanceEventRecordInsert>): Promise<number> {
    return await this.knex("maintenances_events")
      .where("id", id)
      .update({
        ...data,
        updated_at: this.knex.fn.now(),
      });
  }

  async updateMaintenanceEventStatus(id: number, status: string): Promise<number> {
    return await this.knex("maintenances_events").where("id", id).update({
      status,
      updated_at: this.knex.fn.now(),
    });
  }

  /**
   * Get SCHEDULED maintenance events that are about to start within the next N seconds
   * These should be marked as READY
   */
  async getScheduledEventsStartingSoon(
    currentTimestamp: number,
    withinSeconds: number,
  ): Promise<MaintenanceEventRecord[]> {
    const futureTimestamp = currentTimestamp + withinSeconds;
    return await this.knex("maintenances_events")
      .join("maintenances", "maintenances_events.maintenance_id", "maintenances.id")
      .where("maintenances_events.status", "SCHEDULED")
      .andWhere("maintenances.status", "ACTIVE")
      .andWhere("maintenances_events.start_date_time", ">", currentTimestamp)
      .andWhere("maintenances_events.start_date_time", "<=", futureTimestamp)
      .select("maintenances_events.*");
  }

  /**
   * Get READY maintenance events where current timestamp falls within start and end
   * These should be marked as ONGOING
   */
  async getReadyEventsInProgress(currentTimestamp: number): Promise<MaintenanceEventRecord[]> {
    return await this.knex("maintenances_events")
      .join("maintenances", "maintenances_events.maintenance_id", "maintenances.id")
      .where("maintenances_events.status", "READY")
      .andWhere("maintenances.status", "ACTIVE")
      .andWhere("maintenances_events.start_date_time", "<=", currentTimestamp)
      .andWhere("maintenances_events.end_date_time", ">=", currentTimestamp)
      .select("maintenances_events.*");
  }

  /**
   * Get ONGOING maintenance events where end_date_time has passed
   * These should be marked as COMPLETED
   */
  async getOngoingEventsCompleted(currentTimestamp: number): Promise<MaintenanceEventRecord[]> {
    return await this.knex("maintenances_events")
      .where("status", "ONGOING")
      .andWhere("end_date_time", "<", currentTimestamp)
      .select("*");
  }

  async deleteMaintenanceEvent(id: number): Promise<number> {
    return await this.knex("maintenances_events").where("id", id).del();
  }

  async getOngoingMaintenanceEventsByMonitorTags(
    timestamp: number,
    monitorTags: string[],
  ): Promise<MaintenanceEventRecordDetailed[]> {
    return await this.knex("maintenances_events")
      .distinct("maintenances_events.*", "maintenances.title", "maintenances.description")
      .join("maintenances", "maintenances_events.maintenance_id", "maintenances.id")
      .join("maintenance_monitors", "maintenances_events.maintenance_id", "maintenance_monitors.maintenance_id")
      .whereIn("maintenance_monitors.monitor_tag", monitorTags)
      .andWhere("maintenances.status", "ACTIVE")
      .whereIn("maintenances_events.status", ["SCHEDULED", "ONGOING"])
      .andWhere("maintenances_events.start_date_time", "<=", timestamp)
      .andWhere("maintenances_events.end_date_time", ">=", timestamp)
      .orderBy("maintenances_events.start_date_time", "desc");
  }

  async getUpcomingMaintenanceEventsByMonitorTags(
    currentTimestamp: number,
    futureTimestamp: number,
    monitorTags: string[],
  ): Promise<MaintenanceEventRecordDetailed[]> {
    return await this.knex("maintenances_events")
      .distinct("maintenances_events.*", "maintenances.title", "maintenances.description")
      .join("maintenances", "maintenances_events.maintenance_id", "maintenances.id")
      .join("maintenance_monitors", "maintenances_events.maintenance_id", "maintenance_monitors.maintenance_id")
      .whereIn("maintenance_monitors.monitor_tag", monitorTags)
      .andWhere("maintenances.status", "ACTIVE")
      .andWhere("maintenances_events.status", "SCHEDULED")
      .andWhere("maintenances_events.start_date_time", ">", currentTimestamp)
      .andWhere("maintenances_events.start_date_time", "<=", futureTimestamp)
      .orderBy("maintenances_events.start_date_time", "asc");
  }

  // ============ Maintenance Events for Monitor List ============

  /**
   * Get ongoing maintenance events for a list of monitors
   * Returns maintenance events that are currently in progress
   * Includes both SCHEDULED and ONGOING statuses since a scheduled event
   * that has started should be considered ongoing
   */
  async getOngoingMaintenanceEventsForMonitorList(
    timestamp: number,
    monitorTags: string[],
  ): Promise<MaintenanceEventsMonitorList[]> {
    return await this.knex("maintenances_events")
      .select(
        "maintenances_events.id",
        "maintenances.title",
        "maintenances.description",
        "maintenances_events.start_date_time",
        "maintenances_events.end_date_time",
        "maintenance_monitors.monitor_tag",
        "maintenances_events.created_at",
        "maintenances_events.updated_at",
      )
      .join("maintenances", "maintenances_events.maintenance_id", "maintenances.id")
      .join("maintenance_monitors", "maintenances_events.maintenance_id", "maintenance_monitors.maintenance_id")
      .whereIn("maintenance_monitors.monitor_tag", monitorTags)
      .andWhere("maintenances.status", "ACTIVE")
      .whereIn("maintenances_events.status", ["SCHEDULED", "ONGOING"])
      .andWhere("maintenances_events.start_date_time", "<=", timestamp)
      .andWhere("maintenances_events.end_date_time", ">=", timestamp)
      .orderBy("maintenances_events.start_date_time", "desc");
  }

  /**
   * Get past/completed maintenance events for a list of monitors
   * Returns maintenance events that ended within the specified days
   */
  async getPastMaintenanceEventsForMonitorList(
    timestamp: number,
    monitorTags: string[],
    limit: number,
    daysInPast: number,
  ): Promise<MaintenanceEventsMonitorList[]> {
    const pastTimestamp = timestamp - daysInPast * 24 * 60 * 60;
    return await this.knex("maintenances_events")
      .select(
        "maintenances_events.id",
        "maintenances.title",
        "maintenances.description",
        "maintenances_events.start_date_time",
        "maintenances_events.end_date_time",
        "maintenance_monitors.monitor_tag",
        "maintenances_events.created_at",
        "maintenances_events.updated_at",
      )
      .join("maintenances", "maintenances_events.maintenance_id", "maintenances.id")
      .join("maintenance_monitors", "maintenances_events.maintenance_id", "maintenance_monitors.maintenance_id")
      .whereIn("maintenance_monitors.monitor_tag", monitorTags)
      .andWhere("maintenances_events.end_date_time", "<", timestamp)
      .andWhere("maintenances_events.end_date_time", ">=", pastTimestamp)
      .orderBy("maintenances_events.end_date_time", "desc")
      .limit(limit);
  }

  /**
   * Get upcoming maintenance events for a list of monitors
   * Returns scheduled maintenance events within the specified days
   */
  async getUpcomingMaintenanceEventsForMonitorList(
    timestamp: number,
    monitorTags: string[],
    limit: number,
    daysInFuture: number,
  ): Promise<MaintenanceEventsMonitorList[]> {
    const futureTimestamp = timestamp + daysInFuture * 24 * 60 * 60;
    return await this.knex("maintenances_events")
      .select(
        "maintenances_events.id",
        "maintenances.title",
        "maintenances.description",
        "maintenances_events.start_date_time",
        "maintenances_events.end_date_time",
        "maintenance_monitors.monitor_tag",
        "maintenances_events.created_at",
        "maintenances_events.updated_at",
      )
      .join("maintenances", "maintenances_events.maintenance_id", "maintenances.id")
      .join("maintenance_monitors", "maintenances_events.maintenance_id", "maintenance_monitors.maintenance_id")
      .whereIn("maintenance_monitors.monitor_tag", monitorTags)
      .andWhere("maintenances.status", "ACTIVE")
      .andWhere("maintenances_events.status", "SCHEDULED")
      .andWhere("maintenances_events.start_date_time", ">", timestamp)
      .andWhere("maintenances_events.start_date_time", "<=", futureTimestamp)
      .orderBy("maintenances_events.start_date_time", "asc")
      .limit(limit);
  }

  /**
   * Get maintenance events within a date range for the events page
   * Returns maintenance events that started within the given date range
   * Includes all maintenances, but filters out hidden monitors from monitors array
   */
  async getMaintenanceEventsForEventsByDateRange(
    startTs: number,
    endTs: number,
  ): Promise<MaintenanceEventsMonitorList[]> {
    const rows = await this.knex("maintenances_events")
      .select(
        "maintenances_events.id",
        "maintenances.title",
        "maintenances.description",
        "maintenances_events.start_date_time",
        "maintenances_events.end_date_time",
        "maintenance_monitors.monitor_tag",
        "maintenance_monitors.monitor_impact",
        "monitors.name as monitor_name",
        "monitors.image as monitor_image",
        "monitors.is_hidden as monitor_is_hidden",
        "maintenances_events.created_at",
        "maintenances_events.updated_at",
      )
      .join("maintenances", "maintenances_events.maintenance_id", "maintenances.id")
      .leftJoin("maintenance_monitors", "maintenances_events.maintenance_id", "maintenance_monitors.maintenance_id")
      .leftJoin("monitors", "maintenance_monitors.monitor_tag", "monitors.tag")
      .andWhere("maintenances_events.start_date_time", ">=", startTs)
      .andWhere("maintenances_events.start_date_time", "<=", endTs)
      .orderBy("maintenances_events.start_date_time", "desc");

    return this.groupMaintenancesByIdForMonitorList(rows);
  }

  async getMaintenanceEventsForEventsByDateRangeMonitor(
    startTs: number,
    endTs: number,
    monitorTag: string,
  ): Promise<MaintenanceEventsMonitorList[]> {
    const rows = await this.knex("maintenances_events")
      .select(
        "maintenances_events.id",
        "maintenances.title",
        "maintenances.description",
        "maintenances_events.start_date_time",
        "maintenances_events.end_date_time",
        "maintenance_monitors.monitor_tag",
        "maintenance_monitors.monitor_impact",
        "monitors.name as monitor_name",
        "monitors.image as monitor_image",
        "monitors.is_hidden as monitor_is_hidden",
        "maintenances_events.created_at",
        "maintenances_events.updated_at",
      )
      .join("maintenances", "maintenances_events.maintenance_id", "maintenances.id")
      .leftJoin("maintenance_monitors", "maintenances_events.maintenance_id", "maintenance_monitors.maintenance_id")
      .leftJoin("monitors", "maintenance_monitors.monitor_tag", "monitors.tag")
      .andWhere("maintenances_events.start_date_time", ">=", startTs)
      .andWhere("maintenances_events.start_date_time", "<=", endTs)
      .andWhere("maintenance_monitors.monitor_tag", monitorTag)
      .orderBy("maintenances_events.start_date_time", "desc");

    return this.groupMaintenancesByIdForMonitorList(rows);
  }

  /**
   * Group raw maintenance rows by maintenance event ID, aggregating monitors into an array
   * Filters out hidden monitors
   */
  private groupMaintenancesByIdForMonitorList(rows: any[]): MaintenanceEventsMonitorList[] {
    const maintenanceMap = new Map<number, MaintenanceEventsMonitorList>();

    for (const row of rows) {
      if (!maintenanceMap.has(row.id)) {
        maintenanceMap.set(row.id, {
          id: row.id,
          title: row.title,
          description: row.description,
          start_date_time: row.start_date_time,
          end_date_time: row.end_date_time,
          created_at: row.created_at,
          updated_at: row.updated_at,
          monitors: [],
        });
      }

      const maintenance = maintenanceMap.get(row.id)!;
      // Only add monitor if it exists and is not hidden
      if (row.monitor_tag && row.monitor_is_hidden !== "YES") {
        maintenance.monitors.push({
          monitor_tag: row.monitor_tag,
          monitor_name: row.monitor_name,
          monitor_image: row.monitor_image,
          monitor_impact: row.monitor_impact,
        });
      }
    }

    return Array.from(maintenanceMap.values());
  }
}

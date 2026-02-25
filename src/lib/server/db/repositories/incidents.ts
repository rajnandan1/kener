import { BaseRepository, type IncidentFilter, type CountResult } from "./base.js";
import { GetDbType } from "../../tool.js";
import GC from "../../../global-constants.js";
import type {
  IncidentRecord,
  IncidentRecordInsert,
  IncidentMonitorRecordInsert,
  IncidentMonitorRecord,
  IncidentMonitorDetailRecord,
  IncidentCommentRecord,
  IncidentForMonitorList,
  IncidentForMonitorListWithComments,
  IncidentMonitorImpact,
} from "../../types/db.js";

// Raw row type from DB query before grouping
interface IncidentRowWithMonitor {
  id: number;
  title: string;
  start_date_time: number;
  end_date_time: number | null;
  created_at: Date;
  updated_at: Date;
  status: string;
  state: string;
  monitor_impact: string;
  monitor_tag: string;
  monitor_name: string;
  monitor_image: string | null;
}

/**
 * Repository for incidents, incident monitors, and incident comments operations
 */
export class IncidentsRepository extends BaseRepository {
  // ============ Helper Functions ============

  /**
   * Group raw incident rows by incident ID, aggregating monitors into an array
   */
  private groupIncidentsByIdForMonitorList(rows: IncidentRowWithMonitor[]): IncidentForMonitorList[] {
    const incidentMap = new Map<number, IncidentForMonitorList>();

    for (const row of rows) {
      if (!incidentMap.has(row.id)) {
        incidentMap.set(row.id, {
          id: row.id,
          title: row.title,
          start_date_time: row.start_date_time,
          end_date_time: row.end_date_time,
          created_at: row.created_at,
          updated_at: row.updated_at,
          status: row.status,
          state: row.state,
          monitors: [],
        });
      }

      const incident = incidentMap.get(row.id)!;
      // Only add monitor if it exists (handles LEFT JOIN nulls)
      if (row.monitor_tag) {
        incident.monitors.push({
          monitor_tag: row.monitor_tag,
          monitor_impact: row.monitor_impact,
          monitor_name: row.monitor_name,
          monitor_image: row.monitor_image,
        });
      }
    }

    return Array.from(incidentMap.values());
  }

  // ============ Incidents ============

  async getIncidentsPaginated(
    page: number,
    limit: number,
    filter: IncidentFilter | null,
    direction: "after" | "before" = "after",
  ): Promise<IncidentRecord[]> {
    let query = this.knex("incidents").select("*").whereRaw("1=1");
    if (filter && filter.status) {
      query = query.andWhere("status", filter.status);
    }
    if (filter && filter.start && direction === "after") {
      query = query.andWhere("start_date_time", ">=", filter.start);
    }
    if (filter && filter.start && direction === "before") {
      query = query.andWhere("start_date_time", "<=", filter.start);
    }
    if (filter && filter.end && direction === "after") {
      query = query.andWhere("start_date_time", "<=", filter.end);
    }
    if (filter && filter.end && direction === "before") {
      query = query.andWhere("start_date_time", ">=", filter.end);
    }
    if (filter && filter.state) {
      query = query.andWhere("state", filter.state);
    }
    if (filter && filter.id) {
      query = query.andWhere("id", filter.id);
    }
    if (filter && filter.incident_type) {
      query = query.andWhere("incident_type", filter.incident_type);
    }
    if (filter && filter.incident_source) {
      query = query.andWhere("incident_source", filter.incident_source);
    }
    if (direction === "after") {
      query = query
        .orderBy("id", "desc")
        .limit(limit)
        .offset((page - 1) * limit);
    } else {
      query = query
        .orderBy("id", "asc")
        .limit(limit)
        .offset((page - 1) * limit);
    }
    return await query;
  }

  async createIncident(data: IncidentRecordInsert): Promise<IncidentRecord> {
    const dbType = GetDbType();

    const insertData = {
      title: data.title,
      start_date_time: data.start_date_time,
      end_date_time: data.end_date_time,
      status: data.status,
      state: data.state,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
      incident_type: data.incident_type,
      incident_source: data.incident_source,
      is_global: data.is_global || "YES",
    };

    if (dbType === "postgresql") {
      const [incident] = await this.knex("incidents").insert(insertData).returning("*");
      return incident;
    } else {
      const result = await this.knex("incidents").insert(insertData);
      const id = result[0];
      const incident = await this.knex("incidents").where("id", id).first();
      return incident;
    }
  }

  async getIncidentsPaginatedDesc(
    page: number,
    limit: number,
    filter: IncidentFilter | null,
  ): Promise<IncidentRecord[]> {
    let query = this.knex("incidents").select("*").whereRaw("1=1");

    if (filter && filter.status) {
      query = query.andWhere("status", filter.status);
    }
    if (filter && filter.start) {
      query = query.andWhere("start_date_time", ">=", filter.start);
    }
    if (filter && filter.end) {
      query = query.andWhere("start_date_time", "<=", filter.end);
    }
    if (filter && filter.state) {
      query = query.andWhere("state", filter.state);
    }
    if (filter && filter.id) {
      query = query.andWhere("id", filter.id);
    }

    query = query
      .orderBy("id", "desc")
      .limit(limit)
      .offset((page - 1) * limit);

    return await query;
  }

  async getRecentUpdatedIncidents(limit: number, start: number, end: number): Promise<IncidentRecord[]> {
    return await this.knex("incidents")
      .where("status", "OPEN")
      .andWhere("start_date_time", ">=", start)
      .andWhere("start_date_time", "<=", end)
      .orderBy("updated_at", "desc")
      .limit(limit);
  }

  async getPreviousIncidentId(start_date_time: number): Promise<{ id: number } | undefined> {
    return await this.knex("incidents")
      .select("id")
      .where("start_date_time", "<", start_date_time)
      .orderBy("start_date_time", "desc")
      .first();
  }

  async getIncidentsBetween(start: number, end: number): Promise<IncidentRecord[]> {
    return await this.knex("incidents")
      .where("status", "OPEN")
      .andWhere("start_date_time", ">=", start)
      .andWhere("start_date_time", "<=", end)
      .orderBy("start_date_time", "asc");
  }

  async getIncidentsCount(filter: { status?: string } | null): Promise<CountResult | undefined> {
    let query = this.knex("incidents").count("* as count");
    if (filter && filter.status) {
      query = query.where("status", filter.status);
    }
    return await query.first<CountResult>();
  }

  async getIncidentsCountByTypeAndDateRange(
    incident_type: string,
    start_date: number,
    end_date: number,
  ): Promise<CountResult | undefined> {
    return await this.knex("incidents")
      .count("* as count")
      .where("incident_type", incident_type)
      .andWhere("start_date_time", ">=", start_date)
      .andWhere("start_date_time", "<=", end_date)
      .first<CountResult>();
  }

  async updateIncident(data: IncidentRecord): Promise<number> {
    return await this.knex("incidents").where({ id: data.id }).update({
      title: data.title,
      start_date_time: data.start_date_time,
      end_date_time: data.end_date_time,
      status: data.status,
      state: data.state,
      is_global: data.is_global,
      updated_at: this.knex.fn.now(),
    });
  }

  async deleteIncident(id: number): Promise<number> {
    return await this.knex("incidents").where({ id }).delete();
  }

  async setIncidentEndTimeToNull(id: number): Promise<number> {
    return await this.knex("incidents").where({ id }).update({
      end_date_time: null,
      updated_at: this.knex.fn.now(),
    });
  }

  async getIncidentById(id: number): Promise<Omit<IncidentRecord, "incident_source"> | undefined> {
    return await this.knex("incidents")
      .select(
        "id",
        "title",
        "start_date_time",
        "end_date_time",
        "created_at",
        "updated_at",
        "status",
        "state",
        "incident_type",
        "is_global",
      )
      .where("id", id)
      .first();
  }

  async getIncidentsByIds(ids: number[]): Promise<IncidentRecord[]> {
    return await this.knex("incidents").whereIn("id", ids).andWhere("status", "OPEN");
  }

  async getIncidentsByMonitorTag(
    monitor_tag: string,
    start: number,
    end: number,
  ): Promise<Array<IncidentRecord & { monitor_impact: string | null }>> {
    return await this.knex("incidents as i")
      .select(
        "i.id as id",
        "i.title as title",
        "i.start_date_time as start_date_time",
        "i.end_date_time as end_date_time",
        "i.created_at as created_at",
        "i.updated_at as updated_at",
        "i.status as status",
        "i.state as state",
        "i.incident_type as incident_type",
        "im.monitor_impact",
      )
      .innerJoin("incident_monitors as im", "i.id", "im.incident_id")
      .where("im.monitor_tag", monitor_tag)
      .andWhere("i.start_date_time", ">=", start)
      .andWhere("i.start_date_time", "<=", end)
      .andWhere("i.status", "OPEN");
  }

  async getIncidentsByMonitorTagRealtime(
    monitor_tag: string,
    timestamp: number,
  ): Promise<
    Array<{ id: number; start_date_time: number; end_date_time: number | null; monitor_impact: string | null }>
  > {
    return await this.knex("incidents as i")
      .select(
        "i.id as id",
        "i.start_date_time as start_date_time",
        "i.end_date_time as end_date_time",
        "im.monitor_impact",
      )
      .innerJoin("incident_monitors as im", "i.id", "im.incident_id")
      .where("im.monitor_tag", monitor_tag)
      .andWhere("i.start_date_time", "<=", timestamp)
      .andWhere("i.status", "OPEN")
      .andWhere("i.incident_type", "INCIDENT")
      .andWhere("i.state", "!=", "RESOLVED")
      .andWhere("i.incident_source", "!=", "ALERT");
  }

  async getMaintenanceByMonitorTagRealtime(
    monitor_tag: string,
    timestamp: number,
  ): Promise<
    Array<{ id: number; start_date_time: number; end_date_time: number | null; monitor_impact: string | null }>
  > {
    return await this.knex("incidents as i")
      .select(
        "i.id as id",
        "i.start_date_time as start_date_time",
        "i.end_date_time as end_date_time",
        "im.monitor_impact",
      )
      .innerJoin("incident_monitors as im", "i.id", "im.incident_id")
      .where("im.monitor_tag", monitor_tag)
      .andWhere("i.start_date_time", "<=", timestamp)
      .andWhere("i.end_date_time", ">=", timestamp)
      .andWhere("i.status", "OPEN")
      .andWhere("i.incident_type", "MAINTENANCE")
      .andWhere("i.state", "=", "RESOLVED")
      .andWhere("i.incident_source", "!=", "ALERT");
  }

  // Status-related queries
  async getOngoingMaintenances(timestamp: number): Promise<IncidentRecord[]> {
    return await this.knex("incidents")
      .where("incident_type", "MAINTENANCE")
      .andWhere("status", "OPEN")
      .andWhere("start_date_time", "<=", timestamp)
      .andWhere(function () {
        this.whereNull("end_date_time").orWhere("end_date_time", ">=", timestamp);
      })
      .orderBy("start_date_time", "desc");
  }

  async getUpcomingMaintenances(currentTimestamp: number, futureTimestamp: number): Promise<IncidentRecord[]> {
    return await this.knex("incidents")
      .where("incident_type", "MAINTENANCE")
      .andWhere("status", "OPEN")
      .andWhere("start_date_time", ">", currentTimestamp)
      .andWhere("start_date_time", "<=", futureTimestamp)
      .orderBy("start_date_time", "asc");
  }

  async getLastMaintenance(): Promise<IncidentRecord | undefined> {
    return await this.knex("incidents")
      .where("incident_type", "MAINTENANCE")
      .andWhere("status", "OPEN")
      .orderBy("start_date_time", "desc")
      .first();
  }

  async getOngoingIncidents(timestamp: number): Promise<IncidentRecord[]> {
    return await this.knex("incidents")
      .where("incident_type", "INCIDENT")
      .andWhere("status", "OPEN")
      .andWhere("start_date_time", "<=", timestamp)
      .andWhere(function () {
        this.whereNull("end_date_time").orWhere("end_date_time", ">=", timestamp);
      })
      .orderBy("start_date_time", "desc");
  }

  async getLastIncident(): Promise<IncidentRecord | undefined> {
    return await this.knex("incidents")
      .where("incident_type", "INCIDENT")
      .andWhere("status", "OPEN")
      .orderBy("start_date_time", "desc")
      .first();
  }

  async getOngoingMaintenancesByMonitorTags(timestamp: number, monitorTags: string[]): Promise<IncidentRecord[]> {
    return await this.knex("incidents")
      .distinct("incidents.*")
      .join("incident_monitors", "incidents.id", "incident_monitors.incident_id")
      .whereIn("incident_monitors.monitor_tag", monitorTags)
      .andWhere("incidents.incident_type", "MAINTENANCE")
      .andWhere("incidents.status", "OPEN")
      .andWhere("incidents.start_date_time", "<=", timestamp)
      .andWhere(function () {
        this.whereNull("incidents.end_date_time").orWhere("incidents.end_date_time", ">=", timestamp);
      })
      .orderBy("incidents.start_date_time", "desc");
  }

  async getUpcomingMaintenancesByMonitorTags(
    currentTimestamp: number,
    futureTimestamp: number,
    monitorTags: string[],
  ): Promise<IncidentRecord[]> {
    return await this.knex("incidents")
      .distinct("incidents.*")
      .join("incident_monitors", "incidents.id", "incident_monitors.incident_id")
      .whereIn("incident_monitors.monitor_tag", monitorTags)
      .andWhere("incidents.incident_type", "MAINTENANCE")
      .andWhere("incidents.status", "OPEN")
      .andWhere("incidents.start_date_time", ">", currentTimestamp)
      .andWhere("incidents.start_date_time", "<=", futureTimestamp)
      .orderBy("incidents.start_date_time", "asc");
  }

  async getLastMaintenanceByMonitorTags(monitorTags: string[]): Promise<IncidentRecord | undefined> {
    return await this.knex("incidents")
      .distinct("incidents.*")
      .join("incident_monitors", "incidents.id", "incident_monitors.incident_id")
      .whereIn("incident_monitors.monitor_tag", monitorTags)
      .andWhere("incidents.incident_type", "MAINTENANCE")
      .andWhere("incidents.status", "OPEN")
      .orderBy("incidents.start_date_time", "desc")
      .first();
  }

  async getOngoingIncidentsByMonitorTags(
    timestamp: number,
    monitorTags: string[],
    incidentType: string,
  ): Promise<IncidentRecord[]> {
    return await this.knex("incidents")
      .distinct("incidents.*")
      .join("incident_monitors", "incidents.id", "incident_monitors.incident_id")
      .whereIn("incident_monitors.monitor_tag", monitorTags)
      .andWhere("incidents.incident_type", incidentType)
      .andWhere("incidents.state", "!=", GC.RESOLVED)
      .andWhere("incidents.start_date_time", "<=", timestamp)
      .andWhere(function () {
        this.whereNull("incidents.end_date_time").orWhere("incidents.end_date_time", ">=", timestamp);
      })
      .orderBy("incidents.start_date_time", "desc");
  }

  async getOngoingIncidentsForMonitorList(timestamp: number, monitorTags: string[]): Promise<IncidentForMonitorList[]> {
    const rows = await this.knex("incidents")
      .select(
        "incidents.id",
        "incidents.title",
        "incidents.start_date_time",
        "incidents.end_date_time",
        "incidents.created_at",
        "incidents.updated_at",
        "incidents.status",
        "incidents.state",
        "incident_monitors.monitor_impact",
        "incident_monitors.monitor_tag",
        "monitors.name as monitor_name",
        "monitors.image as monitor_image",
      )
      .leftJoin("incident_monitors", "incidents.id", "incident_monitors.incident_id")
      .leftJoin("monitors", "incident_monitors.monitor_tag", "monitors.tag")
      .where(function () {
        this.whereIn("incident_monitors.monitor_tag", monitorTags).orWhere("incidents.is_global", "YES");
      })
      .andWhere("incidents.state", "!=", GC.RESOLVED)
      .andWhere("incidents.incident_type", GC.INCIDENT)
      .andWhere("incidents.start_date_time", "<=", timestamp)
      .andWhere(function () {
        this.whereNull("incidents.end_date_time").orWhere("incidents.end_date_time", ">=", timestamp);
      })
      .orderBy("incidents.start_date_time", "desc");

    return this.groupIncidentsByIdForMonitorList(rows);
  }

  async geAllGlobalOngoingIncidents(timestamp: number, tags?: string[]): Promise<IncidentForMonitorList[]> {
    const query = this.knex("incidents")
      .select(
        "incidents.id",
        "incidents.title",
        "incidents.start_date_time",
        "incidents.end_date_time",
        "incidents.created_at",
        "incidents.updated_at",
        "incidents.status",
        "incidents.state",
        "incident_monitors.monitor_impact",
        "incident_monitors.monitor_tag",
        "monitors.name as monitor_name",
        "monitors.image as monitor_image",
      )
      .leftJoin("incident_monitors", "incidents.id", "incident_monitors.incident_id")
      .leftJoin("monitors", "incident_monitors.monitor_tag", "monitors.tag");

    if (tags && tags.length > 0) {
      query.where(function () {
        this.whereIn("incident_monitors.monitor_tag", tags);
      });
    } else {
      query.where("incidents.is_global", "YES");
    }

    const rows = await query
      .andWhere("monitors.is_hidden", "NO")
      .andWhere("incidents.state", "!=", GC.RESOLVED)
      .andWhere("incidents.incident_type", GC.INCIDENT)
      .andWhere("incidents.start_date_time", "<=", timestamp)
      .andWhere(function () {
        this.whereNull("incidents.end_date_time").orWhere("incidents.end_date_time", ">=", timestamp);
      })
      .orderBy("incidents.start_date_time", "desc");

    return this.groupIncidentsByIdForMonitorList(rows);
  }

  async getOngoingIncidentsForMonitorListWithComments(
    timestamp: number,
    monitorTags: string[],
  ): Promise<IncidentForMonitorListWithComments[]> {
    const incidents = await this.getOngoingIncidentsForMonitorList(timestamp, monitorTags);

    if (incidents.length === 0) {
      return [];
    }

    const incidentIds = incidents.map((incident) => incident.id);
    const comments = await this.knex("incident_comments")
      .select("*")
      .whereIn("incident_id", incidentIds)
      .andWhere("status", "ACTIVE")
      .orderBy("commented_at", "desc")
      .orderBy("id", "desc");

    const commentsByIncidentId = new Map<number, IncidentCommentRecord[]>();
    for (const comment of comments) {
      const existing = commentsByIncidentId.get(comment.incident_id) || [];
      existing.push(comment);
      commentsByIncidentId.set(comment.incident_id, existing);
    }

    return incidents.map((incident) => ({
      ...incident,
      comments: commentsByIncidentId.get(incident.id) || [],
    }));
  }
  async getAllGlobalOngoingIncidentsWithComments(
    timestamp: number,
    tags?: string[],
  ): Promise<IncidentForMonitorListWithComments[]> {
    const incidents = await this.geAllGlobalOngoingIncidents(timestamp, tags);

    if (incidents.length === 0) {
      return [];
    }

    const incidentIds = incidents.map((incident) => incident.id);
    const comments = await this.knex("incident_comments")
      .select("*")
      .whereIn("incident_id", incidentIds)
      .andWhere("status", "ACTIVE")
      .orderBy("commented_at", "desc")
      .orderBy("id", "desc");

    const commentsByIncidentId = new Map<number, IncidentCommentRecord[]>();
    for (const comment of comments) {
      const existing = commentsByIncidentId.get(comment.incident_id) || [];
      existing.push(comment);
      commentsByIncidentId.set(comment.incident_id, existing);
    }

    return incidents.map((incident) => ({
      ...incident,
      comments: commentsByIncidentId.get(incident.id) || [],
    }));
  }

  async getResolvedIncidentsForMonitorList(
    timestamp: number,
    monitorTags: string[],
    limit: number,
    daysInPast: number,
  ): Promise<IncidentForMonitorList[]> {
    const pastTimestamp = timestamp - daysInPast * 24 * 60 * 60;

    // First get distinct incident IDs with limit
    const incidentIds = await this.knex("incidents")
      .distinct("incidents.id")
      .leftJoin("incident_monitors", "incidents.id", "incident_monitors.incident_id")
      .where(function () {
        this.whereIn("incident_monitors.monitor_tag", monitorTags).orWhere("incidents.is_global", "YES");
      })
      .andWhere("incidents.state", GC.RESOLVED)
      .andWhere("incidents.incident_type", GC.INCIDENT)
      .andWhere("incidents.end_date_time", ">=", pastTimestamp)
      .andWhere("incidents.end_date_time", "<=", timestamp)
      .orderBy("incidents.id", "desc")
      .limit(limit)
      .pluck("incidents.id");

    if (incidentIds.length === 0) {
      return [];
    }

    const rows = await this.knex("incidents")
      .select(
        "incidents.id",
        "incidents.title",
        "incidents.start_date_time",
        "incidents.end_date_time",
        "incidents.created_at",
        "incidents.updated_at",
        "incidents.status",
        "incidents.state",
        "incident_monitors.monitor_impact",
        "incident_monitors.monitor_tag",
        "monitors.name as monitor_name",
        "monitors.image as monitor_image",
      )
      .leftJoin("incident_monitors", "incidents.id", "incident_monitors.incident_id")
      .leftJoin("monitors", "incident_monitors.monitor_tag", "monitors.tag")
      .whereIn("incidents.id", incidentIds)
      .orderBy("incidents.end_date_time", "desc");

    return this.groupIncidentsByIdForMonitorList(rows);
  }

  async getResolvedIncidentsForMonitorListWithComments(
    timestamp: number,
    monitorTags: string[],
    limit: number,
    daysInPast: number,
  ): Promise<IncidentForMonitorListWithComments[]> {
    const incidents = await this.getResolvedIncidentsForMonitorList(timestamp, monitorTags, limit, daysInPast);

    if (incidents.length === 0) {
      return [];
    }

    const incidentIds = incidents.map((incident) => incident.id);
    const comments = await this.knex("incident_comments")
      .select("*")
      .whereIn("incident_id", incidentIds)
      .andWhere("status", "ACTIVE")
      .orderBy("commented_at", "desc")
      .orderBy("id", "desc");

    const commentsByIncidentId = new Map<number, IncidentCommentRecord[]>();
    for (const comment of comments) {
      const existing = commentsByIncidentId.get(comment.incident_id) || [];
      existing.push(comment);
      commentsByIncidentId.set(comment.incident_id, existing);
    }
    return incidents.map((incident) => ({
      ...incident,
      comments: commentsByIncidentId.get(incident.id) || [],
    }));
  }

  async getLastIncidentByMonitorTags(monitorTags: string[]): Promise<IncidentRecord | undefined> {
    return await this.knex("incidents")
      .distinct("incidents.*")
      .join("incident_monitors", "incidents.id", "incident_monitors.incident_id")
      .whereIn("incident_monitors.monitor_tag", monitorTags)
      .andWhere("incidents.incident_type", "INCIDENT")
      .andWhere("incidents.status", "OPEN")
      .orderBy("incidents.start_date_time", "desc")
      .first();
  }

  async getIncidentsCountByTypeAndDateRangeAndMonitorTags(
    incident_type: string,
    start_date: number,
    end_date: number,
    monitorTags: string[],
  ): Promise<CountResult | undefined> {
    return await this.knex("incidents")
      .countDistinct("incidents.id as count")
      .join("incident_monitors", "incidents.id", "incident_monitors.incident_id")
      .whereIn("incident_monitors.monitor_tag", monitorTags)
      .andWhere("incidents.incident_type", incident_type)
      .andWhere("incidents.start_date_time", ">=", start_date)
      .andWhere("incidents.start_date_time", "<=", end_date)
      .first<CountResult>();
  }

  // ============ Incident Monitors ============

  async insertIncidentMonitor(data: IncidentMonitorRecordInsert): Promise<number[]> {
    return await this.knex("incident_monitors").insert({
      monitor_tag: data.monitor_tag,
      monitor_impact: data.monitor_impact,
      incident_id: data.incident_id,
    });
  }

  async getIncidentMonitorsByIncidentID(
    incident_id: number,
  ): Promise<Array<{ monitor_tag: string; monitor_impact: string | null }>> {
    return await this.knex("incident_monitors")
      .select("monitor_tag", "monitor_impact")
      .where("incident_id", incident_id);
  }

  async getIncidentMonitors(filter?: { incident_id?: number; monitor_tag?: string }): Promise<IncidentMonitorRecord[]> {
    let query = this.knex("incident_monitors").select("*");

    if (filter?.incident_id) {
      query = query.where("incident_id", filter.incident_id);
    }

    if (filter?.monitor_tag) {
      query = query.where("monitor_tag", filter.monitor_tag);
    }

    return await query;
  }

  async getMonitorsByIncidentId(incident_id: number): Promise<IncidentMonitorDetailRecord[]> {
    return await this.knex("incident_monitors")
      .join("monitors", "incident_monitors.monitor_tag", "monitors.tag")
      .where("incident_monitors.incident_id", incident_id)
      .select(
        "incident_monitors.*",
        "monitors.name as monitor_name",
        "monitors.image as monitor_image",
        "monitors.description as monitor_description",
      );
  }

  async removeIncidentMonitor(incident_id: number, monitor_tag: string): Promise<number> {
    return await this.knex("incident_monitors").where({ incident_id, monitor_tag }).del();
  }

  async insertIncidentMonitorWithMerge(data: IncidentMonitorRecordInsert): Promise<number[]> {
    return await this.knex("incident_monitors")
      .insert({
        monitor_tag: data.monitor_tag,
        monitor_impact: data.monitor_impact,
        incident_id: data.incident_id,
      })
      .onConflict(["monitor_tag", "incident_id"])
      .merge({ monitor_impact: data.monitor_impact, updated_at: this.knex.fn.now() });
  }

  async deleteIncidentMonitorsByTag(tag: string): Promise<number> {
    return await this.knex("incident_monitors").where("monitor_tag", tag).del();
  }

  // ============ Incident Comments ============

  async insertIncidentComment(
    incident_id: number,
    comment: string,
    state: string,
    commented_at: number,
  ): Promise<IncidentCommentRecord> {
    const dbType = GetDbType();

    const insertData = {
      comment,
      incident_id,
      state,
      commented_at,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    };

    if (dbType === "postgresql") {
      const [createdComment] = await this.knex("incident_comments").insert(insertData).returning("*");
      return createdComment;
    } else {
      const result = await this.knex("incident_comments").insert(insertData);
      const id = result[0];
      const createdComment = await this.knex("incident_comments").where("id", id).first();
      return createdComment;
    }
  }

  async getIncidentComments(incident_id: number): Promise<IncidentCommentRecord[]> {
    return await this.knex("incident_comments").where("incident_id", incident_id).orderBy("commented_at", "desc");
  }

  async getActiveIncidentComments(incident_id: number): Promise<IncidentCommentRecord[]> {
    return await this.knex("incident_comments")
      .where("incident_id", incident_id)
      .andWhere("status", "ACTIVE")
      .orderBy("commented_at", "desc")
      .orderBy("id", "desc");
  }

  async getIncidentCommentByIDAndIncident(incident_id: number, id: number): Promise<IncidentCommentRecord | undefined> {
    return await this.knex("incident_comments").where({ incident_id, id }).first();
  }

  async updateIncidentCommentByID(id: number, comment: string, state: string, commented_at: number): Promise<number> {
    return await this.knex("incident_comments").where({ id }).update({
      comment,
      state,
      commented_at,
      updated_at: this.knex.fn.now(),
    });
  }

  async updateIncidentCommentStatusByID(id: number, status: string): Promise<number> {
    return await this.knex("incident_comments").where({ id }).update({
      status,
      updated_at: this.knex.fn.now(),
    });
  }

  async getIncidentCommentByID(id: number): Promise<IncidentCommentRecord | undefined> {
    return await this.knex("incident_comments").where({ id }).first();
  }

  /**
   * Get incidents within a date range for the events page
   * Returns incidents that started within the given date range
   * Includes all incidents, but filters out hidden monitors from monitors array
   */
  async getIncidentsForEventsByDateRange(
    startTs: number,
    endTs: number,
    monitorTags?: string[],
  ): Promise<IncidentForMonitorListWithComments[]> {
    const query = this.knex("incidents")
      .select(
        "incidents.id",
        "incidents.title",
        "incidents.start_date_time",
        "incidents.end_date_time",
        "incidents.created_at",
        "incidents.updated_at",
        "incidents.status",
        "incidents.state",
        "incident_monitors.monitor_impact",
        "incident_monitors.monitor_tag",
        "monitors.name as monitor_name",
        "monitors.image as monitor_image",
        "monitors.is_hidden as monitor_is_hidden",
      )
      .leftJoin("incident_monitors", "incidents.id", "incident_monitors.incident_id")
      .leftJoin("monitors", "incident_monitors.monitor_tag", "monitors.tag")
      .where("incidents.incident_type", GC.INCIDENT)
      .andWhere("incidents.status", "OPEN")
      .andWhere("incidents.start_date_time", ">=", startTs)
      .andWhere("incidents.start_date_time", "<=", endTs);

    if (monitorTags) {
      query.andWhere(function () {
        this.whereIn("incident_monitors.monitor_tag", monitorTags).orWhere("incidents.is_global", "YES");
      });
    }

    const rows = await query.orderBy("incidents.start_date_time", "desc");

    const incidents = this.groupIncidentsByIdForMonitorListFilterHidden(rows);

    if (incidents.length === 0) {
      return [];
    }

    const incidentIds = incidents.map((incident) => incident.id);
    const comments = await this.knex("incident_comments")
      .select("*")
      .whereIn("incident_id", incidentIds)
      .andWhere("status", "ACTIVE")
      .orderBy("commented_at", "desc")
      .orderBy("id", "desc");

    const commentsByIncidentId = new Map<number, IncidentCommentRecord[]>();
    for (const comment of comments) {
      const existing = commentsByIncidentId.get(comment.incident_id) || [];
      existing.push(comment);
      commentsByIncidentId.set(comment.incident_id, existing);
    }

    return incidents.map((incident) => ({
      ...incident,
      comments: commentsByIncidentId.get(incident.id) || [],
    }));
  }

  async getIncidentsForEventsByDateRangeMonitor(
    startTs: number,
    endTs: number,
    monitorTag: string,
  ): Promise<IncidentForMonitorListWithComments[]> {
    const rows = await this.knex("incidents")
      .select(
        "incidents.id",
        "incidents.title",
        "incidents.start_date_time",
        "incidents.end_date_time",
        "incidents.created_at",
        "incidents.updated_at",
        "incidents.status",
        "incidents.state",
        "incident_monitors.monitor_impact",
        "incident_monitors.monitor_tag",
        "monitors.name as monitor_name",
        "monitors.image as monitor_image",
        "monitors.is_hidden as monitor_is_hidden",
      )
      .leftJoin("incident_monitors", "incidents.id", "incident_monitors.incident_id")
      .leftJoin("monitors", "incident_monitors.monitor_tag", "monitors.tag")
      .where("incidents.incident_type", GC.INCIDENT)
      .andWhere("incident_monitors.monitor_tag", monitorTag)
      .andWhere("incidents.status", "OPEN")
      .andWhere("incidents.start_date_time", ">=", startTs)
      .andWhere("incidents.start_date_time", "<=", endTs)
      .orderBy("incidents.start_date_time", "desc");

    const incidents = this.groupIncidentsByIdForMonitorListFilterHidden(rows);

    if (incidents.length === 0) {
      return [];
    }

    const incidentIds = incidents.map((incident) => incident.id);
    const comments = await this.knex("incident_comments")
      .select("*")
      .whereIn("incident_id", incidentIds)
      .andWhere("status", "ACTIVE")
      .orderBy("commented_at", "desc")
      .orderBy("id", "desc");

    const commentsByIncidentId = new Map<number, IncidentCommentRecord[]>();
    for (const comment of comments) {
      const existing = commentsByIncidentId.get(comment.incident_id) || [];
      existing.push(comment);
      commentsByIncidentId.set(comment.incident_id, existing);
    }

    return incidents.map((incident) => ({
      ...incident,
      comments: commentsByIncidentId.get(incident.id) || [],
    }));
  }

  /**
   * Group raw incident rows by incident ID, aggregating monitors into an array
   * Filters out hidden monitors
   */
  private groupIncidentsByIdForMonitorListFilterHidden(rows: any[]): IncidentForMonitorList[] {
    const incidentMap = new Map<number, IncidentForMonitorList>();

    for (const row of rows) {
      if (!incidentMap.has(row.id)) {
        incidentMap.set(row.id, {
          id: row.id,
          title: row.title,
          start_date_time: row.start_date_time,
          end_date_time: row.end_date_time,
          created_at: row.created_at,
          updated_at: row.updated_at,
          status: row.status,
          state: row.state,
          monitors: [],
        });
      }

      const incident = incidentMap.get(row.id)!;
      // Only add monitor if it exists and is not hidden
      if (row.monitor_tag && row.monitor_is_hidden !== "YES") {
        incident.monitors.push({
          monitor_tag: row.monitor_tag,
          monitor_impact: row.monitor_impact,
          monitor_name: row.monitor_name,
          monitor_image: row.monitor_image,
        });
      }
    }

    return Array.from(incidentMap.values());
  }
}

import type { Knex as KnexType } from "knex";
import { BaseRepository } from "./base.js";
import GC from "../../../global-constants.js";
import { GetMinuteStartNowTimestampUTC } from "../../tool.js";
import type {
  MonitoringData,
  MonitoringDataInsert,
  AggregatedMonitoringData,
  TimestampStatusCount,
  TimestampStatusCountByMonitor,
} from "../../types/db.js";

/**
 * Repository for monitoring data operations
 */
export class MonitoringRepository extends BaseRepository {
  async insertMonitoringData(data: MonitoringDataInsert): Promise<MonitoringData | null> {
    const { monitor_tag, timestamp, status, latency, type, error_message } = data;

    // Perform insert/update - works across PostgreSQL, MySQL, and SQLite
    await this.knex("monitoring_data")
      .insert({ monitor_tag, timestamp, status, latency, type, error_message })
      .onConflict(["monitor_tag", "timestamp"])
      .merge({ status, latency, type, error_message });

    // Query and return the inserted/updated record (works consistently across all databases)
    const record = await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .where("timestamp", timestamp)
      .first();

    return record as MonitoringData | null;
  }

  async getMonitoringData(monitor_tag: string, start: number, end: number): Promise<MonitoringData[]> {
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .where("timestamp", ">=", start)
      .where("timestamp", "<", end)
      .orderBy("timestamp", "asc");
  }

  // Groups by timestamp and applies priority: DOWN > DEGRADED > UP
  async getMonitoringDataAll(monitor_tags: string[], start: number, end: number): Promise<MonitoringData[]> {
    return await this.knex("monitoring_data")
      .select(
        "timestamp",
        this.knex.raw(`
          CASE 
            WHEN MAX(CASE WHEN status = 'DOWN' THEN 1 ELSE 0 END) = 1 THEN 'DOWN'
            WHEN MAX(CASE WHEN status = 'DEGRADED' THEN 1 ELSE 0 END) = 1 THEN 'DEGRADED'
            ELSE 'UP'
          END as status
        `),
      )
      .whereIn("monitor_tag", monitor_tags)
      .where("timestamp", ">=", start)
      .where("timestamp", "<=", end)
      .whereNotNull("status")
      .groupBy("timestamp")
      .orderBy("timestamp", "asc");
  }

  async getLatestMonitoringData(monitor_tag: string): Promise<MonitoringData | undefined> {
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .orderBy("timestamp", "desc")
      .limit(1)
      .first();
  }

  async getLatestMonitoringDataN(monitor_tag: string, limit: number): Promise<MonitoringData[]> {
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .orderBy("timestamp", "desc")
      .limit(limit);
  }

  async getMonitoringDataPaginated(
    page: number,
    limit: number,
    filter?: { monitor_tag?: string; start_time?: number; end_time?: number },
  ): Promise<MonitoringData[]> {
    let query = this.knex("monitoring_data").select("*");

    if (filter?.monitor_tag) {
      query = query.where("monitor_tag", filter.monitor_tag);
    }

    if (filter?.start_time) {
      query = query.where("timestamp", ">=", filter.start_time);
    }

    if (filter?.end_time) {
      query = query.where("timestamp", "<=", filter.end_time);
    }

    return await query
      .orderBy("timestamp", "desc")
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async getMonitoringDataCount(filter?: {
    monitor_tag?: string;
    start_time?: number;
    end_time?: number;
  }): Promise<{ count: number }> {
    let query = this.knex("monitoring_data").count("* as count");

    if (filter?.monitor_tag) {
      query = query.where("monitor_tag", filter.monitor_tag);
    }

    if (filter?.start_time) {
      query = query.where("timestamp", ">=", filter.start_time);
    }

    if (filter?.end_time) {
      query = query.where("timestamp", "<=", filter.end_time);
    }

    const result = await query.first();
    return { count: Number(result?.count) || 0 };
  }

  async getMonitoringDataAt(monitor_tag: string, timestamp: number): Promise<MonitoringData | undefined> {
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .where("timestamp", timestamp)
      .orderBy("timestamp", "desc")
      .limit(1)
      .first();
  }

  async getLatestMonitoringDataAllActive(monitor_tags: string[]): Promise<MonitoringData[]> {
    if (!monitor_tags || monitor_tags.length === 0) {
      return [];
    }

    const latestPerMonitor = this.knex("monitoring_data")
      .select("monitor_tag")
      .max("timestamp as max_timestamp")
      .whereIn("monitor_tag", monitor_tags)
      .groupBy("monitor_tag")
      .as("latest_per_monitor");

    return await this.knex("monitoring_data as md")
      .join(latestPerMonitor, function (this: KnexType.JoinClause) {
        this.on("md.monitor_tag", "=", "latest_per_monitor.monitor_tag").andOn(
          "md.timestamp",
          "=",
          "latest_per_monitor.max_timestamp",
        );
      })
      .select("md.*");
  }

  async getLastHeartbeat(monitor_tag: string): Promise<MonitoringData | undefined> {
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .where("type", GC.SIGNAL)
      .orderBy("timestamp", "desc")
      .limit(1)
      .first();
  }

  async getAggregatedMonitoringData(
    monitor_tag: string,
    start: number,
    end: number,
  ): Promise<AggregatedMonitoringData | undefined> {
    return await this.knex("monitoring_data")
      .select(
        this.knex.raw("COUNT(CASE WHEN status = 'DEGRADED' THEN 1 END) as DEGRADED"),
        this.knex.raw("COUNT(CASE WHEN status = 'UP' THEN 1 END) as UP"),
        this.knex.raw("COUNT(CASE WHEN status = 'DOWN' THEN 1 END) as DOWN"),
        this.knex.raw("AVG(latency) as avg_latency"),
        this.knex.raw("MAX(latency) as max_latency"),
        this.knex.raw("MIN(latency) as min_latency"),
      )
      .where("monitor_tag", monitor_tag)
      .where("timestamp", ">=", start)
      .where("timestamp", "<=", end)
      .first();
  }

  async getLastStatusBefore(monitor_tag: string, timestamp: number): Promise<MonitoringData | undefined> {
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .where("timestamp", "<", timestamp)
      .orderBy("timestamp", "desc")
      .limit(1)
      .first();
  }

  async getLastStatusBeforeAll(monitor_tags: string[], timestamp: number): Promise<MonitoringData | undefined> {
    return await this.knex("monitoring_data")
      .whereIn("monitor_tag", monitor_tags)
      .where("timestamp", "<", timestamp)
      .orderBy("timestamp", "desc")
      .limit(1)
      .first();
  }

  async getDataGroupByDayAlternative(
    monitor_tag: string,
    start: number,
    end: number,
  ): Promise<Array<{ timestamp: number; status: string; latency: number }>> {
    return await this.knex("monitoring_data")
      .select("timestamp", "status", "latency")
      .where("monitor_tag", monitor_tag)
      .andWhere("timestamp", ">=", start)
      .andWhere("timestamp", "<=", end)
      .orderBy("timestamp", "asc");
  }

  async getLastStatusBeforeCombined(
    monitor_tags_arr: string[],
    timestamp: number,
    minTimestamp: number | null,
  ): Promise<{ timestamp: number; total_entries: number; latency: number; status: string } | undefined> {
    let query = this.knex("monitoring_data")
      .select(
        "timestamp",
        this.knex.raw("COUNT(*) as total_entries"),
        this.knex.raw("AVG(latency) as latency"),
        this.knex.raw(`
          CASE 
          WHEN SUM(CASE WHEN status = 'DOWN' THEN 1 ELSE 0 END) > 0 THEN 'DOWN'
          WHEN SUM(CASE WHEN status = 'DEGRADED' THEN 1 ELSE 0 END) > 0 THEN 'DEGRADED'
          ELSE 'UP'
          END as status
        `),
      )
      .whereIn("monitor_tag", monitor_tags_arr);

    if (!!minTimestamp) {
      query = query.whereBetween("timestamp", [minTimestamp, timestamp]);
    } else {
      query = query.where("timestamp", "=", timestamp);
    }

    return await query
      .groupBy("timestamp")
      .havingRaw("COUNT(*) = ?", [monitor_tags_arr.length])
      .orderBy("timestamp", "desc")
      .limit(1)
      .first();
  }

  async background(retentionDays: number = 100): Promise<number> {
    const safeRetentionDays = Math.max(1, Math.floor(retentionDays || 100));
    const cutoffTimestamp = GetMinuteStartNowTimestampUTC() - 86400 * safeRetentionDays;
    return await this.knex("monitoring_data").where("timestamp", "<", cutoffTimestamp).del();
  }

  async consecutivelyStatusFor(monitor_tag: string, status: string, lastX: number): Promise<boolean> {
    const result = await this.knex
      .with("last_records", (qb: KnexType.QueryBuilder) => {
        qb.select("*")
          .from("monitoring_data")
          .where("monitor_tag", monitor_tag)
          .andWhere("type", "=", GC.REALTIME)
          .orderBy("timestamp", "desc")
          .limit(lastX);
      })
      .select(
        this.knex.raw(
          "CASE WHEN COUNT(*) <= SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) THEN 1 ELSE 0 END as is_affected",
          [status],
        ),
      )
      .from("last_records")
      .first();

    return result.is_affected === 1;
  }

  async consecutivelyLatencyGreaterThan(
    monitor_tag: string,
    latencyThreshold: number,
    lastX: number,
  ): Promise<boolean> {
    const result = await this.knex
      .with("last_records", (qb: KnexType.QueryBuilder) => {
        qb.select("*")
          .from("monitoring_data")
          .where("monitor_tag", monitor_tag)
          .andWhere("type", "=", GC.REALTIME)
          .orderBy("timestamp", "desc")
          .limit(lastX);
      })
      .select(
        this.knex.raw(
          "CASE WHEN COUNT(*) <= SUM(CASE WHEN latency > ? THEN 1 ELSE 0 END) THEN 1 ELSE 0 END as is_affected",
          [latencyThreshold],
        ),
      )
      .from("last_records")
      .first();

    return result.is_affected === 1;
  }

  async consecutivelyLatencyLessThan(monitor_tag: string, latencyThreshold: number, lastX: number): Promise<boolean> {
    const result = await this.knex
      .with("last_records", (qb: KnexType.QueryBuilder) => {
        qb.select("*")
          .from("monitoring_data")
          .where("monitor_tag", monitor_tag)
          .andWhere("type", "=", GC.REALTIME)
          .orderBy("timestamp", "desc")
          .limit(lastX);
      })
      .select(
        this.knex.raw(
          "CASE WHEN COUNT(*) <= SUM(CASE WHEN latency < ? THEN 1 ELSE 0 END) THEN 1 ELSE 0 END as is_recovered",
          [latencyThreshold],
        ),
      )
      .from("last_records")
      .first();

    return result.is_recovered === 1;
  }

  async updateMonitoringData(
    monitor_tag: string,
    start: number,
    end: number,
    newStatus: string,
    type: string,
    latency: number = 0,
    deviation: number = 0,
  ): Promise<unknown[]> {
    const count = Math.floor((end - start) / 60) + 1;
    const timestamps = Array.from({ length: count }, (_, i) => start + i * 60);

    // Generate random latency as latency ± deviation (never below 0)
    const generateLatency = () => {
      if (deviation === 0) return latency;
      const randomOffset = Math.floor(Math.random() * (deviation * 2 + 1)) - deviation;
      return Math.max(0, latency + randomOffset);
    };

    const records = timestamps.map((ts) => ({
      monitor_tag,
      timestamp: ts,
      status: newStatus,
      type,
      latency: generateLatency(),
    }));

    const batchSize = 500;

    return await this.knex.transaction(async (trx: KnexType.Transaction) => {
      const results: unknown[] = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        // Use raw insert with ON CONFLICT to update all fields including latency
        const result = await trx("monitoring_data")
          .insert(batch)
          .onConflict(["monitor_tag", "timestamp"])
          .merge(["status", "type", "latency"]);
        results.push(result);
      }

      return results;
    });
  }

  async deleteMonitorDataByTag(tag: string): Promise<number> {
    return await this.knex("monitoring_data").where("monitor_tag", tag).del();
  }

  /**
   * Get aggregated status counts grouped by timestamp intervals
   * @param monitorTag - The monitor tag(s) to query (single string or array of strings)
   * @param startTimestamp - The starting timestamp (UTC seconds)
   * @param intervalInSeconds - The interval size in seconds (e.g., 86400 for 1 day)
   * @param numberOfPoints - Number of intervals/points to return
   * @returns Array of { ts, countOfUp, countOfDown, countOfDegraded }
   */
  async getStatusCountsByInterval(
    monitorTag: string | string[],
    startTimestamp: number,
    intervalInSeconds: number,
    numberOfPoints: number,
  ): Promise<Array<TimestampStatusCount>> {
    const endTimestamp = startTimestamp + numberOfPoints * intervalInSeconds;

    // Determine database client to use appropriate timestamp arithmetic
    // SQLite uses CAST(... as INT), others (PG, MySQL) use FLOOR()
    const client = (this.knex.client as any).config.client;
    const isSQLite = client === "better-sqlite3" || client === "sqlite3";

    let tsExpression = "";
    if (isSQLite) {
      tsExpression = `CAST((timestamp - ?) / ? AS INT) * ? + ?`;
    } else {
      tsExpression = `FLOOR((timestamp - ?) / ?) * ? + ?`;
    }

    // Handle single tag or array of tags
    const isArray = Array.isArray(monitorTag);
    const tagClause = isArray ? `monitor_tag IN (${monitorTag.map(() => "?").join(", ")})` : `monitor_tag = ?`;
    // Use snake_case aliases for cross-database compatibility (PostgreSQL lowercases unquoted identifiers)
    const sql = `
      SELECT 
        ${tsExpression} as ts,
        SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END) AS count_of_up,
        SUM(CASE WHEN status = 'DOWN' THEN 1 ELSE 0 END) AS count_of_down,
        SUM(CASE WHEN status = 'DEGRADED' THEN 1 ELSE 0 END) AS count_of_degraded,
        SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS count_of_maintenance,
        AVG(latency) AS avg_latency,
				MAX(latency) AS max_latency,
				MIN(latency) AS min_latency
      FROM monitoring_data
      WHERE ${tagClause} AND timestamp >= ? AND timestamp < ?
      GROUP BY ts
      ORDER BY ts ASC
    `;

    // Bindings:
    // 1-4: tsExpression parameters (start, interval, interval, start)
    // 5+: WHERE clause parameters (tag(s), start, end)
    const bindings = [
      startTimestamp,
      intervalInSeconds,
      intervalInSeconds,
      startTimestamp,
      ...(isArray ? monitorTag : [monitorTag]),
      startTimestamp,
      endTimestamp,
    ];

    const result = await this.knex.raw(sql, bindings);

    // Handle different database drivers:
    // - SQLite (better-sqlite3): returns array directly
    // - PostgreSQL: returns { rows: [...] }
    // - MySQL: returns [rows, fields] where rows is an array
    let rows: any[];
    if (Array.isArray(result)) {
      // SQLite or MySQL (MySQL returns [rows, fields])
      rows = Array.isArray(result[0]) ? result[0] : result;
    } else {
      // PostgreSQL
      rows = result.rows || [];
    }

    return rows.map((row: any) => ({
      ts: Number(row.ts),
      countOfUp: Number(row.count_of_up) || 0,
      countOfDown: Number(row.count_of_down) || 0,
      countOfDegraded: Number(row.count_of_degraded) || 0,
      countOfMaintenance: Number(row.count_of_maintenance) || 0,
      avgLatency: Number(row.avg_latency) || 0,
      maxLatency: Number(row.max_latency) || 0,
      minLatency: Number(row.min_latency) || 0,
    }));
  }

  /**
   * Get aggregated status counts grouped by monitor_tag and timestamp intervals
   * @param monitorTags - Monitor tags to query
   * @param startTimestamp - The starting timestamp (UTC seconds)
   * @param intervalInSeconds - The interval size in seconds (e.g., 86400 for 1 day)
   * @param numberOfPoints - Number of intervals/points to return
   */
  async getStatusCountsByIntervalGroupedByMonitor(
    monitorTags: string[],
    startTimestamp: number,
    intervalInSeconds: number,
    numberOfPoints: number,
  ): Promise<Array<TimestampStatusCountByMonitor>> {
    if (!monitorTags || monitorTags.length === 0) {
      return [];
    }

    const endTimestamp = startTimestamp + numberOfPoints * intervalInSeconds;

    const client = (this.knex.client as any).config.client;
    const isSQLite = client === "better-sqlite3" || client === "sqlite3";

    const tsExpression = isSQLite ? `CAST((timestamp - ?) / ? AS INT) * ? + ?` : `FLOOR((timestamp - ?) / ?) * ? + ?`;

    const sql = `
      SELECT
        monitor_tag,
        ${tsExpression} as ts,
        SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END) AS count_of_up,
        SUM(CASE WHEN status = 'DOWN' THEN 1 ELSE 0 END) AS count_of_down,
        SUM(CASE WHEN status = 'DEGRADED' THEN 1 ELSE 0 END) AS count_of_degraded,
        SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS count_of_maintenance,
        AVG(latency) AS avg_latency,
        MAX(latency) AS max_latency,
        MIN(latency) AS min_latency
      FROM monitoring_data
      WHERE monitor_tag IN (${monitorTags.map(() => "?").join(", ")}) AND timestamp >= ? AND timestamp < ?
      GROUP BY monitor_tag, ts
      ORDER BY monitor_tag ASC, ts ASC
    `;

    const bindings = [
      startTimestamp,
      intervalInSeconds,
      intervalInSeconds,
      startTimestamp,
      ...monitorTags,
      startTimestamp,
      endTimestamp,
    ];

    const result = await this.knex.raw(sql, bindings);

    let rows: any[];
    if (Array.isArray(result)) {
      rows = Array.isArray(result[0]) ? result[0] : result;
    } else {
      rows = result.rows || [];
    }

    return rows.map((row: any) => ({
      monitor_tag: row.monitor_tag,
      ts: Number(row.ts),
      countOfUp: Number(row.count_of_up) || 0,
      countOfDown: Number(row.count_of_down) || 0,
      countOfDegraded: Number(row.count_of_degraded) || 0,
      countOfMaintenance: Number(row.count_of_maintenance) || 0,
      avgLatency: Number(row.avg_latency) || 0,
      maxLatency: Number(row.max_latency) || 0,
      minLatency: Number(row.min_latency) || 0,
    }));
  }

  /**
   * Get aggregated status counts and average latency for the last N rows
   * @param monitorTag - The monitor tag(s) to query (single string or array of strings)
   * @param lastX - Number of most recent rows to include
   * @returns Object with ts=0, counts of each status, and average latency
   */
  async getStatusCountsForLastN(monitorTag: string | string[], lastX: number): Promise<TimestampStatusCount> {
    const tags = Array.isArray(monitorTag) ? monitorTag : [monitorTag];

    const result = await this.knex
      .with("last_records", (qb: KnexType.QueryBuilder) => {
        qb.select("status", "latency")
          .from("monitoring_data")
          .whereIn("monitor_tag", tags)
          .orderBy("timestamp", "desc")
          .limit(lastX);
      })
      .select(
        this.knex.raw("SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END) AS count_of_up"),
        this.knex.raw("SUM(CASE WHEN status = 'DOWN' THEN 1 ELSE 0 END) AS count_of_down"),
        this.knex.raw("SUM(CASE WHEN status = 'DEGRADED' THEN 1 ELSE 0 END) AS count_of_degraded"),
        this.knex.raw("SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS count_of_maintenance"),
        this.knex.raw("AVG(latency) AS avg_latency"),
        this.knex.raw("MAX(latency) AS max_latency"),
        this.knex.raw("MIN(latency) AS min_latency"),
      )
      .from("last_records")
      .first();

    return {
      ts: 0,
      countOfUp: Number(result?.count_of_up) || 0,
      countOfDown: Number(result?.count_of_down) || 0,
      countOfDegraded: Number(result?.count_of_degraded) || 0,
      countOfMaintenance: Number(result?.count_of_maintenance) || 0,
      avgLatency: Number(result?.avg_latency) || 0,
      maxLatency: Number(result?.max_latency) || 0,
      minLatency: Number(result?.min_latency) || 0,
    };
  }
}

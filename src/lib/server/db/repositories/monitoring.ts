import type { Knex as KnexType } from "knex";
import { BaseRepository } from "./base.js";
import { MANUAL, SIGNAL } from "../../constants.js";
import { GetMinuteStartNowTimestampUTC } from "../../tool.js";
import type {
  MonitoringData,
  MonitoringDataInsert,
  AggregatedMonitoringData,
  TimestampStatusCount,
} from "../../types/db.js";

/**
 * Repository for monitoring data operations
 */
export class MonitoringRepository extends BaseRepository {
  async insertMonitoringData(data: MonitoringDataInsert): Promise<number[]> {
    const { monitor_tag, timestamp, status, latency, type } = data;
    return await this.knex("monitoring_data")
      .insert({ monitor_tag, timestamp, status, latency, type })
      .onConflict(["monitor_tag", "timestamp"])
      .merge({ status, latency, type });
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

  async getMonitoringDataAt(monitor_tag: string, timestamp: number): Promise<MonitoringData | undefined> {
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .where("timestamp", timestamp)
      .orderBy("timestamp", "desc")
      .limit(1)
      .first();
  }

  async getLatestMonitoringDataAllActive(monitor_tags: string[]): Promise<MonitoringData[]> {
    const latestTimestamps = await this.knex("monitoring_data")
      .select("monitor_tag")
      .select(this.knex.raw("MAX(timestamp) as max_timestamp"))
      .whereIn("monitor_tag", monitor_tags)
      .groupBy("monitor_tag");

    if (!latestTimestamps || latestTimestamps.length === 0) {
      return [];
    }

    const conditions = latestTimestamps.map((item: { monitor_tag: string; max_timestamp: number }) => {
      return function (this: KnexType.QueryBuilder) {
        this.where(function (this: KnexType.QueryBuilder) {
          this.where("monitor_tag", item.monitor_tag).andWhere("timestamp", item.max_timestamp);
        });
      };
    });

    let query = this.knex("monitoring_data").where(conditions[0]);
    for (let i = 1; i < conditions.length; i++) {
      query = query.orWhere(conditions[i]);
    }

    return await query;
  }

  async getLastHeartbeat(monitor_tag: string): Promise<MonitoringData | undefined> {
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .where("type", SIGNAL)
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

  async background(): Promise<number> {
    const ninetyDaysAgo = GetMinuteStartNowTimestampUTC() - 86400 * 100;
    return await this.knex("monitoring_data").where("timestamp", "<", ninetyDaysAgo).del();
  }

  async consecutivelyStatusFor(monitor_tag: string, status: string, lastX: number): Promise<boolean> {
    const result = await this.knex
      .with("last_records", (qb: KnexType.QueryBuilder) => {
        qb.select("*")
          .from("monitoring_data")
          .where("monitor_tag", monitor_tag)
          .andWhere("type", "!=", MANUAL)
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

  async updateMonitoringData(
    monitor_tag: string,
    start: number,
    end: number,
    newStatus: string,
    type: string,
  ): Promise<unknown[]> {
    const count = Math.floor((end - start) / 60) + 1;
    const timestamps = Array.from({ length: count }, (_, i) => start + i * 60);

    const records = timestamps.map((ts) => ({
      monitor_tag,
      timestamp: ts,
      status: newStatus,
      type,
      latency: 0,
    }));

    const batchSize = 500;

    return await this.knex.transaction(async (trx: KnexType.Transaction) => {
      const results: unknown[] = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const result = await trx("monitoring_data")
          .insert(batch)
          .onConflict(["monitor_tag", "timestamp"])
          .merge({ status: newStatus, type });
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
   * @param monitorTag - The monitor tag to query
   * @param startTimestamp - The starting timestamp (UTC seconds)
   * @param intervalInSeconds - The interval size in seconds (e.g., 86400 for 1 day)
   * @param numberOfPoints - Number of intervals/points to return
   * @returns Array of { ts, countOfUp, countOfDown, countOfDegraded }
   */
  async getStatusCountsByInterval(
    monitorTag: string,
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

    const sql = `
      SELECT 
        ${tsExpression} as ts,
        SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END) AS countOfUp,
        SUM(CASE WHEN status = 'DOWN' THEN 1 ELSE 0 END) AS countOfDown,
        SUM(CASE WHEN status = 'DEGRADED' THEN 1 ELSE 0 END) AS countOfDegraded,
        SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS countOfMaintenance,
        AVG(latency) AS avgLatency
      FROM monitoring_data
      WHERE monitor_tag = ? AND timestamp >= ? AND timestamp < ?
      GROUP BY ts
      ORDER BY ts ASC
    `;

    // Bindings:
    // 1-4: tsExpression parameters (start, interval, interval, start)
    // 5-7: WHERE clause parameters (tag, start, end)
    const bindings = [
      startTimestamp,
      intervalInSeconds,
      intervalInSeconds,
      startTimestamp,
      monitorTag,
      startTimestamp,
      endTimestamp,
    ];

    const result = await this.knex.raw(sql, bindings);

    // Handle different database drivers (sqlite returns array, pg/mysql returns { rows })
    const rows = Array.isArray(result) ? result : result.rows || [];

    return rows.map((row: TimestampStatusCount) => ({
      ts: Number(row.ts),
      countOfUp: Number(row.countOfUp),
      countOfDown: Number(row.countOfDown),
      countOfDegraded: Number(row.countOfDegraded),
      countOfMaintenance: Number(row.countOfMaintenance),
      avgLatency: Number(row.avgLatency) || 0,
    }));
  }
}

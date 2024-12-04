// @ts-nocheck
import pkg from "pg";
const { Pool } = pkg;

import {
	GetMinuteStartNowTimestampUTC,
	GetRequiredSecrets,
	ReplaceAllOccurrences
} from "../tool.js";

class Postgres {
	pool;

	constructor(opts) {
		const defaultOptions = {};

		let strOpts = JSON.stringify(opts);
		let envSecrets = GetRequiredSecrets(JSON.stringify(opts));
		for (let i = 0; i < envSecrets.length; i++) {
			strOpts = ReplaceAllOccurrences(strOpts, envSecrets[i].find, envSecrets[i].replace);
		}

		opts = JSON.parse(strOpts);

		defaultOptions.connectionString = `postgres://${opts.user}:${opts.password}@${opts.host}:${opts.port}/${opts.database}`;

		const dbOptions = { ...defaultOptions, ...opts.dbOptions };
		this.pool = new Pool(dbOptions);

		// Call init
		this.init();
	}

	async init() {
		const client = await this.pool.connect();
		try {
			await client.query(`
        CREATE TABLE IF NOT EXISTS "MonitoringData" (
			"monitorTag" TEXT NOT NULL,
			"timestamp" BIGINT NOT NULL,
			"status" TEXT,
			"latency" REAL,
			"type" TEXT,
			PRIMARY KEY ("monitorTag", "timestamp")
        );

        CREATE TABLE IF NOT EXISTS "MonitorAlerts" (
          id SERIAL PRIMARY KEY,
          "monitorTag" TEXT NOT NULL,
          "monitorStatus" TEXT NOT NULL,
          "alertStatus" TEXT NOT NULL,
          "healthChecks" INTEGER NOT NULL,
          "incidentNumber" INTEGER DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_monitor_tag_created_at
        ON "MonitorAlerts" ("monitorTag", "createdAt");
      `);
		} finally {
			client.release();
		}
	}

	async insertData(data) {
		await this.pool.query(
			`
				INSERT INTO "MonitoringData" ("monitorTag", "timestamp", "status", "latency", "type")
				VALUES ($1, $2, $3, $4, $5)
				ON CONFLICT ("monitorTag", "timestamp") DO UPDATE SET
				"status" = EXCLUDED.status,
				"latency" = EXCLUDED.latency,
				"type" = EXCLUDED.type;
			`,
			[data.monitorTag, data.timestamp, data.status, data.latency, data.type]
		);
	}

	async getData(monitorTag, start, end) {
		const { rows } = await this.pool.query(
			`
				SELECT * FROM "MonitoringData"
				WHERE "monitorTag" = $1 AND "timestamp" >= $2 AND "timestamp" <= $3
				ORDER BY "timestamp" ASC;
			`,
			[monitorTag, start, end]
		);
		return rows;
	}

	async getLatestData(monitorTag) {
		const { rows } = await this.pool.query(
			`
				SELECT * FROM "MonitoringData"
				WHERE "monitorTag" = $1
				ORDER BY "timestamp" DESC
				LIMIT 1;
			`,
			[monitorTag]
		);
		return rows[0];
	}

	async getAggregatedData(monitorTag, start, end) {
		const { rows } = await this.pool.query(
			`
				SELECT 
					COUNT(*) AS total,
					SUM(CASE WHEN "status" = 'UP' THEN 1 ELSE 0 END) AS "UP",
					SUM(CASE WHEN "status" = 'DOWN' THEN 1 ELSE 0 END) AS "DOWN",
					SUM(CASE WHEN "status" = 'DEGRADED' THEN 1 ELSE 0 END) AS "DEGRADED",
					AVG("latency") AS "avgLatency",
					MAX("latency") AS "maxLatency",
					MIN("latency") AS "minLatency"
				FROM "MonitoringData"
				WHERE "monitorTag" = $1 AND "timestamp" >= $2 AND "timestamp" <= $3;
			`,
			[monitorTag, start, end]
		);
		return rows[0];
	}
	async getDataGroupByDayAlternative(monitorTag, start, end, timezoneOffsetMinutes = 0) {
		const offsetMinutes = Number(timezoneOffsetMinutes);
		if (isNaN(offsetMinutes)) {
			throw new Error(
				"Invalid timezone offset. Must be a number representing minutes from UTC."
			);
		}
		// Calculate the offset in seconds
		const offsetSeconds = offsetMinutes * 60;

		const { rows } = await this.pool.query(
			`
			SELECT 
			timestamp,
			status,
			latency
			FROM "MonitoringData"
			WHERE "monitorTag" = $1 AND timestamp >= $2 AND timestamp <= $3
			ORDER BY timestamp ASC;
    `,
			[monitorTag, start, end]
		);
		let rawData = rows;
		const groupedData = rawData.reduce((acc, row) => {
			// Calculate day group considering timezone offset
			const dayGroup = Math.floor((Number(row.timestamp) + offsetSeconds) / 86400);
			if (!acc[dayGroup]) {
				acc[dayGroup] = {
					timestamp: dayGroup * 86400 - offsetSeconds, // start of day in UTC
					total: 0,
					UP: 0,
					DOWN: 0,
					DEGRADED: 0,
					latencySum: 0,
					latencies: []
				};
			}

			const group = acc[dayGroup];
			group.total++;
			group[row.status]++;
			group.latencySum += row.latency;
			group.latencies.push(row.latency);

			return acc;
		}, {});

		// Transform grouped data to final format
		return Object.values(groupedData)
			.map((group) => ({
				timestamp: group.timestamp,
				total: group.total,
				UP: group.UP,
				DOWN: group.DOWN,
				DEGRADED: group.DEGRADED,
				avgLatency:
					group.total > 0 ? Number((group.latencySum / group.total).toFixed(3)) : null,
				maxLatency:
					group.latencies.length > 0
						? Number(Math.max(...group.latencies).toFixed(3))
						: null,
				minLatency:
					group.latencies.length > 0
						? Number(Math.min(...group.latencies).toFixed(3))
						: null
			}))
			.sort((a, b) => a.timestamp - b.timestamp);
	}

	async background() {
		const ninetyDaysAgo = GetMinuteStartNowTimestampUTC() - 86400 * 90;
		await this.pool.query(
			`
			DELETE FROM "MonitoringData"
			WHERE timestamp < $1;
		`,
			[ninetyDaysAgo]
		);
	}
	async consecutivelyStatusFor(monitorTag, status, lastX) {
		const { rows } = await this.pool.query(
			`
			SELECT 
				COUNT(*) AS total,
				SUM(CASE WHEN status = $2 THEN 1 ELSE 0 END) AS matches
			FROM (
				SELECT * FROM "MonitoringData"
				WHERE "monitorTag" = $1
				ORDER BY timestamp DESC
				LIMIT $3
			) AS subquery;
			`,
			[monitorTag, status, lastX]
		);
		return rows[0].total === rows[0].matches;
	}
	async insertAlert(data) {
		if (await this.alertExists(data.monitorTag, data.monitorStatus, data.alertStatus)) {
			return;
		}

		const { rows } = await this.pool.query(
			`
				INSERT INTO "MonitorAlerts" ("monitorTag", "monitorStatus", "alertStatus", "healthChecks")
				VALUES ($1, $2, $3, $4)
				RETURNING *;
			`,
			[data.monitorTag, data.monitorStatus, data.alertStatus, data.healthChecks]
		);
		return rows[0];
	}

	//check if alert exists given monitorTag, monitorStatus, alertStatus
	async alertExists(monitorTag, monitorStatus, alertStatus) {
		const { rows } = await this.pool.query(
			`
				SELECT COUNT(*) AS count
				FROM "MonitorAlerts"
				WHERE "monitorTag" = $1 AND "monitorStatus" = $2 AND "alertStatus" = $3;
			`,
			[monitorTag, monitorStatus, alertStatus]
		);
		return rows[0].count > 0;
	}

	//return active alert for a monitorTag, monitorStatus, alertStatus = ACTIVE
	async getActiveAlert(monitorTag, monitorStatus, alertStatus) {
		const { rows } = await this.pool.query(
			`
				SELECT * FROM "MonitorAlerts"
				WHERE "monitorTag" = $1 AND "monitorStatus" = $2 AND "alertStatus" = $3;
			`,
			[monitorTag, monitorStatus, alertStatus]
		);
		return rows[0];
	}

	async updateAlertStatus(id, status) {
		await this.pool.query(
			`
				UPDATE "MonitorAlerts"
				SET "alertStatus" = $1, "updatedAt" = CURRENT_TIMESTAMP
				WHERE id = $2;
			`,
			[status, id]
		);
	}

	async incrementAlertHealthChecks(id) {
		await this.pool.query(
			`
				UPDATE "MonitorAlerts"
				SET "healthChecks" = "healthChecks" + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1;
			`,
			[id]
		);
	}

	async addIncidentNumberToAlert(id, incidentNumber) {
		await this.pool.query(
			`
    UPDATE "MonitorAlerts"
    SET "incidentNumber" = $1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = $2;
    `,
			[incidentNumber, id]
		);
	}

	close() {
		this.pool.end();
	}
}

export default Postgres;

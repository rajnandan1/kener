// @ts-nocheck
import Database from "better-sqlite3";
import { GetMinuteStartNowTimestampUTC } from "../tool.js";
class Sqlite {
	db;
	constructor(opts) {
		let defaultOptions = {
			readonly: false,
			fileMustExist: false,
			timeout: 5000
		};
		//merge opts.dbOptions with defaultOptions
		let dbOptions = Object.assign(defaultOptions, opts.dbOptions);
		this.db = new Database(opts.dbName, dbOptions);
		this.db.pragma("journal_mode = WAL");

		//call init
		this.init();
	}

	async init() {
		this.db.exec(`

			CREATE TABLE IF NOT EXISTS MonitoringData (
				monitorTag TEXT NOT NULL,
				timestamp INTEGER NOT NULL,
				status TEXT,
				latency REAL,
				type TEXT,
				PRIMARY KEY (monitorTag, timestamp)
			);

			CREATE TABLE IF NOT EXISTS MonitorAlerts (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				monitorTag TEXT NOT NULL,
				monitorStatus TEXT NOT NULL,
				alertStatus TEXT NOT NULL,
				healthChecks INTEGER NOT NULL,
				incidentNumber INTEGER DEFAULT 0,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			-- Create index on monitorTag and createdAt for MonitorAlerts
			CREATE INDEX IF NOT EXISTS idx_monitor_tag_created_at
			ON MonitorAlerts (monitorTag, createdAt);
		`);
	}

	async insertData(data) {
		let stmt = this.db.prepare(`
			INSERT INTO MonitoringData (monitorTag, timestamp, status, latency, type)
			VALUES (@monitorTag, @timestamp, @status, @latency, @type)
			ON CONFLICT(monitorTag, timestamp) DO UPDATE SET
				status = excluded.status,
				latency = excluded.latency,
				type = excluded.type;
		`);
		stmt.run(data);
	}

	//given monitorTag, start and end timestamp in utc seconds return data
	async getData(monitorTag, start, end) {
		let stmt = this.db.prepare(`
			SELECT * FROM MonitoringData
			WHERE monitorTag = @monitorTag AND timestamp >= @start AND timestamp <= @end
			ORDER BY timestamp ASC;
		`);
		return stmt.all({ monitorTag, start, end });
	}

	//get latest data for a monitorTag
	async getLatestData(monitorTag) {
		let stmt = this.db.prepare(`
			SELECT * FROM MonitoringData
			WHERE monitorTag = @monitorTag
			ORDER BY timestamp DESC
			LIMIT 1;
		`);
		return stmt.get({ monitorTag });
	}

	//given monitorTag, start and end timestamp in utc seconds return total degraded, up, down, avg(latency), max(latency), min(latency)
	async getAggregatedData(monitorTag, start, end) {
		let stmt = this.db.prepare(`
			SELECT 
				COUNT(*) AS total,
				SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END) AS UP,
				SUM(CASE WHEN status = 'DOWN' THEN 1 ELSE 0 END) AS DOWN,
				SUM(CASE WHEN status = 'DEGRADED' THEN 1 ELSE 0 END) AS DEGRADED,
				AVG(latency) AS avgLatency,
				MAX(latency) AS maxLatency,
				MIN(latency) AS minLatency
			FROM MonitoringData
			WHERE monitorTag = @monitorTag AND timestamp >= @start AND timestamp <= @end;
		`);
		return stmt.get({ monitorTag, start, end });
	}

	async getDataGroupByDayAlternative(monitorTag, start, end, timezoneOffsetMinutes = 0) {
		// Validate and normalize timezone offset
		const offsetMinutes = Number(timezoneOffsetMinutes);
		if (isNaN(offsetMinutes)) {
			throw new Error(
				"Invalid timezone offset. Must be a number representing minutes from UTC."
			);
		}

		// Calculate the offset in seconds
		const offsetSeconds = offsetMinutes * 60;

		// Fetch all raw data
		let stmt = this.db.prepare(`
        SELECT 
            timestamp,
            status,
            latency
        FROM MonitoringData
        WHERE monitorTag = ? AND timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC;
    `);

		const rawData = stmt.all(monitorTag, start, end); //{ timestamp: 1732900380, status: 'UP', latency: 42 }
		// Group manually in JavaScript
		const groupedData = rawData.reduce((acc, row) => {
			// Calculate day group considering timezone offset
			const dayGroup = Math.floor((row.timestamp + offsetSeconds) / 86400);
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
		//clear data older than 90 days
		let ninetyDaysAgo = GetMinuteStartNowTimestampUTC() - 86400 * 90;
		let stmt = this.db.prepare(`
			DELETE FROM MonitoringData
			WHERE timestamp < @ninetyDaysAgo;
		`);
	}

	async consecutivelyStatusFor(monitorTag, status, lastX) {
		let stmt = this.db.prepare(`
			SELECT 
				CASE 
					WHEN COUNT(*) <= SUM(CASE WHEN status = @status THEN 1 ELSE 0 END) THEN 1 
					ELSE 0 
				END AS isAffected 
			FROM (
				SELECT * 
				FROM MonitoringData 
				where monitorTag = @monitorTag
				ORDER BY timestamp DESC
				LIMIT @lastX
			) AS last_four;
		`);
		return stmt.get({ monitorTag, status, lastX }).isAffected == 1;
	}

	//insert alert
	async insertAlert(data) {
		//if alert exists return

		if (await this.alertExists(data.monitorTag, data.monitorStatus, data.alertStatus)) {
			return;
		}

		let stmt = this.db.prepare(`
			INSERT INTO MonitorAlerts (monitorTag, monitorStatus, alertStatus, healthChecks)
			VALUES (@monitorTag, @monitorStatus, @alertStatus, @healthChecks);
		`);
		let x = stmt.run(data);

		// Return the created row
		return await this.getActiveAlert(data.monitorTag, data.monitorStatus, data.alertStatus);
	}

	//check if alert exists given monitorTag, monitorStatus, alertStatus
	async alertExists(monitorTag, monitorStatus, alertStatus) {
		let stmt = this.db.prepare(`
			SELECT COUNT(*) AS count
			FROM MonitorAlerts
			WHERE monitorTag = @monitorTag AND monitorStatus = @monitorStatus AND alertStatus = @alertStatus;
		`);

		let res = stmt.get({ monitorTag, monitorStatus, alertStatus });
		return res.count > 0;
	}

	//return active alert for a monitorTag, monitorStatus, alertStatus = ACTIVE
	async getActiveAlert(monitorTag, monitorStatus, alertStatus) {
		let stmt = this.db.prepare(`
			SELECT * FROM MonitorAlerts
			WHERE monitorTag = @monitorTag AND monitorStatus = @monitorStatus AND alertStatus = @alertStatus;
		`);
		return stmt.get({ monitorTag, monitorStatus, alertStatus });
	}

	//update alert to inactive given monitorTag, monitorStatus, given id
	async updateAlertStatus(id, status) {
		let stmt = this.db.prepare(`
			UPDATE MonitorAlerts
			SET alertStatus = @status, updatedAt = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		stmt.run({ id, status });
	}

	//increment healthChecks for an alert given id
	async incrementAlertHealthChecks(id) {
		let stmt = this.db.prepare(`
			UPDATE MonitorAlerts
			SET healthChecks = healthChecks + 1, updatedAt = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		stmt.run({ id });
	}

	//add incidentNumber to an alert given id
	async addIncidentNumberToAlert(id, incidentNumber) {
		let stmt = this.db.prepare(`
			UPDATE MonitorAlerts
			SET incidentNumber = @incidentNumber, updatedAt = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		stmt.run({ id, incidentNumber });
	}

	//close
	close() {
		this.db.close();
	}
}

export default Sqlite;

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
				triggerStatus TEXT NOT NULL,
				healthChecks INTEGER NOT NULL,
				incidentNumber INTEGER DEFAULT 0,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			CREATE INDEX IF NOT EXISTS idx_monitor_tag_created_at
			ON MonitorAlerts (monitorTag, createdAt);

			CREATE TABLE IF NOT EXISTS SiteData (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				key TEXT NOT NULL UNIQUE,
				value TEXT NOT NULL,
				dataType TEXT NOT NULL,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			CREATE TABLE IF NOT EXISTS Monitors (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				tag TEXT NOT NULL UNIQUE,
				name TEXT NOT NULL UNIQUE,
				description TEXT,
				image TEXT,
				cron TEXT,
				defaultStatus TEXT,
				status TEXT,
				categoryName TEXT,
				monitorType TEXT,
				downTrigger TEXT,
				degradedTrigger TEXT,
				typeData TEXT,
				dayDegradedMinimumCount INTEGER,
				dayDownMinimumCount INTEGER,
				includeDegradedInDowntime INTEGER,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			CREATE TABLE IF NOT EXISTS Triggers (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL UNIQUE,
				triggerType TEXT,
				triggerDesc TEXT,
				triggerStatus TEXT,
				triggerMeta TEXT,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			CREATE TABLE IF NOT EXISTS Users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				email TEXT NOT NULL UNIQUE,
				name TEXT NOT NULL UNIQUE,
				password_hash TEXT NOT NULL,
				isActive INTEGER DEFAULT 1,
				isVerified INTEGER DEFAULT 0,
				role TEXT DEFAULT 'user',
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			-- create table ApiKeys
			CREATE TABLE IF NOT EXISTS ApiKeys (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL,
				hashedKey TEXT NOT NULL UNIQUE,
				maskedKey TEXT NOT NULL,
				status TEXT DEFAULT 'ACTIVE',
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
			);

		`);
	}

	//check if all all the tables are created
	async checkTables() {
		let stmt = this.db.prepare(`
			SELECT name FROM sqlite_master WHERE type='table';
		`);
		return stmt.all();
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

	//check if alert exists given monitorTag, monitorStatus, triggerStatus
	async alertExists(monitorTag, monitorStatus, alertStatus) {
		let stmt = this.db.prepare(`
			SELECT COUNT(*) AS count
			FROM MonitorAlerts
			WHERE monitorTag = @monitorTag AND monitorStatus = @monitorStatus AND alertStatus = @alertStatus;
		`);

		let res = stmt.get({ monitorTag, monitorStatus, alertStatus });
		return res.count > 0;
	}

	//return active alert for a monitorTag, monitorStatus, triggerStatus = ACTIVE
	async getActiveAlert(monitorTag, monitorStatus, alertStatus) {
		let stmt = this.db.prepare(`
			SELECT * FROM MonitorAlerts
			WHERE monitorTag = @monitorTag AND monitorStatus = @monitorStatus AND alertStatus = @alertStatus;
		`);
		return stmt.get({ monitorTag, monitorStatus, alertStatus });
	}

	//get all MonitorAlerts paginated descending order
	async getMonitorAlertsPaginated(page, limit) {
		let stmt = this.db.prepare(`
			SELECT * FROM MonitorAlerts
			ORDER BY id DESC
			LIMIT @limit OFFSET @offset;
		`);
		return stmt.all({ limit, offset: (page - 1) * limit });
	}

	//get total count of MonitorAlerts
	async getMonitorAlertsCount() {
		let stmt = this.db.prepare(`
			SELECT COUNT(*) AS count FROM MonitorAlerts;
		`);
		return stmt.get();
	}

	//update alert to inactive given monitorTag, monitorStatus, given id
	async updateAlertStatus(id, alertStatus) {
		let stmt = this.db.prepare(`
			UPDATE MonitorAlerts
			SET alertStatus = @alertStatus, updatedAt = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		stmt.run({ id, alertStatus });
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

	//insert or update site data
	async insertOrUpdateSiteData(key, value, dataType) {
		let stmt = this.db.prepare(`
			INSERT INTO SiteData (key, value, dataType)
			VALUES (@key, @value, @dataType)
			ON CONFLICT(key) DO UPDATE SET
				value = excluded.value,
				updatedAt = CURRENT_TIMESTAMP;
		`);
		stmt.run({ key, value, dataType });
	}
	//get all site data
	async getAllSiteData() {
		let stmt = this.db.prepare(`
			SELECT * FROM SiteData;
		`);
		return stmt.all();
	}

	//given key get data
	async getSiteData(key) {
		let stmt = this.db.prepare(`
			SELECT value FROM SiteData
			WHERE key = @key
			LIMIT 1;
		`);
		return stmt.get({ key });
	}

	//insert into Monitors
	async insertMonitor(data) {
		let stmt = this.db.prepare(`
			INSERT INTO Monitors (
				tag,
				name,
				description,
				image,
				cron,
				defaultStatus,
				status,
				categoryName,
				monitorType,
				typeData,
				dayDegradedMinimumCount,
				dayDownMinimumCount,
				includeDegradedInDowntime
			)
			VALUES (
				@tag,
				@name,
				@description,
				@image,
				@cron,
				@defaultStatus,
				@status,
				@categoryName,
				@monitorType,
				@typeData,
				@dayDegradedMinimumCount,
				@dayDownMinimumCount,
				@includeDegradedInDowntime
			);
		`);
		return stmt.run(data);
	}

	//update monitor by id
	async updateMonitor(data) {
		let stmt = this.db.prepare(`
			UPDATE Monitors
			SET
				tag = @tag,
				name = @name,
				description = @description,
				image = @image,
				cron = @cron,
				defaultStatus = @defaultStatus,
				status = @status,
				categoryName = @categoryName,
				monitorType = @monitorType,
				typeData = @typeData,
				dayDegradedMinimumCount = @dayDegradedMinimumCount,
				dayDownMinimumCount = @dayDownMinimumCount,
				includeDegradedInDowntime = @includeDegradedInDowntime,
				updatedAt = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		return stmt.run(data);
	}

	async updateMonitorTrigger(data) {
		let stmt = this.db.prepare(`
			UPDATE Monitors
			SET
				downTrigger = @downTrigger,
				degradedTrigger = @degradedTrigger,
				updatedAt = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		return stmt.run(data);
	}

	//get monitors given status
	async getMonitors(data) {
		let stmt = this.db.prepare(`
			SELECT * FROM Monitors
			WHERE status = @status order by id desc;
		`);
		return stmt.all({ status: data.status });
	}

	//get monitor by tag
	async getMonitorByTag(tag) {
		let stmt = this.db.prepare(`
			SELECT * FROM Monitors
			WHERE tag = @tag;
		`);
		return stmt.get({ tag });
	}

	//insert alert
	async createNewTrigger(data) {
		let stmt = this.db.prepare(`
			INSERT INTO Triggers (name, triggerType, triggerStatus, triggerMeta, triggerDesc)
			VALUES (@name, @triggerType, @triggerStatus, @triggerMeta, @triggerDesc);
		`);
		return stmt.run(data);
	}

	//update alert
	async updateTrigger(data) {
		let stmt = this.db.prepare(`
			UPDATE Triggers
			SET
				name = @name,
				triggerType = @triggerType,
				triggerStatus = @triggerStatus,
				triggerDesc = @triggerDesc,
				triggerMeta = @triggerMeta,
				updatedAt = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		return stmt.run(data);
	}

	//get all alerts with given status
	async getTriggers(data) {
		let stmt = this.db.prepare(`
			SELECT * FROM Triggers
			WHERE triggerStatus = @triggerStatus order by id desc;
		`);
		return stmt.all({ triggerStatus: data.status });
	}

	//get count of users
	async getUsersCount() {
		let stmt = this.db.prepare(`
			SELECT COUNT(*) AS count FROM Users;
		`);
		return stmt.get();
	}

	// get user by email, do not return password_hash
	async getUserByEmail(email) {
		let stmt = this.db.prepare(`
			SELECT id, email, name, isActive, isVerified, role, createdAt, updatedAt
			FROM Users
			WHERE email = @email;
		`);
		return stmt.get({ email });
	}
	async getUserPasswordHashById(id) {
		let stmt = this.db.prepare(`
			SELECT password_hash
			FROM Users
			WHERE id = @id;
		`);
		return stmt.get({ id });
	}

	//insert user
	async insertUser(data) {
		let stmt = this.db.prepare(`
			INSERT INTO Users (email, name, password_hash, role)
			VALUES (@email, @name, @password_hash, @role);
		`);
		return stmt.run(data);
	}

	//new api key
	async createNewApiKey(data) {
		let stmt = this.db.prepare(`
			INSERT INTO ApiKeys (name, hashedKey, maskedKey)
			VALUES (@name, @hashedKey, @maskedKey);
		`);
		return stmt.run(data);
	}

	//update status of api key
	async updateApiKeyStatus(data) {
		let stmt = this.db.prepare(`
			UPDATE ApiKeys
			SET status = @status, updatedAt = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		return stmt.run(data);
	}

	//get key by hashedKey
	async getApiKeyByHashedKey(hashedKey) {
		let stmt = this.db.prepare(`
			SELECT * FROM ApiKeys
			WHERE hashedKey = @hashedKey;
		`);
		return stmt.get({ hashedKey });
	}

	//get all api keys
	async getAllApiKeys() {
		let stmt = this.db.prepare(`
			SELECT * FROM ApiKeys order by id desc;
		`);
		return stmt.all();
	}

	//close
	close() {
		this.db.close();
	}
}

export default Sqlite;

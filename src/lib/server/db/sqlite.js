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

			CREATE TABLE IF NOT EXISTS monitoring_data (
				monitor_tag TEXT NOT NULL,
				timestamp INTEGER NOT NULL,
				status TEXT,
				latency REAL,
				type TEXT,
				PRIMARY KEY (monitor_tag, timestamp)
			);

			CREATE TABLE IF NOT EXISTS monitor_alerts (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				monitor_tag TEXT NOT NULL,
				monitor_status TEXT NOT NULL,
				alert_status TEXT NOT NULL,
				health_checks INTEGER NOT NULL,
				incident_number INTEGER DEFAULT 0,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			CREATE INDEX IF NOT EXISTS idx_monitor_tag_created_at
			ON monitor_alerts (monitor_tag, created_at);

			CREATE TABLE IF NOT EXISTS site_data (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				key TEXT NOT NULL UNIQUE,
				value TEXT NOT NULL,
				data_type TEXT NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			CREATE TABLE IF NOT EXISTS monitors (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				tag TEXT NOT NULL UNIQUE,
				name TEXT NOT NULL UNIQUE,
				description TEXT,
				image TEXT,
				cron TEXT,
				default_status TEXT,
				status TEXT,
				category_name TEXT,
				monitor_type TEXT,
				down_trigger TEXT,
				degraded_trigger TEXT,
				type_data TEXT,
				day_degraded_minimum_count INTEGER,
				day_down_minimum_count INTEGER,
				include_degraded_in_downtime TEXT DEFAULT 'NO',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			CREATE TABLE IF NOT EXISTS triggers (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL UNIQUE,
				trigger_type TEXT,
				trigger_desc TEXT,
				trigger_status TEXT,
				trigger_meta TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				email TEXT NOT NULL UNIQUE,
				name TEXT NOT NULL UNIQUE,
				password_hash TEXT NOT NULL,
				is_active INTEGER DEFAULT 1,
				is_verified INTEGER DEFAULT 0,
				role TEXT DEFAULT 'user',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			-- create table api_keys
			CREATE TABLE IF NOT EXISTS api_keys (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL,
				hashed_key TEXT NOT NULL UNIQUE,
				masked_key TEXT NOT NULL,
				status TEXT DEFAULT 'ACTIVE',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			CREATE TABLE IF NOT EXISTS incidents (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				title TEXT NOT NULL,
				start_date_time INTEGER NOT NULL,
				end_date_time INTEGER,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				status TEXT DEFAULT 'ACTIVE',
				state TEXT DEFAULT 'INVESTIGATING'
			);

			-- create table incident_monitors id | monitor_tag | monitor_impact | created_at | updated_at | incident_id
			CREATE TABLE IF NOT EXISTS incident_monitors (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				monitor_tag TEXT NOT NULL,
				monitor_impact TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				incident_id INTEGER NOT NULL,
				UNIQUE (monitor_tag, incident_id)
			);

			-- create table incident_comments id | comment | incident_id | created_at | updated_at | status
			CREATE TABLE IF NOT EXISTS incident_comments (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				comment TEXT NOT NULL,
				incident_id INTEGER NOT NULL,
				commented_at INTEGER NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				status TEXT DEFAULT 'ACTIVE',
				state TEXT DEFAULT 'INVESTIGATING'
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

	async insertMonitoringData(data) {
		let stmt = this.db.prepare(`
			INSERT INTO monitoring_data (monitor_tag, timestamp, status, latency, type)
			VALUES (@monitor_tag, @timestamp, @status, @latency, @type)
			ON CONFLICT(monitor_tag, timestamp) DO UPDATE SET
				status = excluded.status,
				latency = excluded.latency,
				type = excluded.type;
		`);
		stmt.run(data);
	}

	//given monitor_tag, start and end timestamp in utc seconds return data
	async getMonitoringData(monitor_tag, start, end) {
		let stmt = this.db.prepare(`
			SELECT * FROM monitoring_data
			WHERE monitor_tag = @monitor_tag AND timestamp >= @start AND timestamp <= @end
			ORDER BY timestamp ASC;
		`);
		return stmt.all({ monitor_tag, start, end });
	}

	//get latest data for a monitor_tag
	async getLatestMonitoringData(monitor_tag) {
		let stmt = this.db.prepare(`
			SELECT * FROM monitoring_data
			WHERE monitor_tag = @monitor_tag
			ORDER BY timestamp DESC
			LIMIT 1;
		`);
		return stmt.get({ monitor_tag });
	}

	//given monitor_tag, start and end timestamp in utc seconds return total degraded, up, down, avg(latency), max(latency), min(latency)
	async getAggregatedMonitoringData(monitor_tag, start, end) {
		let stmt = this.db.prepare(`
			SELECT 
				COUNT(*) AS total,
				SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END) AS UP,
				SUM(CASE WHEN status = 'DOWN' THEN 1 ELSE 0 END) AS DOWN,
				SUM(CASE WHEN status = 'DEGRADED' THEN 1 ELSE 0 END) AS DEGRADED,
				AVG(latency) AS avgLatency,
				MAX(latency) AS maxLatency,
				MIN(latency) AS minLatency
			FROM monitoring_data
			WHERE monitor_tag = @monitor_tag AND timestamp >= @start AND timestamp <= @end;
		`);
		return stmt.get({ monitor_tag, start, end });
	}

	async getDataGroupByDayAlternative(monitor_tag, start, end) {
		// Fetch all raw data
		let stmt = this.db.prepare(`
			SELECT 
				timestamp,
				status,
				latency
			FROM monitoring_data
			WHERE monitor_tag = ? AND timestamp >= ? AND timestamp <= ?
			ORDER BY timestamp ASC;
		`);

		return stmt.all(monitor_tag, start, end); //{ timestamp: 1732900380, status: 'UP', latency: 42 }
	}

	async background() {
		//clear data older than 90 days
		let ninetyDaysAgo = GetMinuteStartNowTimestampUTC() - 86400 * 90;
		let stmt = this.db.prepare(`
			DELETE FROM monitoring_data
			WHERE timestamp < @ninetyDaysAgo;
		`);
	}

	async consecutivelyStatusFor(monitor_tag, status, lastX) {
		let stmt = this.db.prepare(`
			SELECT 
				CASE 
					WHEN COUNT(*) <= SUM(CASE WHEN status = @status THEN 1 ELSE 0 END) THEN 1 
					ELSE 0 
				END AS isAffected 
			FROM (
				SELECT * 
				FROM monitoring_data 
				where monitor_tag = @monitor_tag
				ORDER BY timestamp DESC
				LIMIT @lastX
			) AS last_four;
		`);
		return stmt.get({ monitor_tag, status, lastX }).isAffected == 1;
	}

	//insert alert
	async insertAlert(data) {
		//if alert exists return

		if (await this.alertExists(data.monitor_tag, data.monitor_status, data.alert_status)) {
			return;
		}

		let stmt = this.db.prepare(`
			INSERT INTO monitor_alerts (monitor_tag, monitor_status, alert_status, health_checks)
			VALUES (@monitor_tag, @monitor_status, @alert_status, @health_checks);
		`);
		let x = stmt.run(data);

		// Return the created row
		return await this.getActiveAlert(data.monitor_tag, data.monitor_status, data.alert_status);
	}

	//check if alert exists given monitor_tag, monitor_status, trigger_status
	async alertExists(monitor_tag, monitor_status, alert_status) {
		let stmt = this.db.prepare(`
			SELECT COUNT(*) AS count
			FROM monitor_alerts
			WHERE monitor_tag = @monitor_tag AND monitor_status = @monitor_status AND alert_status = @alert_status;
		`);

		let res = stmt.get({ monitor_tag, monitor_status, alert_status });
		return res.count > 0;
	}

	//get active alert given incident id, monitor tag, monitor status
	async getActiveAlertIncident(monitor_tag, monitor_status, incident_number) {
		let stmt = this.db.prepare(`
			SELECT * FROM monitor_alerts
			WHERE monitor_tag = @monitor_tag AND monitor_status = @monitor_status AND incident_number = @incident_number;
		`);
		return stmt.get({ monitor_tag, monitor_status, incident_number });
	}

	//return active alert for a monitor_tag, monitor_status, trigger_status = ACTIVE
	async getActiveAlert(monitor_tag, monitor_status, alert_status) {
		let stmt = this.db.prepare(`
			SELECT * FROM monitor_alerts
			WHERE monitor_tag = @monitor_tag AND monitor_status = @monitor_status AND alert_status = @alert_status;
		`);
		return stmt.get({ monitor_tag, monitor_status, alert_status });
	}

	//get all monitor_alerts paginated descending order
	async getMonitorAlertsPaginated(page, limit) {
		let stmt = this.db.prepare(`
			SELECT * FROM monitor_alerts
			ORDER BY id DESC
			LIMIT @limit OFFSET @offset;
		`);
		return stmt.all({ limit, offset: (page - 1) * limit });
	}

	//get total count of monitor_alerts
	async getMonitorAlertsCount() {
		let stmt = this.db.prepare(`
			SELECT COUNT(*) AS count FROM monitor_alerts;
		`);
		return stmt.get();
	}

	//update alert to inactive given monitor_tag, monitor_status, given id
	async updateAlertStatus(id, alert_status) {
		let stmt = this.db.prepare(`
			UPDATE monitor_alerts
			SET alert_status = @alert_status, updated_at = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		stmt.run({ id, alert_status });
	}

	//increment health_checks for an alert given id
	async incrementAlertHealthChecks(id) {
		let stmt = this.db.prepare(`
			UPDATE monitor_alerts
			SET health_checks = health_checks + 1, updated_at = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		stmt.run({ id });
	}

	//add incident_number to an alert given id
	async addIncidentNumberToAlert(id, incident_number) {
		let stmt = this.db.prepare(`
			UPDATE monitor_alerts
			SET incident_number = @incident_number, updated_at = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		stmt.run({ id, incident_number });
	}

	//insert or update site data
	async insertOrUpdateSiteData(key, value, data_type) {
		let stmt = this.db.prepare(`
			INSERT INTO site_data (key, value, data_type)
			VALUES (@key, @value, @data_type)
			ON CONFLICT(key) DO UPDATE SET
				value = excluded.value,
				updated_at = CURRENT_TIMESTAMP;
		`);
		stmt.run({ key, value, data_type });
	}
	//get all site data
	async getAllSiteData() {
		let stmt = this.db.prepare(`
			SELECT * FROM site_data;
		`);
		return stmt.all();
	}

	//given key get data
	async getSiteData(key) {
		let stmt = this.db.prepare(`
			SELECT value FROM site_data
			WHERE key = @key
			LIMIT 1;
		`);
		return stmt.get({ key });
	}

	//insert into monitors
	async insertMonitor(data) {
		let stmt = this.db.prepare(`
			INSERT INTO monitors (
				tag,
				name,
				description,
				image,
				cron,
				default_status,
				status,
				category_name,
				monitor_type,
				type_data,
				day_degraded_minimum_count,
				day_down_minimum_count,
				include_degraded_in_downtime
			)
			VALUES (
				@tag,
				@name,
				@description,
				@image,
				@cron,
				@default_status,
				@status,
				@category_name,
				@monitor_type,
				@type_data,
				@day_degraded_minimum_count,
				@day_down_minimum_count,
				@include_degraded_in_downtime
			);
		`);
		return stmt.run(data);
	}

	//update monitor by id
	async updateMonitor(data) {
		let stmt = this.db.prepare(`
			UPDATE monitors
			SET
				tag = @tag,
				name = @name,
				description = @description,
				image = @image,
				cron = @cron,
				default_status = @default_status,
				status = @status,
				category_name = @category_name,
				monitor_type = @monitor_type,
				type_data = @type_data,
				day_degraded_minimum_count = @day_degraded_minimum_count,
				day_down_minimum_count = @day_down_minimum_count,
				include_degraded_in_downtime = @include_degraded_in_downtime,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		return stmt.run(data);
	}

	async updateMonitorTrigger(data) {
		let stmt = this.db.prepare(`
			UPDATE monitors
			SET
				down_trigger = @down_trigger,
				degraded_trigger = @degraded_trigger,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		return stmt.run(data);
	}

	//get monitors given status
	async getMonitors(data) {
		let stmt = this.db.prepare(`
			SELECT * FROM monitors
			WHERE status = @status order by id desc;
		`);
		return stmt.all({ status: data.status });
	}

	//get monitor by tag
	async getMonitorByTag(tag) {
		let stmt = this.db.prepare(`
			SELECT * FROM monitors
			WHERE tag = @tag;
		`);
		return stmt.get({ tag });
	}

	//insert alert
	async createNewTrigger(data) {
		let stmt = this.db.prepare(`
			INSERT INTO triggers (name, trigger_type, trigger_status, trigger_meta, trigger_desc)
			VALUES (@name, @trigger_type, @trigger_status, @trigger_meta, @trigger_desc);
		`);
		return stmt.run(data);
	}

	//update alert
	async updateTrigger(data) {
		let stmt = this.db.prepare(`
			UPDATE triggers
			SET
				name = @name,
				trigger_type = @trigger_type,
				trigger_status = @trigger_status,
				trigger_desc = @trigger_desc,
				trigger_meta = @trigger_meta,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		return stmt.run(data);
	}

	//get all alerts with given status
	async getTriggers(data) {
		let stmt = this.db.prepare(`
			SELECT * FROM triggers
			WHERE trigger_status = @trigger_status order by id desc;
		`);
		return stmt.all({ trigger_status: data.status });
	}

	//get count of users
	async getUsersCount() {
		let stmt = this.db.prepare(`
			SELECT COUNT(*) AS count FROM users;
		`);
		return stmt.get();
	}

	// get user by email, do not return password_hash
	async getUserByEmail(email) {
		let stmt = this.db.prepare(`
			SELECT id, email, name, is_active, is_verified, role, created_at, updated_at
			FROM users
			WHERE email = @email;
		`);
		return stmt.get({ email });
	}
	async getUserPasswordHashById(id) {
		let stmt = this.db.prepare(`
			SELECT password_hash
			FROM users
			WHERE id = @id;
		`);
		return stmt.get({ id });
	}

	//insert user
	async insertUser(data) {
		let stmt = this.db.prepare(`
			INSERT INTO users (email, name, password_hash, role)
			VALUES (@email, @name, @password_hash, @role);
		`);
		return stmt.run(data);
	}

	//new api key
	async createNewApiKey(data) {
		let stmt = this.db.prepare(`
			INSERT INTO api_keys (name, hashed_key, masked_key)
			VALUES (@name, @hashed_key, @masked_key);
		`);
		return stmt.run(data);
	}

	//update status of api key
	async updateApiKeyStatus(data) {
		let stmt = this.db.prepare(`
			UPDATE api_keys
			SET status = @status, updated_at = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		return stmt.run(data);
	}

	//get key by hashed_key
	async getApiKeyByHashedKey(hashed_key) {
		let stmt = this.db.prepare(`
			SELECT * FROM api_keys
			WHERE hashed_key = @hashed_key;
		`);
		return stmt.get({ hashed_key });
	}

	//get all api keys
	async getAllApiKeys() {
		let stmt = this.db.prepare(`
			SELECT * FROM api_keys order by id desc;
		`);
		return stmt.all();
	}

	//close
	close() {
		this.db.close();
	}

	async createIncident(data) {
		let stmt = this.db.prepare(`
			INSERT INTO incidents (title, start_date_time, end_date_time, status, state)
			VALUES (@title, @start_date_time, @end_date_time, @status, @state);
		`);
		return stmt.run(data);
	}

	//get incidents paginated
	async getIncidentsPaginatedDesc(page, limit, filter) {
		let query = `
			SELECT * FROM incidents WHERE 1=1
		`;
		let params = { limit, offset: (page - 1) * limit };
		if (filter && filter.status) {
			params.status = filter.status;
			query += ` AND status = @status `;
		}

		//if filter.start then it shuld be greater than filter.start
		if (filter && filter.start) {
			params.start = filter.start;
			query += ` AND start_date_time >= @start `;
		}

		//if filter.end then it should be less than filter.end
		if (filter && filter.end) {
			params.end = filter.end;
			query += ` AND start_date_time <= @end `;
		}

		query += `
			ORDER BY id DESC
			LIMIT @limit OFFSET @offset;
		`;

		let stmt = this.db.prepare(query);
		return stmt.all(params);
	}

	//get last 10 recent updated incidents
	async getRecentUpdatedIncidents(limit, start, end) {
		let stmt = this.db.prepare(`
			SELECT * FROM incidents
			where status = 'OPEN' AND start_date_time >= @start AND start_date_time <= @end
			ORDER BY updated_at DESC
			LIMIT @limit;
		`);
		return stmt.all({
			limit,
			start,
			end
		});
	}

	//get id of first incident less than given start_date_time
	async getPreviousIncidentId(start_date_time) {
		let stmt = this.db.prepare(`
			SELECT id FROM incidents
			WHERE start_date_time < @start_date_time
			ORDER BY start_date_time DESC
			LIMIT 1;
		`);
		return stmt.get({ start_date_time });
	}

	//get incidents where ts between start and end
	async getIncidentsBetween(start, end) {
		let stmt = this.db.prepare(`
			SELECT * FROM incidents
			WHERE status = 'OPEN' AND start_date_time >= @start AND start_date_time <= @end order by start_date_time ASC;
		`);
		return stmt.all({ start, end });
	}

	//get total incident count
	async getIncidentsCount(filter) {
		let query = `
			SELECT COUNT(*) AS count FROM incidents
		`;
		let params = {};
		if (filter && filter.status) {
			params.status = filter.status;
			query += ` WHERE status = @status `;
		}

		let stmt = this.db.prepare(query);
		return stmt.get(params);
	}

	//update incident given id
	async updateIncident(data) {
		let stmt = this.db.prepare(`
			UPDATE incidents
			SET
				title = @title,
				start_date_time = @start_date_time,
				end_date_time = @end_date_time,
				status = @status,
				state = @state,
				updated_at = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		return stmt.run(data);
	}

	//set incident end time to null
	async setIncidentEndTimeToNull(id) {
		let stmt = this.db.prepare(`
			UPDATE incidents
			SET end_date_time = NULL, updated_at = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		return stmt.run({ id });
	}

	async insertIncidentMonitor(data) {
		let stmt = this.db.prepare(`
			INSERT INTO incident_monitors (monitor_tag, monitor_impact, incident_id)
			VALUES (@monitor_tag, @monitor_impact, @incident_id);
		`);
		return stmt.run(data);
	}

	//get incident by id
	async getIncidentById(id) {
		let stmt = this.db.prepare(`
			SELECT i.id AS id,
				i.title AS title,
				i.start_date_time AS start_date_time,
				i.end_date_time AS end_date_time,
				i.created_at AS created_at,
				i.updated_at AS updated_at,
				i.status AS status,
				i.state AS state
			FROM incidents i
			WHERE id = @id;
		`);
		return stmt.get({ id });
	}

	//get incidet_monitors by incident_id
	async getIncidentMonitorsByIncidentID(incident_id) {
		let stmt = this.db.prepare(`
			SELECT im.monitor_tag, im.monitor_impact FROM incident_monitors im
			WHERE incident_id = @incident_id;
		`);
		return stmt.all({ incident_id });
	}

	//given a monitor tag get incidents last 90 days status = OPEN
	async getIncidentsByMonitorTag(monitor_tag, start, end) {
		let stmt = this.db.prepare(`
			SELECT 
				i.id AS id,
				i.title AS title,
				i.start_date_time AS start_date_time,
				i.end_date_time AS end_date_time,
				i.created_at AS created_at,
				i.updated_at AS updated_at,
				i.status AS status,
				i.state AS state,
				im.monitor_impact
			FROM incidents i
			INNER JOIN incident_monitors im
			ON i.id = im.incident_id
			WHERE im.monitor_tag = @monitor_tag AND i.start_date_time >= @start AND i.start_date_time <= @end AND i.status='OPEN';
		`);
		return stmt.all({ monitor_tag, start, end });
	}

	//given a timestamp get incidents that are open and start time is less than given timestamp
	async getIncidentsByMonitorTagRealtime(monitor_tag, timestamp) {
		let stmt = this.db.prepare(`
			SELECT 
				i.id AS id,
				i.start_date_time AS start_date_time,
				i.end_date_time AS end_date_time,
				im.monitor_impact
			FROM incidents i
			INNER JOIN incident_monitors im
			ON i.id = im.incident_id
			WHERE im.monitor_tag = @monitor_tag AND i.start_date_time < @timestamp AND i.status = 'OPEN' AND i.state != 'RESOLVED';
		`);
		return stmt.all({ monitor_tag, timestamp });
	}

	//given array of ids get incidents
	async getIncidentsByIds(ids) {
		let stmt = this.db.prepare(`
			SELECT * FROM incidents
			WHERE status='OPEN' AND id IN (${ids.map(() => "?").join(",")});
		`);
		return stmt.all(ids);
	}

	//remove monitor tag from incident given incident_id and monitor_tag
	async removeIncidentMonitor(incident_id, monitor_tag) {
		let stmt = this.db.prepare(`
			DELETE FROM incident_monitors
			WHERE incident_id = @incident_id AND monitor_tag = @monitor_tag;
		`);
		return stmt.run({ incident_id, monitor_tag });
	}

	//add monitor tag to incident given incident_id and monitor_tag along with monitor_impact
	async insertIncidentMonitor(incident_id, monitor_tag, monitor_impact) {
		let stmt = this.db.prepare(`
			INSERT INTO incident_monitors (monitor_tag, monitor_impact, incident_id)
			VALUES (@monitor_tag, @monitor_impact, @incident_id)
			ON CONFLICT(monitor_tag, incident_id) DO UPDATE SET
				monitor_impact = excluded.monitor_impact,
				updated_at = CURRENT_TIMESTAMP;
		`);
		return stmt.run({ incident_id, monitor_tag, monitor_impact });
	}

	//return monitor tags with incidents using join incidents & incident_monitors
	async getIncidentCompleteByIncidentID(incident_id) {
		let stmt = this.db.prepare(`
			SELECT 
				i.id AS incident_id,
				i.title AS incident_title,
				i.description AS incident_description,
				i.start_date_time AS incident_start_date_time,
				i.end_date_time AS incident_end_date_time,
				i.created_at AS incident_created_at,
				i.updated_at AS incident_updated_at,
				i.status AS incident_status,
				i.identified AS incident_identified,
				i.maintenance AS incident_maintenance,
				im.monitor_tag,
				im.monitor_impact
			FROM 
				incidents i
			INNER JOIN 
				incident_monitors im
			ON 
				i.id = im.incident_id
			WHERE i.id = @incident_id;
		`);
		return stmt.all({ incident_id });
	}

	//insert incident_comment
	async insertIncidentComment(incident_id, comment, state, commented_at) {
		let stmt = this.db.prepare(`
			INSERT INTO incident_comments (comment, incident_id, state, commented_at)
			VALUES (@comment, @incident_id, @state, @commented_at);
		`);
		return stmt.run({ comment, incident_id, state, commented_at });
	}

	//get comments for an incident
	async getIncidentComments(incident_id) {
		let stmt = this.db.prepare(`
			SELECT * FROM incident_comments
			WHERE incident_id = @incident_id order by commented_at desc;
		`);
		return stmt.all({ incident_id });
	}

	//get active comments
	async getActiveIncidentComments(incident_id) {
		let stmt = this.db.prepare(`
			SELECT * FROM incident_comments
			WHERE incident_id = @incident_id AND status = 'ACTIVE' order by commented_at desc;
		`);
		return stmt.all({ incident_id });
	}

	//get comment by id and incident_id
	async getIncidentCommentByIDAndIncident(incident_id, id) {
		let stmt = this.db.prepare(`
			SELECT * FROM incident_comments
			WHERE incident_id = @incident_id AND id = @id;
		`);
		return stmt.get({ incident_id, id });
	}

	//update incident comment
	async updateIncidentCommentByID(id, comment, state, commented_at) {
		let stmt = this.db.prepare(`
			UPDATE incident_comments
			SET comment = @comment, state = @state, commented_at = @commented_at,  updated_at = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		return stmt.run({ id, comment, state, commented_at });
	}

	//update status of incident comment
	async updateIncidentCommentStatusByID(id, status) {
		let stmt = this.db.prepare(`
			UPDATE incident_comments
			SET status = @status, updated_at = CURRENT_TIMESTAMP
			WHERE id = @id;
		`);
		return stmt.run({ id, status });
	}

	//getIncidentCommentByID
	async getIncidentCommentByID(id) {
		let stmt = this.db.prepare(`
			SELECT * FROM incident_comments
			WHERE id = @id;
		`);
		return stmt.get({ id });
	}
}

export default Sqlite;

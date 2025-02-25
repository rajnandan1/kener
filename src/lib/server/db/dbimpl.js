// @ts-nocheck
import { Database } from "lucide-svelte";
import { GetMinuteStartNowTimestampUTC } from "../tool.js";
import { MANUAL } from "../constants.js";
import Knex from "knex";

class DbImpl {
  knex;
  constructor(opts) {
    // Initialize Knex
    this.knex = Knex(opts);

    this.init();
  }

  async init() {}

  async insertMonitoringData(data) {
    const { monitor_tag, timestamp, status, latency, type } = data;
    return await this.knex("monitoring_data")
      .insert({ monitor_tag, timestamp, status, latency, type })
      .onConflict(["monitor_tag", "timestamp"])
      .merge({ status, latency, type });
  }

  //given monitor_tag, start and end timestamp in utc seconds return data
  async getMonitoringData(monitor_tag, start, end) {
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .where("timestamp", ">=", start)
      .where("timestamp", "<=", end)
      .orderBy("timestamp", "asc");
  }

  //get latest data for a monitor_tag
  async getLatestMonitoringData(monitor_tag) {
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .orderBy("timestamp", "desc")
      .limit(1)
      .first();
  }

  //given monitor_tag, start and end timestamp in utc seconds return total degraded, up, down, avg(latency), max(latency), min(latency)
  async getAggregatedMonitoringData(monitor_tag, start, end) {
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

  //get the last status before the timestamp given monitor_tag and start timestamp
  async getLastStatusBefore(monitor_tag, timestamp) {
    return await this.knex("monitoring_data")
      .where("monitor_tag", monitor_tag)
      .where("timestamp", "<", timestamp)
      .orderBy("timestamp", "desc")
      .limit(1)
      .first();
  }

  async getDataGroupByDayAlternative(monitor_tag, start, end) {
    // Fetch all raw data
    //{ timestamp: 1732900380, status: 'UP', latency: 42 }

    const data = await this.knex("monitoring_data")
      .select("timestamp", "status", "latency")
      .where("monitor_tag", monitor_tag)
      .andWhere("timestamp", ">=", start)
      .andWhere("timestamp", "<=", end)
      .orderBy("timestamp", "asc");
    return data;
  }

  async getLastStatusBeforeCombined(monitor_tags_arr, timestamp) {
    //monitor_tag_arr is an array of string
    return await this.knex("monitoring_data")
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
      .whereIn("monitor_tag", monitor_tags_arr)
      .where("timestamp", "=", timestamp)
      .groupBy("timestamp")
      .havingRaw("COUNT(*) = ?", [monitor_tags_arr.length])
      .orderBy("timestamp", "desc")
      .limit(1)
      .first();
  }

  async background() {
    //clear data older than 90 days
    let ninetyDaysAgo = GetMinuteStartNowTimestampUTC() - 86400 * 100;

    return await this.knex("monitoring_data").where("timestamp", "<", ninetyDaysAgo).del();
  }

  async consecutivelyStatusFor(monitor_tag, status, lastX) {
    const result = await this.knex
      .with("last_records", (qb) => {
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

  //insert alert
  async insertAlert(data) {
    return await this.knex("monitor_alerts").insert({
      monitor_tag: data.monitor_tag,
      monitor_status: data.monitor_status,
      alert_status: data.alert_status,
      health_checks: data.health_checks,
    });
  }

  //given incident_number check if there is an alert
  async alertExistsIncident(incident_number) {
    const result = await this.knex("monitor_alerts")
      .count("* as count")
      .where({
        incident_number,
      })
      .first();
    return result.count > 0;
  }

  //check if alert exists given monitor_tag, monitor_status, trigger_status
  async alertExists(monitor_tag, monitor_status, alert_status) {
    const result = await this.knex("monitor_alerts")
      .count("* as count")
      .where({
        monitor_tag,
        monitor_status,
        alert_status,
      })
      .first();
    return result.count > 0;
  }

  //get active alert given incident id, monitor tag, monitor status
  async getActiveAlertIncident(monitor_tag, monitor_status, incident_number) {
    return await this.knex("monitor_alerts")
      .where({
        monitor_tag,
        monitor_status,
        incident_number,
      })
      .first();
  }

  //get active alert given incident id, monitor tag, monitor status
  async getAllActiveAlertIncidents(monitor_tag) {
    return await this.knex("monitor_alerts")
      .where({
        monitor_tag,
        alert_status: "TRIGGERED",
      })
      .andWhere("incident_number", ">", 0)
      .orderBy("id", "desc");
  }

  //return active alert for a monitor_tag, monitor_status, trigger_status = ACTIVE
  async getActiveAlert(monitor_tag, monitor_status, alert_status) {
    return await this.knex("monitor_alerts")
      .where({
        monitor_tag,
        monitor_status,
        alert_status,
      })
      .first();
  }

  //get all monitor_alerts paginated descending order
  async getMonitorAlertsPaginated(page, limit) {
    return await this.knex("monitor_alerts")
      .orderBy("id", "desc")
      .limit(limit)
      .offset((page - 1) * limit);
  }

  //get total count of monitor_alerts
  async getMonitorAlertsCount() {
    return await this.knex("monitor_alerts").count("* as count").first();
  }

  //update alert to inactive given monitor_tag, monitor_status, given id
  async updateAlertStatus(id, alert_status) {
    return await this.knex("monitor_alerts").where({ id }).update({
      alert_status,
      updated_at: this.knex.fn.now(),
    });
  }

  //increment health_checks for an alert given id
  async incrementAlertHealthChecks(id) {
    return await this.knex("monitor_alerts")
      .where({ id })
      .increment("health_checks", 1)
      .update({ updated_at: this.knex.fn.now() });
  }

  //add incident_number to an alert given id
  async addIncidentNumberToAlert(id, incident_number) {
    return await this.knex("monitor_alerts").where({ id }).update({
      incident_number,
      updated_at: this.knex.fn.now(),
    });
  }

  //insert or update site data
  async insertOrUpdateSiteData(key, value, data_type) {
    return await this.knex("site_data")
      .insert({ key, value, data_type })
      .onConflict("key")
      .merge({ value, updated_at: this.knex.fn.now() });
  }
  //get all site data
  async getAllSiteData() {
    return await this.knex("site_data");
  }

  //given key get data
  async getSiteData(key) {
    return await this.knex("site_data").select("value").where("key", key).first();
  }

  async getSiteDataByKey(key) {
    //select all
    return await this.knex("site_data").where("key", key).first();
  }

  //insert into monitors
  async insertMonitor(data) {
    return await this.knex("monitors").insert({
      tag: data.tag,
      name: data.name,
      description: data.description,
      image: data.image,
      cron: data.cron,
      default_status: data.default_status,
      status: data.status,
      category_name: data.category_name,
      monitor_type: data.monitor_type,
      type_data: data.type_data,
      day_degraded_minimum_count: data.day_degraded_minimum_count,
      day_down_minimum_count: data.day_down_minimum_count,
      include_degraded_in_downtime: data.include_degraded_in_downtime,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  //update monitor by id
  async updateMonitor(data) {
    return await this.knex("monitors").where({ id: data.id }).update({
      tag: data.tag,
      name: data.name,
      description: data.description,
      image: data.image,
      cron: data.cron,
      default_status: data.default_status,
      status: data.status,
      category_name: data.category_name,
      monitor_type: data.monitor_type,
      type_data: data.type_data,
      day_degraded_minimum_count: data.day_degraded_minimum_count,
      day_down_minimum_count: data.day_down_minimum_count,
      include_degraded_in_downtime: data.include_degraded_in_downtime,
      updated_at: this.knex.fn.now(),
    });
  }

  async updateMonitorTrigger(data) {
    return await this.knex("monitors").where({ id: data.id }).update({
      down_trigger: data.down_trigger,
      degraded_trigger: data.degraded_trigger,
      updated_at: this.knex.fn.now(),
    });
  }

  //get monitors given status
  async getMonitors(data) {
    let query = this.knex("monitors").whereRaw("1=1");
    if (!!data.status) {
      query = query.andWhere("status", data.status);
    }
    if (data.category_name && data.category_name !== "All Categories") {
      query = query.andWhere("category_name", data.category_name);
    }
    if (!!data.id) {
      query = query.andWhere("id", data.id);
    }
    if (!!data.tag) {
      query = query.andWhere("tag", data.tag);
    }
    if (!!data.tags) {
      query = query.andWhere((builder) => {
        builder.whereIn("tag", data.tags);
      });
    }
    return await query.orderBy("id", "desc");
  }

  //get monitor by tag
  async getMonitorByTag(tag) {
    return await this.knex("monitors").where("tag", tag).first();
  }

  //insert alert
  async createNewTrigger(data) {
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

  //update alert
  async updateTrigger(data) {
    return await this.knex("triggers").where({ id: data.id }).update({
      name: data.name,
      trigger_type: data.trigger_type,
      trigger_status: data.trigger_status,
      trigger_desc: data.trigger_desc,
      trigger_meta: data.trigger_meta,
      updated_at: this.knex.fn.now(),
    });
  }

  //get all alerts with given status
  async getTriggers(data) {
    let query = this.knex("triggers").whereRaw("1=1");
    if (!!data.status) {
      query = query.andWhere("trigger_status", data.status);
    }
    if (!!data.id) {
      query = query.andWhere("id", data.id);
    }
    return await query.orderBy("id", "desc");
  }

  //get trigger by id
  async getTriggerByID(id) {
    return await this.knex("triggers").where("id", id).first();
  }

  //get count of users
  async getUsersCount() {
    return await this.knex("users").count("* as count").first();
  }

  // get user by email, do not return password_hash
  async getUserByEmail(email) {
    return await this.knex("users")
      .select("id", "email", "name", "is_active", "is_verified", "role", "created_at", "updated_at")
      .where("email", email)
      .first();
  }
  async getUserPasswordHashById(id) {
    return await this.knex("users").select("password_hash").where("id", id).first();
  }

  //insert user
  async insertUser(data) {
    return await this.knex("users").insert({
      email: data.email,
      name: data.name,
      password_hash: data.password_hash,
      role: data.role,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  //update password
  async updateUserPassword(data) {
    return await this.knex("users").where({ id: data.id }).update({
      password_hash: data.password_hash,
      updated_at: this.knex.fn.now(),
    });
  }

  //new api key
  async createNewApiKey(data) {
    return await this.knex("api_keys").insert({
      name: data.name,
      hashed_key: data.hashed_key,
      masked_key: data.masked_key,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  //update status of api key
  async updateApiKeyStatus(data) {
    return await this.knex("api_keys").where({ id: data.id }).update({
      status: data.status,
      updated_at: this.knex.fn.now(),
    });
  }

  //get key by hashed_key
  async getApiKeyByHashedKey(hashed_key) {
    return await this.knex("api_keys").where("hashed_key", hashed_key).first();
  }

  //get all api keys
  async getAllApiKeys() {
    return await this.knex("api_keys").orderBy("id", "desc");
  }

  //close
  async close() {
    return await this.knex.destroy();
  }

  async createIncident(data) {
    const [incident] = await this.knex("incidents")
      .insert({
        title: data.title,
        start_date_time: data.start_date_time,
        end_date_time: data.end_date_time,
        status: data.status,
        state: data.state,
        created_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
        incident_type: data.incident_type,
        incident_source: data.incident_source,
      })
      .returning("*");
    return incident;
  }

  //get incidents paginated
  async getIncidentsPaginatedDesc(page, limit, filter) {
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

    query = query
      .orderBy("id", "desc")
      .limit(limit)
      .offset((page - 1) * limit);

    return await query;
  }

  //get last 10 recent updated incidents
  async getRecentUpdatedIncidents(limit, start, end) {
    return await this.knex("incidents")
      .where("status", "OPEN")
      .andWhere("start_date_time", ">=", start)
      .andWhere("start_date_time", "<=", end)
      .orderBy("updated_at", "desc")
      .limit(limit);
  }

  //get id of first incident less than given start_date_time
  async getPreviousIncidentId(start_date_time) {
    return await this.knex("incidents")
      .select("id")
      .where("start_date_time", "<", start_date_time)
      .orderBy("start_date_time", "desc")
      .first();
  }

  //get incidents where ts between start and end
  async getIncidentsBetween(start, end) {
    return await this.knex("incidents")
      .where("status", "OPEN")
      .andWhere("start_date_time", ">=", start)
      .andWhere("start_date_time", "<=", end)
      .orderBy("start_date_time", "asc");
  }

  //get total incident count
  async getIncidentsCount(filter) {
    let query = this.knex("incidents").count("* as count");

    if (filter && filter.status) {
      query = query.where("status", filter.status);
    }

    return await query.first();
  }

  //update incident given id
  async updateIncident(data) {
    return await this.knex("incidents").where({ id: data.id }).update({
      title: data.title,
      start_date_time: data.start_date_time,
      end_date_time: data.end_date_time,
      status: data.status,
      state: data.state,
      updated_at: this.knex.fn.now(),
    });
  }

  //set incident end time to null
  async setIncidentEndTimeToNull(id) {
    return await this.knex("incidents").where({ id }).update({
      end_date_time: null,
      updated_at: this.knex.fn.now(),
    });
  }

  async insertIncidentMonitor(data) {
    return await this.knex("incident_monitors").insert({
      monitor_tag: data.monitor_tag,
      monitor_impact: data.monitor_impact,
      incident_id: data.incident_id,
    });
  }

  //get incident by id
  async getIncidentById(id) {
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
      )
      .where("id", id)
      .first();
  }

  //get incident_monitors by incident_id
  async getIncidentMonitorsByIncidentID(incident_id) {
    return await this.knex("incident_monitors")
      .select("monitor_tag", "monitor_impact")
      .where("incident_id", incident_id);
  }

  //given a monitor tag get incidents last 90 days status = OPEN
  async getIncidentsByMonitorTag(monitor_tag, start, end) {
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

  //given a timestamp get incidents that are open and start time is less than given timestamp
  async getIncidentsByMonitorTagRealtime(monitor_tag, timestamp) {
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

  //get maintenance incidents by monitor tag
  async getMaintenanceByMonitorTagRealtime(monitor_tag, timestamp) {
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

  //given array of ids get incidents
  async getIncidentsByIds(ids) {
    return await this.knex("incidents").whereIn("id", ids).andWhere("status", "OPEN");
  }

  //remove monitor tag from incident given incident_id and monitor_tag
  async removeIncidentMonitor(incident_id, monitor_tag) {
    return await this.knex("incident_monitors").where({ incident_id, monitor_tag }).del();
  }

  //add monitor tag to incident given incident_id and monitor_tag along with monitor_impact
  async insertIncidentMonitor(incident_id, monitor_tag, monitor_impact) {
    return await this.knex("incident_monitors")
      .insert({ monitor_tag, monitor_impact, incident_id })
      .onConflict(["monitor_tag", "incident_id"])
      .merge({ monitor_impact, updated_at: this.knex.fn.now() });
  }

  //insert incident_comment
  async insertIncidentComment(incident_id, comment, state, commented_at) {
    return await this.knex("incident_comments").insert({
      comment,
      incident_id,
      state,
      commented_at,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  //get comments for an incident
  async getIncidentComments(incident_id) {
    return await this.knex("incident_comments").where("incident_id", incident_id).orderBy("commented_at", "desc");
  }

  //get active comments
  async getActiveIncidentComments(incident_id) {
    return await this.knex("incident_comments")
      .where("incident_id", incident_id)
      .andWhere("status", "ACTIVE")
      .orderBy("commented_at", "desc");
  }

  //get comment by id and incident_id
  async getIncidentCommentByIDAndIncident(incident_id, id) {
    return await this.knex("incident_comments").where({ incident_id, id }).first();
  }

  //update incident comment
  async updateIncidentCommentByID(id, comment, state, commented_at) {
    return await this.knex("incident_comments").where({ id }).update({
      comment,
      state,
      commented_at,
      updated_at: this.knex.fn.now(),
    });
  }

  //update status of incident comment
  async updateIncidentCommentStatusByID(id, status) {
    return await this.knex("incident_comments").where({ id }).update({
      status,
      updated_at: this.knex.fn.now(),
    });
  }

  //getIncidentCommentByID
  async getIncidentCommentByID(id) {
    return await this.knex("incident_comments").where({ id }).first();
  }
	//getIncidentCommentByID
	async getIncidentCommentByID(id) {
		return await this.knex("incident_comments").where({ id }).first();
	}
	//validate if subscriber exists
	async subscriberExists(data) {
		const result = await this.knex("subscribers")
			.where({
				email: data.email,
				incident_id: data.incident_id
			})
			.first();
		return !!result;
	}

	async tokenExists(data) {
		const result = await this.knex("subscribers").where("token", data.token).first();
		return !!result;
	}

	//get all subscribers
	async getSubscribers() {
		return await this.knex("subscribers").orderBy("id", "desc");
    ;
	}
	async getGlobalSubscribers() {
		return await this.knex("subscribers").where("incident_id", 0).where("status", "ACTIVE");
	}

	//subscriber subscribe to incident
	async subscribeToIncidentID(data) {
		return await this.knex("subscribers").insert({
			email: data.email,
			incident_id: data.incident_id,
			token: data.token
		});
	}

	async getSubscriberByIncidentID(data) {
		return await this.knex("subscribers")
			.where("incident_id", data.incident_id)
			.where("status", "ACTIVE");
	}

	async unsubscribeBySubscriberToken(data) {
		return await this.knex("subscribers")
			.where("token", data.token)
			.update({ 
        status: "INACTIVE",
        updated_at: this.knex.fn.now()
       });
	}

	async getSubscriberByID(data) {
		return await this.knex("subscribers").where("id", data.id).first();
	}

	async subscriberIsInactive(data) {
		const result = await this.knex("subscribers")
			.where("email", data.email)
			.where("status", "INACTIVE")
			.where("incident_id", data.incident_id)
			.first();
		return !!result;
	}

	async activateSubscriberByID(data) {
		let result = await this.knex("subscribers")
			.where("email", data.email)
			.where("incident_id", data.incident_id)
			.update({
				status: "ACTIVE",
        updated_at: this.knex.fn.now()
			});
		return result;
	}

	async getSubscriberByToken(data) {
		return await this.knex("subscribers").where("token", data.token).first();
	}
}

export default DbImpl;

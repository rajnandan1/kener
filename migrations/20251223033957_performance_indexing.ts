import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // monitoring_data indexes
  // For queries: WHERE monitor_tag = ? AND type = ? ORDER BY timestamp DESC (getLastHeartbeat)
  await knex.schema.alterTable("monitoring_data", (table) => {
    table.index(["monitor_tag", "type", "timestamp"], "idx_monitoring_data_tag_type_ts");
  });

  // For background cleanup: WHERE timestamp < ?
  await knex.schema.alterTable("monitoring_data", (table) => {
    table.index(["timestamp"], "idx_monitoring_data_timestamp");
  });

  // monitor_alerts indexes
  // For queries: WHERE incident_number = ?
  await knex.schema.alterTable("monitor_alerts", (table) => {
    table.index(["incident_number"], "idx_monitor_alerts_incident_number");
  });

  // For queries: WHERE monitor_tag = ? AND monitor_status = ? AND alert_status = ?
  await knex.schema.alterTable("monitor_alerts", (table) => {
    table.index(["monitor_tag", "monitor_status", "alert_status"], "idx_monitor_alerts_tag_status_alert");
  });

  // monitors indexes
  // For queries: WHERE status = ?
  await knex.schema.alterTable("monitors", (table) => {
    table.index(["status"], "idx_monitors_status");
  });

  // For queries: WHERE category_name = ?
  await knex.schema.alterTable("monitors", (table) => {
    table.index(["category_name"], "idx_monitors_category");
  });

  // incidents indexes
  // For queries: WHERE status = ? ORDER BY start_date_time
  await knex.schema.alterTable("incidents", (table) => {
    table.index(["status", "start_date_time"], "idx_incidents_status_start");
  });

  // For queries: WHERE start_date_time >= ? AND start_date_time <= ?
  await knex.schema.alterTable("incidents", (table) => {
    table.index(["start_date_time", "end_date_time"], "idx_incidents_start_end");
  });

  // For queries: ORDER BY updated_at DESC (getRecentUpdatedIncidents)
  await knex.schema.alterTable("incidents", (table) => {
    table.index(["updated_at"], "idx_incidents_updated_at");
  });

  // For queries: WHERE state = ?
  await knex.schema.alterTable("incidents", (table) => {
    table.index(["state"], "idx_incidents_state");
  });

  // For queries: WHERE incident_type = ?
  await knex.schema.alterTable("incidents", (table) => {
    table.index(["incident_type"], "idx_incidents_type");
  });

  // incident_monitors indexes
  // For queries: WHERE incident_id = ? (joining with incidents)
  await knex.schema.alterTable("incident_monitors", (table) => {
    table.index(["incident_id"], "idx_incident_monitors_incident_id");
  });

  // For queries: WHERE monitor_tag = ? (getIncidentsByMonitorTag)
  await knex.schema.alterTable("incident_monitors", (table) => {
    table.index(["monitor_tag"], "idx_incident_monitors_monitor_tag");
  });

  // incident_comments indexes
  // For queries: WHERE incident_id = ?
  await knex.schema.alterTable("incident_comments", (table) => {
    table.index(["incident_id"], "idx_incident_comments_incident_id");
  });

  // For queries: WHERE incident_id = ? AND status = ?
  await knex.schema.alterTable("incident_comments", (table) => {
    table.index(["incident_id", "status"], "idx_incident_comments_incident_status");
  });

  // triggers indexes
  // For queries: WHERE trigger_status = ?
  await knex.schema.alterTable("triggers", (table) => {
    table.index(["trigger_status"], "idx_triggers_status");
  });

  // subscribers indexes
  // For queries: WHERE subscriber_status = ?
  await knex.schema.alterTable("subscribers", (table) => {
    table.index(["subscriber_status"], "idx_subscribers_status");
  });

  // For queries: WHERE subscriber_type = ?
  await knex.schema.alterTable("subscribers", (table) => {
    table.index(["subscriber_type"], "idx_subscribers_type");
  });

  // invitations indexes
  // For queries: WHERE invited_user_id = ? AND invitation_type = ? AND invitation_status = ?
  await knex.schema.alterTable("invitations", (table) => {
    table.index(["invited_user_id", "invitation_type", "invitation_status"], "idx_invitations_user_type_status");
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes in reverse order
  await knex.schema.alterTable("invitations", (table) => {
    table.dropIndex([], "idx_invitations_user_type_status");
  });

  await knex.schema.alterTable("subscribers", (table) => {
    table.dropIndex([], "idx_subscribers_type");
  });

  await knex.schema.alterTable("subscribers", (table) => {
    table.dropIndex([], "idx_subscribers_status");
  });

  await knex.schema.alterTable("triggers", (table) => {
    table.dropIndex([], "idx_triggers_status");
  });

  await knex.schema.alterTable("incident_comments", (table) => {
    table.dropIndex([], "idx_incident_comments_incident_status");
  });

  await knex.schema.alterTable("incident_comments", (table) => {
    table.dropIndex([], "idx_incident_comments_incident_id");
  });

  await knex.schema.alterTable("incident_monitors", (table) => {
    table.dropIndex([], "idx_incident_monitors_monitor_tag");
  });

  await knex.schema.alterTable("incident_monitors", (table) => {
    table.dropIndex([], "idx_incident_monitors_incident_id");
  });

  await knex.schema.alterTable("incidents", (table) => {
    table.dropIndex([], "idx_incidents_type");
  });

  await knex.schema.alterTable("incidents", (table) => {
    table.dropIndex([], "idx_incidents_state");
  });

  await knex.schema.alterTable("incidents", (table) => {
    table.dropIndex([], "idx_incidents_updated_at");
  });

  await knex.schema.alterTable("incidents", (table) => {
    table.dropIndex([], "idx_incidents_start_end");
  });

  await knex.schema.alterTable("incidents", (table) => {
    table.dropIndex([], "idx_incidents_status_start");
  });

  await knex.schema.alterTable("monitors", (table) => {
    table.dropIndex([], "idx_monitors_category");
  });

  await knex.schema.alterTable("monitors", (table) => {
    table.dropIndex([], "idx_monitors_status");
  });

  await knex.schema.alterTable("monitor_alerts", (table) => {
    table.dropIndex([], "idx_monitor_alerts_tag_status_alert");
  });

  await knex.schema.alterTable("monitor_alerts", (table) => {
    table.dropIndex([], "idx_monitor_alerts_incident_number");
  });

  await knex.schema.alterTable("monitoring_data", (table) => {
    table.dropIndex([], "idx_monitoring_data_timestamp");
  });

  await knex.schema.alterTable("monitoring_data", (table) => {
    table.dropIndex([], "idx_monitoring_data_tag_type_ts");
  });
}

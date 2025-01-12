// migrations/YYYYMMDDHHMMSS_create_monitoring_tables.js

export function up(knex) {
	return (
		knex.schema
			// Create monitoring_data table
			.createTable("monitoring_data", (table) => {
				table.text("monitor_tag").notNullable();
				table.integer("timestamp").notNullable();
				table.text("status");
				table.float("latency");
				table.text("type");
				table.primary(["monitor_tag", "timestamp"]);
			})
			// Create monitor_alerts table
			.createTable("monitor_alerts", (table) => {
				table.increments("id").primary();
				table.text("monitor_tag").notNullable();
				table.text("monitor_status").notNullable();
				table.text("alert_status").notNullable();
				table.integer("health_checks").notNullable();
				table.integer("incident_number").defaultTo(0);
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
			})
			// Add index to monitor_alerts table
			.raw(
				"CREATE INDEX idx_monitor_tag_created_at ON monitor_alerts (monitor_tag, created_at)"
			)
			.createTable("site_data", (table) => {
				table.increments("id").primary();
				table.text("key").notNullable().unique();
				table.text("value").notNullable();
				table.text("data_type").notNullable();
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
			})
			.createTable("monitors", (table) => {
				table.increments("id").primary();
				table.text("tag").notNullable().unique();
				table.text("name").notNullable().unique();
				table.text("description");
				table.text("image");
				table.text("cron");
				table.text("default_status");
				table.text("status");
				table.text("category_name");
				table.text("monitor_type");
				table.text("down_trigger");
				table.text("degraded_trigger");
				table.text("type_data");
				table.integer("day_degraded_minimum_count");
				table.integer("day_down_minimum_count");
				table.text("include_degraded_in_downtime").defaultTo("NO");
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
			})
			.createTable("triggers", (table) => {
				table.increments("id").primary();
				table.text("name").notNullable().unique();
				table.text("trigger_type");
				table.text("trigger_desc");
				table.text("trigger_status");
				table.text("trigger_meta");
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
			})
			.createTable("users", (table) => {
				table.increments("id").primary();
				table.text("email").notNullable().unique();
				table.text("name").notNullable();
				table.text("password_hash").notNullable();
				table.integer("is_active").defaultTo(1);
				table.integer("is_verified").defaultTo(0);
				table.text("role").defaultTo("user");
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
			})
			.createTable("api_keys", (table) => {
				table.increments("id").primary();
				table.text("name").notNullable().unique();
				table.text("hashed_key").notNullable().unique();
				table.text("masked_key").notNullable();
				table.text("status").defaultTo("ACTIVE");
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
			})
			.createTable("incidents", (table) => {
				table.increments("id").primary();
				table.text("title").notNullable();
				table.integer("start_date_time").notNullable();
				table.integer("end_date_time");
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
				table.text("status").defaultTo("ACTIVE");
				table.text("state").defaultTo("INVESTIGATING");
			})
			.createTable("incident_monitors", (table) => {
				table.increments("id").primary();
				table.text("monitor_tag").notNullable();
				table.text("monitor_impact");
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
				table.integer("incident_id").notNullable();
				table.unique(["monitor_tag", "incident_id"]);
			})
			.createTable("incident_comments", (table) => {
				table.increments("id").primary();
				table.text("comment").notNullable();
				table.integer("incident_id").notNullable();
				table.integer("commented_at").notNullable();
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
				table.text("status").defaultTo("ACTIVE");
				table.text("state").defaultTo("INVESTIGATING");
			})
	);
}

export function down(knex) {
	return (
		knex.schema
			// Drop tables in reverse order
			.dropTableIfExists("monitor_alerts")
			.dropTableIfExists("monitoring_data")
			.dropTableIfExists("site_data")
			.dropTableIfExists("monitors")
			.dropTableIfExists("triggers")
			.dropTableIfExists("users")
			.dropTableIfExists("api_keys")
			.dropTableIfExists("incidents")
			.dropTableIfExists("incident_monitors")
			.dropTableIfExists("incident_comments")
	);
}

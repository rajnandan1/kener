// migrations/YYYYMMDDHHMMSS_create_monitoring_tables.js

export function up(knex) {
	return (
		knex.schema
			// Create monitoring_data table
			.createTable("monitoring_data", (table) => {
				table.string("monitor_tag", 255).notNullable();
				table.integer("timestamp").notNullable();
				table.text("status");
				table.float("latency", 8, 2);
				table.text("type");
				table.primary(["monitor_tag", "timestamp"]);
			})
			// Create monitor_alerts table
			.createTable("monitor_alerts", (table) => {
				table.increments("id").primary();
				table.string("monitor_tag", 255).notNullable();
				table.string("monitor_status", 255).notNullable();
				table.string("alert_status", 255).notNullable();
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
				table.string("key", 255).notNullable().unique();
				table.text("value").notNullable();
				table.string("data_type", 255).notNullable();
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
			})
			.createTable("monitors", (table) => {
				table.increments("id").primary();
				table.string("tag", 255).notNullable().unique();
				table.string("name", 255).notNullable().unique();
				table.text("description");
				table.text("image");
				table.string("cron", 255);
				table.string("default_status", 255);
				table.string("status", 255);
				table.string("category_name", 255);
				table.string("monitor_type", 255);
				table.string("down_trigger", 255);
				table.string("degraded_trigger", 255);
				table.text("type_data");
				table.integer("day_degraded_minimum_count");
				table.integer("day_down_minimum_count");
				table.string("include_degraded_in_downtime", 255).defaultTo("NO");
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
			})
			.createTable("triggers", (table) => {
				table.increments("id").primary();
				table.string("name", 255).notNullable().unique();
				table.string("trigger_type", 255);
				table.text("trigger_desc");
				table.string("trigger_status", 255);
				table.text("trigger_meta");
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
			})
			.createTable("users", (table) => {
				table.increments("id").primary();
				table.string("email", 255).notNullable().unique();
				table.string("name", 255).notNullable();
				table.string("password_hash", 255).notNullable();
				table.integer("is_active").defaultTo(1);
				table.integer("is_verified").defaultTo(0);
				table.string("role", 255).defaultTo("user");
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
			})
			.createTable("api_keys", (table) => {
				table.increments("id").primary();
				table.string("name", 255).notNullable().unique();
				table.string("hashed_key", 255).notNullable().unique();
				table.string("masked_key", 255).notNullable();
				table.string("status", 255).defaultTo("ACTIVE");
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
			})
			.createTable("incidents", (table) => {
				table.increments("id").primary();
				table.string("title", 255).notNullable();
				table.integer("start_date_time").notNullable();
				table.integer("end_date_time");
				table.timestamp("created_at").defaultTo(knex.fn.now());
				table.timestamp("updated_at").defaultTo(knex.fn.now());
				table.string("status", 255).defaultTo("ACTIVE");
				table.string("state", 255).defaultTo("INVESTIGATING");
			})
			.createTable("incident_monitors", (table) => {
				table.increments("id").primary();
				table.string("monitor_tag", 255).notNullable();
				table.string("monitor_impact", 255);
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
				table.string("status", 255).defaultTo("ACTIVE");
				table.string("state", 255).defaultTo("INVESTIGATING");
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

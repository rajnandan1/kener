import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("maintenances"))) {
    await knex.schema.createTable("maintenances", (table) => {
      table.increments("id").primary();
      table.string("title", 255).notNullable();
      table.text("description").nullable();
      table.integer("start_date_time").notNullable();
      table.string("rrule", 500).notNullable();
      table.integer("duration_seconds").notNullable();
      table.string("status", 50).notNullable().defaultTo("ACTIVE");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable("maintenance_monitors"))) {
    await knex.schema.createTable("maintenance_monitors", (table) => {
      table.increments("id").primary();
      table.integer("maintenance_id").unsigned().notNullable();
      table.string("monitor_tag", 255).notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());

      table.foreign("maintenance_id").references("id").inTable("maintenances").onDelete("CASCADE");
      table.foreign("monitor_tag").references("tag").inTable("monitors").onDelete("CASCADE");

      table.unique(["maintenance_id", "monitor_tag"]);
    });
  }

  if (!(await knex.schema.hasTable("maintenances_events"))) {
    await knex.schema.createTable("maintenances_events", (table) => {
      table.increments("id").primary();
      table.integer("maintenance_id").unsigned().notNullable();
      table.integer("start_date_time").notNullable();
      table.integer("end_date_time").notNullable();
      table.string("status", 50).notNullable().defaultTo("SCHEDULED");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());

      table.foreign("maintenance_id").references("id").inTable("maintenances").onDelete("CASCADE");
    });
  }

  // Add indexes (safe to fail if they already exist)
  const indexes = [
    "CREATE INDEX idx_maintenances_status ON maintenances (status)",
    "CREATE INDEX idx_maintenances_start_time ON maintenances (start_date_time)",
    "CREATE INDEX idx_maintenance_monitors_maintenance_id ON maintenance_monitors (maintenance_id)",
    "CREATE INDEX idx_maintenance_monitors_monitor_tag ON maintenance_monitors (monitor_tag)",
    "CREATE INDEX idx_maintenances_events_maintenance_id ON maintenances_events (maintenance_id)",
    "CREATE INDEX idx_maintenances_events_status ON maintenances_events (status)",
    "CREATE INDEX idx_maintenances_events_start_time ON maintenances_events (start_date_time)",
    "CREATE INDEX idx_maintenances_events_end_time ON maintenances_events (end_date_time)",
  ];
  for (const sql of indexes) {
    try {
      await knex.schema.raw(sql);
    } catch (_e) {
      /* index already exists */
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("maintenances_events");
  await knex.schema.dropTableIfExists("maintenance_monitors");
  await knex.schema.dropTableIfExists("maintenances");
}

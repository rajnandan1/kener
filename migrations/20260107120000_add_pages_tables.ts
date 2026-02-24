import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create pages table
  if (!(await knex.schema.hasTable("pages"))) {
    await knex.schema.createTable("pages", (table) => {
      table.increments("id").primary();
      table.string("page_path", 255).notNullable().unique(); // e.g., "/", "/api", "/infrastructure"
      table.string("page_title", 255).notNullable();
      table.string("page_header", 255);
      table.string("page_subheader", 255);
      table.string("page_logo", 255);
      table.text("page_settings_json"); // JSON settings for the page
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // Create pages_monitors junction table
  if (!(await knex.schema.hasTable("pages_monitors"))) {
    await knex.schema.createTable("pages_monitors", (table) => {
      table.integer("page_id").unsigned().notNullable();
      table.string("monitor_tag", 255).notNullable();
      table.text("monitor_settings_json"); // JSON settings for monitor on this page (e.g., order, visibility)
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());

      // Composite primary key
      table.primary(["page_id", "monitor_tag"]);

      // Foreign key constraints
      table.foreign("page_id").references("id").inTable("pages").onDelete("CASCADE");
      table.foreign("monitor_tag").references("tag").inTable("monitors").onDelete("CASCADE");
    });
  }

  // Add indexes (safe to fail if they already exist)
  try {
    await knex.schema.raw("CREATE INDEX idx_pages_monitors_page_id ON pages_monitors (page_id)");
  } catch (_e) {
    /* index already exists */
  }
  try {
    await knex.schema.raw("CREATE INDEX idx_pages_monitors_monitor_tag ON pages_monitors (monitor_tag)");
  } catch (_e) {
    /* index already exists */
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("pages_monitors");
  await knex.schema.dropTableIfExists("pages");
}

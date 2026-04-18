import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("pages_monitor_groups"))) {
    await knex.schema.createTable("pages_monitor_groups", (table) => {
      table.increments("id").primary();
      table.integer("page_id").unsigned().notNullable();
      table.string("name", 255).notNullable();
      table.text("description").nullable();
      table.boolean("default_expanded").notNullable().defaultTo(false);
      table.boolean("adopt_child_status").notNullable().defaultTo(false);
      table.integer("position").notNullable().defaultTo(0);
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());

      table.foreign("page_id").references("id").inTable("pages").onDelete("CASCADE");
      table.index(["page_id"], "idx_pages_monitor_groups_page_id");
      table.index(["page_id", "position"], "idx_pages_monitor_groups_page_id_position");
    });
  }

  if (
    (await knex.schema.hasTable("pages_monitor_groups")) &&
    !(await knex.schema.hasColumn("pages_monitor_groups", "description"))
  ) {
    await knex.schema.alterTable("pages_monitor_groups", (table) => {
      table.text("description").nullable();
    });
  }

  if (
    (await knex.schema.hasTable("pages_monitor_groups")) &&
    !(await knex.schema.hasColumn("pages_monitor_groups", "default_expanded"))
  ) {
    await knex.schema.alterTable("pages_monitor_groups", (table) => {
      table.boolean("default_expanded").notNullable().defaultTo(false);
    });
  }

  if ((await knex.schema.hasTable("pages_monitors")) && !(await knex.schema.hasColumn("pages_monitors", "page_monitor_group_id"))) {
    await knex.schema.alterTable("pages_monitors", (table) => {
      table.integer("page_monitor_group_id").unsigned().nullable();
      table
        .foreign("page_monitor_group_id")
        .references("id")
        .inTable("pages_monitor_groups")
        .onDelete("SET NULL");
      table.index(["page_monitor_group_id"], "idx_pages_monitors_group_id");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if ((await knex.schema.hasTable("pages_monitors")) && (await knex.schema.hasColumn("pages_monitors", "page_monitor_group_id"))) {
    try {
      await knex.schema.alterTable("pages_monitors", (table) => {
        table.dropIndex(["page_monitor_group_id"], "idx_pages_monitors_group_id");
      });
    } catch {}

    try {
      await knex.schema.alterTable("pages_monitors", (table) => {
        table.dropForeign(["page_monitor_group_id"]);
      });
    } catch {}

    await knex.schema.alterTable("pages_monitors", (table) => {
      table.dropColumn("page_monitor_group_id");
    });
  }

  if (await knex.schema.hasTable("pages_monitor_groups")) {
    try {
      await knex.schema.alterTable("pages_monitor_groups", (table) => {
        table.dropIndex(["page_id", "position"], "idx_pages_monitor_groups_page_id_position");
      });
    } catch {}

    try {
      await knex.schema.alterTable("pages_monitor_groups", (table) => {
        table.dropIndex(["page_id"], "idx_pages_monitor_groups_page_id");
      });
    } catch {}
  }

  await knex.schema.dropTableIfExists("pages_monitor_groups");
}

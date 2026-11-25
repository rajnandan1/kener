import type { Knex } from "knex";

// Built-in groups. The seed in seeds/access_groups.ts creates them as well,
// so a database that lost them gets them back on the next start.
const SYSTEM_GROUPS = [
  {
    id: "public",
    group_name: "Public",
    description: "Pages in this group are visible to everyone, without signing in",
  },
  {
    id: "admin",
    group_name: "All pages",
    description: "Roles in this group can see every page",
  },
];

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("access_groups"))) {
    await knex.schema.createTable("access_groups", (table) => {
      table.string("id", 100).primary();
      table.string("group_name", 255).notNullable();
      table.text("description").nullable();
      table.integer("is_system").notNullable().defaultTo(0);
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // Which groups may see a page
  if (!(await knex.schema.hasTable("page_access_groups"))) {
    await knex.schema.createTable("page_access_groups", (table) => {
      table.integer("page_id").unsigned().notNullable().references("id").inTable("pages").onDelete("CASCADE");
      table.string("access_group_id", 100).notNullable().references("id").inTable("access_groups").onDelete("CASCADE");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.primary(["page_id", "access_group_id"]);
    });
  }

  // Which groups a role belongs to
  if (!(await knex.schema.hasTable("role_access_groups"))) {
    await knex.schema.createTable("role_access_groups", (table) => {
      table.string("role_id", 100).notNullable().references("id").inTable("roles").onDelete("CASCADE");
      table.string("access_group_id", 100).notNullable().references("id").inTable("access_groups").onDelete("CASCADE");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.primary(["role_id", "access_group_id"]);
    });
  }

  for (const group of SYSTEM_GROUPS) {
    if (!(await knex("access_groups").where("id", group.id).first())) {
      await knex("access_groups").insert({ ...group, is_system: 1 });
    }
  }

  // Pages that exist before this migration stay visible to everyone. Only while the table is
  // empty: a second run must not reopen pages an admin has made private since. Checking the
  // rows instead of whether this run created the table also covers a first run that failed
  // after the table was created (MySQL commits CREATE TABLE right away).
  if (!(await knex("page_access_groups").first())) {
    const pages: { id: number }[] = await knex("pages").select("id");
    for (let i = 0; i < pages.length; i += 100) {
      await knex("page_access_groups").insert(
        pages.slice(i, i + 100).map((page) => ({ page_id: page.id, access_group_id: "public" })),
      );
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("role_access_groups");
  await knex.schema.dropTableIfExists("page_access_groups");
  await knex.schema.dropTableIfExists("access_groups");
}

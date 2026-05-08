import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Access groups define visibility scopes for pages.
  // "public" = visible to everyone without login.
  // "admin" = grants access to all pages (assigned to admin role).
  if (!(await knex.schema.hasTable("access_groups"))) {
    await knex.schema.createTable("access_groups", (table) => {
      table.string("id", 100).primary();
      table.text("group_name").notNullable();
      table.text("description");
      table.integer("is_system").notNullable().defaultTo(0);
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // Junction: which access groups are assigned to which page
  if (!(await knex.schema.hasTable("page_access_groups"))) {
    await knex.schema.createTable("page_access_groups", (table) => {
      table.integer("page_id").unsigned().notNullable()
        .references("id").inTable("pages").onDelete("CASCADE");
      table.string("access_group_id", 100).notNullable()
        .references("id").inTable("access_groups").onDelete("CASCADE");
      table.timestamp("created_at").defaultTo(knex.fn.now());

      table.primary(["page_id", "access_group_id"]);
    });
  }

  // Junction: which access groups a role can see
  if (!(await knex.schema.hasTable("role_access_groups"))) {
    await knex.schema.createTable("role_access_groups", (table) => {
      table.string("role_id", 100).notNullable()
        .references("id").inTable("roles").onDelete("CASCADE");
      table.string("access_group_id", 100).notNullable()
        .references("id").inTable("access_groups").onDelete("CASCADE");
      table.timestamp("created_at").defaultTo(knex.fn.now());

      table.primary(["role_id", "access_group_id"]);
    });
  }

  // Seed the "public" system group
  const publicExists = await knex("access_groups").where("id", "public").first();
  if (!publicExists) {
    await knex("access_groups").insert({
      id: "public",
      group_name: "Public",
      description: "Pages with this group are visible to everyone without login",
      is_system: 1,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    });
  }

  // Seed the "admin" system group
  const adminExists = await knex("access_groups").where("id", "admin").first();
  if (!adminExists) {
    await knex("access_groups").insert({
      id: "admin",
      group_name: "Admin",
      description: "Grants access to all pages regardless of their groups",
      is_system: 1,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    });
  }

  // Assign "public" to all existing pages (backward compatibility)
  const allPages = await knex("pages").select("id");
  for (const page of allPages) {
    const exists = await knex("page_access_groups")
      .where({ page_id: page.id, access_group_id: "public" })
      .first();
    if (!exists) {
      await knex("page_access_groups").insert({
        page_id: page.id,
        access_group_id: "public",
        created_at: knex.fn.now(),
      });
    }
  }

  // Assign "admin" group to the admin role
  const adminRoleExists = await knex("roles").where("id", "admin").first();
  if (adminRoleExists) {
    const alreadyAssigned = await knex("role_access_groups")
      .where({ role_id: "admin", access_group_id: "admin" })
      .first();
    if (!alreadyAssigned) {
      await knex("role_access_groups").insert({
        role_id: "admin",
        access_group_id: "admin",
        created_at: knex.fn.now(),
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("role_access_groups");
  await knex.schema.dropTableIfExists("page_access_groups");
  await knex.schema.dropTableIfExists("access_groups");
}

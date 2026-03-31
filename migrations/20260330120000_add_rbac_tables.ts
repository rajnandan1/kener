import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Roles table
  if (!(await knex.schema.hasTable("roles"))) {
    await knex.schema.createTable("roles", (table) => {
      table.string("id", 100).primary();
      table.text("role_name").notNullable();
      table.integer("readonly").notNullable().defaultTo(0);
      table.string("status", 20).notNullable().defaultTo("ACTIVE");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // 2. Permissions table
  if (!(await knex.schema.hasTable("permissions"))) {
    await knex.schema.createTable("permissions", (table) => {
      table.string("id", 100).primary();
      table.text("permission_name").notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  // 3. Roles ↔ Permissions junction table
  if (!(await knex.schema.hasTable("roles_permissions"))) {
    await knex.schema.createTable("roles_permissions", (table) => {
      table.string("roles_id", 100).notNullable().references("id").inTable("roles").onDelete("CASCADE");
      table.string("permissions_id", 100).notNullable().references("id").inTable("permissions").onDelete("CASCADE");
      table.string("status", 20).notNullable().defaultTo("ACTIVE");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());

      table.primary(["roles_id", "permissions_id"]);
    });
  }

  // 4. Users ↔ Roles junction table
  if (!(await knex.schema.hasTable("users_roles"))) {
    await knex.schema.createTable("users_roles", (table) => {
      table.string("roles_id", 100).notNullable().references("id").inTable("roles").onDelete("CASCADE");
      table.integer("users_id").unsigned().notNullable().references("id").inTable("users").onDelete("CASCADE");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());

      table.primary(["roles_id", "users_id"]);
      table.index("users_id", "idx_users_roles_users_id");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("users_roles");
  await knex.schema.dropTableIfExists("roles_permissions");
  await knex.schema.dropTableIfExists("permissions");
  await knex.schema.dropTableIfExists("roles");
}

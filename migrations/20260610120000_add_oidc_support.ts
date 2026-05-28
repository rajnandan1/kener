import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Add auth_provider and oidc_sub columns to users table
  const hasAuthProvider = await knex.schema.hasColumn("users", "auth_provider");
  if (!hasAuthProvider) {
    await knex.schema.alterTable("users", (table) => {
      // "local" for password-based accounts, "oidc" for OpenID Connect accounts
      table.string("auth_provider", 20).notNullable().defaultTo("local");
    });
  }

  const hasOidcSub = await knex.schema.hasColumn("users", "oidc_sub");
  if (!hasOidcSub) {
    await knex.schema.alterTable("users", (table) => {
      // Subject identifier from the OIDC provider (unique per provider)
      table.string("oidc_sub", 255).nullable().unique();
    });
  }

  // 2. Make password_hash nullable for OIDC users who have no local password.
  //    SQLite does not support ALTER COLUMN, so we store an empty string
  //    for OIDC users there. For PostgreSQL/MySQL we properly drop NOT NULL.
  const dbClient = knex.client.config.client;
  if (dbClient === "pg" || dbClient === "postgresql") {
    await knex.schema.raw('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL');
  } else if (dbClient === "mysql" || dbClient === "mysql2") {
    await knex.schema.raw('ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL');
  }

  // 3. Create OIDC group-to-role mapping table
  if (!(await knex.schema.hasTable("oidc_group_role_mappings"))) {
    await knex.schema.createTable("oidc_group_role_mappings", (table) => {
      table.increments("id").primary();
      table.string("oidc_group", 255).notNullable();
      table
        .string("role_id", 100)
        .notNullable()
        .references("id")
        .inTable("roles")
        .onDelete("CASCADE");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.unique(["oidc_group"]);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("oidc_group_role_mappings");

  const hasOidcSub = await knex.schema.hasColumn("users", "oidc_sub");
  if (hasOidcSub) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("oidc_sub");
    });
  }

  const hasAuthProvider = await knex.schema.hasColumn("users", "auth_provider");
  if (hasAuthProvider) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("auth_provider");
    });
  }
}

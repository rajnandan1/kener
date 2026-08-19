import type { Knex } from "knex";

const OIDC_IDENTITY_UNIQUE = "users_oidc_issuer_sub_unique";

export async function up(knex: Knex): Promise<void> {
  // 1. Add auth_provider and the OIDC identity columns to users table
  const hasAuthProvider = await knex.schema.hasColumn("users", "auth_provider");
  if (!hasAuthProvider) {
    await knex.schema.alterTable("users", (table) => {
      // "local" for password-based accounts, "oidc" for OpenID Connect accounts
      table.string("auth_provider", 20).notNullable().defaultTo("local");
    });
  }

  // An OIDC account is keyed by (issuer, sub): a subject is only unique within
  // one provider, so the same `sub` may legitimately exist under two issuers and
  // a new issuer handing out a known `sub` must not resolve to the old account.
  const hasOidcSub = await knex.schema.hasColumn("users", "oidc_sub");
  const hasOidcIssuer = await knex.schema.hasColumn("users", "oidc_issuer");
  if (!hasOidcSub) {
    await knex.schema.alterTable("users", (table) => {
      table.string("oidc_issuer", 255).nullable();
      table.string("oidc_sub", 255).nullable();
      table.unique(["oidc_issuer", "oidc_sub"], { indexName: OIDC_IDENTITY_UNIQUE });
    });
  } else if (!hasOidcIssuer) {
    // Earlier builds of this feature keyed accounts by subject alone (unique on oidc_sub).
    await knex.schema.alterTable("users", (table) => {
      table.string("oidc_issuer", 255).nullable();
      table.dropUnique(["oidc_sub"]);
      table.unique(["oidc_issuer", "oidc_sub"], { indexName: OIDC_IDENTITY_UNIQUE });
    });
  }

  // 2. Role provenance: the JSON list of role ids the last OIDC sync granted to
  // the user. The next sync revokes exactly those (unless re-granted) and leaves
  // every other assignment — made by hand in the admin UI — alone. NULL = never
  // synced (all current roles count as manual).
  if (!(await knex.schema.hasColumn("users", "oidc_role_ids"))) {
    await knex.schema.alterTable("users", (table) => {
      table.text("oidc_role_ids").nullable();
    });
  }

  // Note: OIDC users store an empty string as password_hash.
  // No schema change needed — the NOT NULL constraint is kept.

  // 3. Create OIDC group-to-role mapping table
  if (!(await knex.schema.hasTable("oidc_group_role_mappings"))) {
    await knex.schema.createTable("oidc_group_role_mappings", (table) => {
      table.increments("id").primary();
      table.string("oidc_group", 255).notNullable();
      table.string("role_id", 100).notNullable().references("id").inTable("roles").onDelete("CASCADE");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.unique(["oidc_group"]);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("oidc_group_role_mappings");

  if (await knex.schema.hasColumn("users", "oidc_role_ids")) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("oidc_role_ids");
    });
  }

  const hasOidcIssuer = await knex.schema.hasColumn("users", "oidc_issuer");
  if (hasOidcIssuer) {
    await knex.schema.alterTable("users", (table) => {
      table.dropUnique(["oidc_issuer", "oidc_sub"], OIDC_IDENTITY_UNIQUE);
      table.dropColumn("oidc_issuer");
    });
  }

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

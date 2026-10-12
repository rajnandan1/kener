import type { Knex } from "knex";

/**
 * Finding: API keys were bearer-only superkeys with no permissions, scope, or expiry -
 * any ACTIVE key authorized every protected API route (CWE-862), despite the project's
 * own API documentation (src/routes/(docs)/docs/content/v4/api-reference/authentication.md)
 * describing per-key permissions and optional expiry as an existing feature.
 *
 * This migration adds the `expires_at` half of that gap: a nullable expiry timestamp,
 * enforced in VerifyAPIKey (src/lib/server/controllers/apiController.ts). Null means
 * "no expiry" (preserves existing behavior for every key created before this migration).
 *
 * Per-route permission scoping (the "Permissions" half of the same finding) is a larger,
 * maintainer-judgment decision - it requires defining a scope taxonomy and auditing every
 * protected route to enforce it, not something to guess blind - and is intentionally left
 * out of this migration; it needs its own design pass.
 */
export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("api_keys", "expires_at");
  if (!hasColumn) {
    await knex.schema.alterTable("api_keys", (table) => {
      table.timestamp("expires_at").nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("api_keys", "expires_at");
  if (hasColumn) {
    await knex.schema.alterTable("api_keys", (table) => {
      table.dropColumn("expires_at");
    });
  }
}

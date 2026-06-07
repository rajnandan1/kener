import type { Knex } from "knex";

// Closed default_status set as of docs/adr/0006. MAINTENANCE was offered by the old
// UI but never honored by the fill engine — it behaved exactly like "no fill", so it
// (and any other unknown value, and NULL) normalizes to NONE, preserving behavior.
const VALID = ["NONE", "UP", "DOWN", "DEGRADED", "LAST_KNOWN"];

export async function up(knex: Knex): Promise<void> {
  await knex("monitors").whereNull("default_status").update({ default_status: "NONE" });
  await knex("monitors").whereNotIn("default_status", VALID).update({ default_status: "NONE" });
}

export async function down(_knex: Knex): Promise<void> {
  // Irreversible by design: the values rewritten to NONE were dead (never honored
  // by the fill engine), so there is nothing meaningful to restore.
}

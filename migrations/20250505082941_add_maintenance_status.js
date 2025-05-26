/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex("site_data")
    .where("key", "colors")
    .update({ value: knex.jsonInsert("value", "$.MAINTENANCE", "#6699cc") });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex("site_data")
    .where("key", "colors")
    .update({ value: knex.jsonRemove("value", "$.MAINTENANCE") });
}

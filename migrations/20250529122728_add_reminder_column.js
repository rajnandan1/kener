/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.alterTable("incidents", (table) => {
    table.string("reminder_time").nullable();
    table.integer("reminder_sent_at").nullable();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.alterTable("incidents", (table) => {
    table.dropColumn("reminder_time");
    table.dropColumn("reminder_sent_at");
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.alterTable("incidents", (table) => {
    table.string("reminder_time").nullable();
    table.string("reminders_sent_at").defaultTo("0;0;0").notNullable();
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

/**
 * Add enable_details_to_be_examined and enable_individual_view_if_grouped
 * columns to monitors table.
 */
export function up(knex) {
  return knex.schema.alterTable("monitors", function (table) {
    table.boolean("enable_details_to_be_examined").notNullable().defaultTo(true);
    table.boolean("enable_individual_view_if_grouped").notNullable().defaultTo(true);
  });
}

export function down(knex) {
  return knex.schema.alterTable("monitors", function (table) {
    table.dropColumn("enable_details_to_be_examined");
    table.dropColumn("enable_individual_view_if_grouped");
  });
}

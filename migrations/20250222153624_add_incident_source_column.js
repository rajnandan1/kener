export function up(knex) {
  return knex.schema.alterTable("incidents", function (table) {
    table.text("incident_source").defaultTo("DASHBOARD");
  });
}

export function down(knex) {
  return knex.schema.alterTable("incidents", function (table) {
    table.dropColumn("incident_source");
  });
}

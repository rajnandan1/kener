import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("incidents", function (table) {
    table.text("incident_source").defaultTo("DASHBOARD");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("incidents", function (table) {
    table.dropColumn("incident_source");
  });
}

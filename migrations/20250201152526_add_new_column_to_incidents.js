export function up(knex) {
	return knex.schema.alterTable("incidents", function (table) {
		table.text("incident_type").defaultTo("INCIDENT");
	});
}

export function down(knex) {
	return knex.schema.alterTable("incidents", function (table) {
		table.dropColumn("incident_type");
	});
}

export function up(knex) {
	return knex.schema.createTable("subscribers", function (table) {
		table.increments("id").primary();
		table.string("email").notNullable();
		table.integer("incident_id").notNullable().defaultTo(0);
		table.timestamp("created_at").defaultTo(knex.fn.now());
		table.timestamp("updated_at").defaultTo(knex.fn.now());
		table.string("status", 255).defaultTo("ACTIVE");
		table.string("token").notNullable().unique();
		table.unique(["email", "incident_id"]);
	});
}

export function down(knex) {
	return knex.schema.dropTableIfExists("subscribers");
}

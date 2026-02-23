import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("images", (table) => {
    table.string("id", 32).primary(); // nanoid generated ID with prefix
    table.text("data").notNullable(); // base64 encoded image data
    table.string("mime_type", 50).notNullable(); // image/png, image/jpeg, image/svg+xml
    table.string("original_name", 255); // original filename
    table.integer("width"); // image width after resize
    table.integer("height"); // image height after resize
    table.integer("size"); // size in bytes
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("images");
}

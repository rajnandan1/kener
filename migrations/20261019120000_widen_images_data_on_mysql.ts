import type { Knex } from "knex";

// MySQL `text` holds 65,535 bytes. PostgreSQL and SQLite `text` have no such limit.
const isMysql = (knex: Knex) => knex.client.config.client === "mysql2";

export async function up(knex: Knex): Promise<void> {
  if (!isMysql(knex) || !(await knex.schema.hasColumn("images", "data"))) return;
  await knex.schema.alterTable("images", (table) => {
    table.text("data", "longtext").notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  if (!isMysql(knex) || !(await knex.schema.hasColumn("images", "data"))) return;
  const tooLong = await knex("images").whereRaw("length(data) > 65535").first("id");
  if (tooLong) {
    throw new Error(`Cannot change images.data back to text: image ${tooLong.id} is longer than 65,535 bytes`);
  }
  await knex.schema.alterTable("images", (table) => {
    table.text("data").notNullable().alter();
  });
}

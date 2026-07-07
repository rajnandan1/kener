import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("user_subscriptions_v2", "monitor_tags");
  if (!hasColumn) {
    await knex.schema.alterTable("user_subscriptions_v2", (table) => {
      table.text("monitor_tags").nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("user_subscriptions_v2", "monitor_tags");
  if (hasColumn) {
    await knex.schema.alterTable("user_subscriptions_v2", (table) => {
      table.dropColumn("monitor_tags");
    });
  }
}

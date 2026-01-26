import defaultEmailTemplate from "../src/lib/server/templates/email_alert_template.ts";
import defaultWebhookTemplate from "../src/lib/server/templates/webhook_alert_template.ts";
import defaultSlackTemplate from "../src/lib/server/templates/slack_alert_template.ts";
import defaultDiscordTemplate from "../src/lib/server/templates/discord_alert_template.ts";

import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  const templateCount = await knex("templates").count("id as CNT").first();
  if (templateCount && templateCount.CNT == 2) {
    await knex("templates").insert({
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
      ...defaultSlackTemplate,
    });
    await knex("templates").insert({
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
      ...defaultDiscordTemplate,
    });
  }
}

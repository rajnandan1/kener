import defaultEmailTemplate from "../src/lib/server/templates/email_alert_template.ts";
import defaultWebhookTemplate from "../src/lib/server/templates/webhook_alert_template.ts";
import defaultSlackTemplate from "../src/lib/server/templates/slack_alert_template.ts";
import defaultDiscordTemplate from "../src/lib/server/templates/discord_alert_template.ts";
import defaultLoginEmailCodeTemplate from "../src/lib/server/templates/email_code_template.ts";
import defaultEmailUpdateTemplate from "../src/lib/server/templates/email_update_template.ts";

import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  const templateCount = await knex("templates").count("id as CNT").first();
  if (templateCount && templateCount.CNT == 0) {
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
    await knex("templates").insert({
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
      ...defaultWebhookTemplate,
    });
    await knex("templates").insert({
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
      ...defaultEmailTemplate,
    });
    await knex("templates").insert({
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
      ...defaultLoginEmailCodeTemplate,
    });
    await knex("templates").insert({
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
      ...defaultEmailUpdateTemplate,
    });
  }
}

import subscriptionAccountCodeTemplate from "../src/lib/server/templates/general/subscrption_account_code_template.ts";
import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Check if the table has template_id 'subscription_account_code'

  let count = await knex("general_email_templates")
    .where({ template_id: subscriptionAccountCodeTemplate.template_id })
    .count("template_id as CNT")
    .first();

  if (count && count.CNT === 0) {
    await knex("general_email_templates").insert({
      template_id: subscriptionAccountCodeTemplate.template_id,
      template_subject: subscriptionAccountCodeTemplate.template_subject,
      template_html_body: subscriptionAccountCodeTemplate.template_html_body,
      template_text_body: subscriptionAccountCodeTemplate.template_text_body,
    });
  }
}

import { BaseRepository } from "./base.js";
import type { GeneralEmailTemplateRecord, GeneralEmailTemplateRecordInsert } from "../../types/db.js";

/**
 * Repository for general email templates operations
 */
export class EmailTemplateConfigRepository extends BaseRepository {
  /**
   * Insert a new email template
   */
  async insertEmailTemplate(template: GeneralEmailTemplateRecordInsert): Promise<string[]> {
    return await this.knex("general_email_templates").insert(template);
  }

  /**
   * Update an existing email template by template_id
   */
  async updateEmailTemplate(
    template_id: string,
    updates: Partial<Omit<GeneralEmailTemplateRecordInsert, "template_id">>,
  ): Promise<number> {
    return await this.knex("general_email_templates").where({ template_id }).update(updates);
  }

  /**
   * Get all email templates
   */
  async getAllEmailTemplates(): Promise<GeneralEmailTemplateRecord[]> {
    return await this.knex("general_email_templates").select("*");
  }

  /**
   * Get a specific email template by template_id
   */
  async getEmailTemplateById(template_id: string): Promise<GeneralEmailTemplateRecord | undefined> {
    return await this.knex("general_email_templates").where({ template_id }).first();
  }

  /**
   * Delete an email template by template_id
   */
  async deleteEmailTemplate(template_id: string): Promise<number> {
    return await this.knex("general_email_templates").where({ template_id }).delete();
  }

  /**
   * Insert or update an email template (upsert)
   */
  async upsertEmailTemplate(template: GeneralEmailTemplateRecordInsert): Promise<number[]> {
    return await this.knex("general_email_templates").insert(template).onConflict("template_id").merge({
      template_subject: template.template_subject,
      template_html_body: template.template_html_body,
      template_text_body: template.template_text_body,
    });
  }
}

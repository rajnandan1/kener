import { BaseRepository } from "./base.js";

export interface EmailTemplateConfigRecord {
  id: number;
  email_type: string;
  email_template_id: number | null;
  is_active: string; // "YES" or "NO"
  created_at: Date;
  updated_at: Date;
}

export interface EmailTemplateConfigInsert {
  email_type: string;
  email_template_id?: number | null;
  is_active?: string;
}

export interface EmailTemplateConfigUpdate {
  email_template_id?: number | null;
  is_active?: string;
}

export interface EmailTemplateConfigWithTemplate extends EmailTemplateConfigRecord {
  template_name?: string | null;
}

/**
 * Repository for email template configuration operations
 */
export class EmailTemplateConfigRepository extends BaseRepository {
  /**
   * Get all email template configs
   */
  async getAllEmailTemplateConfigs(): Promise<EmailTemplateConfigRecord[]> {
    return await this.knex("email_templates_config").orderBy("id", "asc");
  }

  /**
   * Get all email template configs with template details
   */
  async getAllEmailTemplateConfigsWithTemplates(): Promise<EmailTemplateConfigWithTemplate[]> {
    return await this.knex("email_templates_config")
      .leftJoin("templates", "email_templates_config.email_template_id", "templates.id")
      .select("email_templates_config.*", "templates.template_name as template_name")
      .orderBy("email_templates_config.id", "asc");
  }

  /**
   * Get email template config by email type
   */
  async getEmailTemplateConfigByType(emailType: string): Promise<EmailTemplateConfigRecord | undefined> {
    return await this.knex("email_templates_config").where({ email_type: emailType }).first();
  }

  /**
   * Get email template config by ID
   */
  async getEmailTemplateConfigById(id: number): Promise<EmailTemplateConfigRecord | undefined> {
    return await this.knex("email_templates_config").where({ id }).first();
  }

  /**
   * Update email template config by email type
   */
  async updateEmailTemplateConfigByType(emailType: string, data: EmailTemplateConfigUpdate): Promise<number> {
    const updateData: Record<string, unknown> = {
      updated_at: this.knex.fn.now(),
    };

    if (data.email_template_id !== undefined) {
      updateData.email_template_id = data.email_template_id;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    return await this.knex("email_templates_config").where({ email_type: emailType }).update(updateData);
  }

  /**
   * Update email template config by ID
   */
  async updateEmailTemplateConfigById(id: number, data: EmailTemplateConfigUpdate): Promise<number> {
    const updateData: Record<string, unknown> = {
      updated_at: this.knex.fn.now(),
    };

    if (data.email_template_id !== undefined) {
      updateData.email_template_id = data.email_template_id;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    return await this.knex("email_templates_config").where({ id }).update(updateData);
  }

  /**
   * Get active email template configs (is_active = "YES")
   */
  async getActiveEmailTemplateConfigs(): Promise<EmailTemplateConfigRecord[]> {
    return await this.knex("email_templates_config").where({ is_active: "YES" }).orderBy("id", "asc");
  }

  /**
   * Get active email template config by type with template details
   */
  async getActiveEmailTemplateConfigByType(emailType: string): Promise<EmailTemplateConfigWithTemplate | undefined> {
    return await this.knex("email_templates_config")
      .leftJoin("templates", "email_templates_config.email_template_id", "templates.id")
      .select("email_templates_config.*", "templates.template_name as template_name")
      .where({
        "email_templates_config.email_type": emailType,
        "email_templates_config.is_active": "YES",
      })
      .first();
  }

  /**
   * Ensure default email types exist (for migration safety)
   */
  async ensureDefaultEmailTypes(): Promise<void> {
    const defaultTypes = ["email_code", "forgot_password", "verify_email"];

    for (const emailType of defaultTypes) {
      const existing = await this.getEmailTemplateConfigByType(emailType);
      if (!existing) {
        await this.knex("email_templates_config").insert({
          email_type: emailType,
          email_template_id: null,
          is_active: "NO",
        });
      }
    }
  }
}

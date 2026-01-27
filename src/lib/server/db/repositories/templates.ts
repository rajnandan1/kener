import { BaseRepository, type CountResult } from "./base.js";
import type {
  TemplateRecord,
  TemplateInsert,
  TemplateUpdate,
  TemplateFilter,
  TemplateType,
  TemplateUsageType,
} from "../../types/db.js";

/**
 * Repository for template operations
 */
export class TemplatesRepository extends BaseRepository {
  // ============ Template CRUD ============

  /**
   * Insert a new template
   */
  async insertTemplate(data: TemplateInsert): Promise<number[]> {
    return await this.knex("templates").insert({
      template_name: data.template_name,
      template_type: data.template_type,
      template_usage: data.template_usage,
      template_json: data.template_json,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  /**
   * Update an existing template by ID
   */
  async updateTemplate(id: number, data: TemplateUpdate): Promise<number> {
    const updateData: Record<string, unknown> = {
      updated_at: this.knex.fn.now(),
    };

    if (data.template_name !== undefined) updateData.template_name = data.template_name;
    if (data.template_type !== undefined) updateData.template_type = data.template_type;
    if (data.template_usage !== undefined) updateData.template_usage = data.template_usage;
    if (data.template_json !== undefined) updateData.template_json = data.template_json;

    return await this.knex("templates").where({ id }).update(updateData);
  }

  /**
   * Get a single template by ID
   */
  async getTemplateById(id: number): Promise<TemplateRecord | undefined> {
    return await this.knex("templates").where({ id }).first();
  }

  /**
   * Get templates with optional filtering
   */
  async getTemplates(filter: TemplateFilter): Promise<TemplateRecord[]> {
    let query = this.knex("templates").whereRaw("1=1");

    if (filter.id !== undefined) {
      query = query.andWhere("id", filter.id);
    }
    if (filter.template_type !== undefined) {
      query = query.andWhere("template_type", filter.template_type);
    }
    if (filter.template_usage !== undefined) {
      query = query.andWhere("template_usage", filter.template_usage);
    }

    return await query.orderBy("id", "desc");
  }

  /**
   * Get all templates
   */
  async getAllTemplates(): Promise<TemplateRecord[]> {
    return await this.knex("templates").orderBy("id", "desc");
  }

  /**
   * Get templates by type
   */
  async getTemplatesByType(templateType: TemplateType): Promise<TemplateRecord[]> {
    return await this.knex("templates").where({ template_type: templateType }).orderBy("id", "desc");
  }

  /**
   * Get templates by usage
   */
  async getTemplatesByUsage(templateUsage: TemplateUsageType): Promise<TemplateRecord[]> {
    return await this.knex("templates").where({ template_usage: templateUsage }).orderBy("id", "desc");
  }

  /**
   * Get templates by type and usage
   */
  async getTemplatesByTypeAndUsage(
    templateType: TemplateType,
    templateUsages: TemplateUsageType[],
  ): Promise<TemplateRecord[]> {
    return await this.knex("templates")
      .where({ template_type: templateType })
      .whereIn("template_usage", templateUsages)
      .orderBy("id", "desc");
  }

  /**
   * Delete a template by ID
   */
  async deleteTemplate(id: number): Promise<number> {
    return await this.knex("templates").where({ id }).del();
  }

  /**
   * Count templates with optional filtering
   */
  async getTemplatesCount(filter: TemplateFilter): Promise<CountResult | undefined> {
    let query = this.knex("templates").count("* as count");

    if (filter.id !== undefined) {
      query = query.andWhere("id", filter.id);
    }
    if (filter.template_type !== undefined) {
      query = query.andWhere("template_type", filter.template_type);
    }
    if (filter.template_usage !== undefined) {
      query = query.andWhere("template_usage", filter.template_usage);
    }

    return await query.first<CountResult>();
  }

  /**
   * Check if a template name exists (for a given type and usage)
   */
  async templateNameExists(
    templateName: string,
    templateType: TemplateType,
    templateUsage: TemplateUsageType,
    excludeId?: number,
  ): Promise<boolean> {
    let query = this.knex("templates")
      .count("* as count")
      .where({ template_name: templateName, template_type: templateType, template_usage: templateUsage });

    if (excludeId !== undefined) {
      query = query.andWhereNot("id", excludeId);
    }

    const result = await query.first<CountResult>();
    return Number(result?.count) > 0;
  }
}

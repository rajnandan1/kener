import db from "../db/db.js";
import type {
  TemplateRecord,
  TemplateInsert,
  TemplateUpdate,
  TemplateFilter,
  TemplateType,
  TemplateUsageType,
  TemplateJsonType,
  EmailTemplateJson,
  WebhookTemplateJson,
  SlackTemplateJson,
  DiscordTemplateJson,
  TemplateParsed,
} from "../types/db.js";

// Re-export types for convenience
export type {
  TemplateRecord,
  TemplateType,
  TemplateUsageType,
  TemplateJsonType,
  EmailTemplateJson,
  WebhookTemplateJson,
  SlackTemplateJson,
  DiscordTemplateJson,
  TemplateParsed,
};

// ============ Validation ============

const VALID_TEMPLATE_TYPES: TemplateType[] = ["EMAIL", "WEBHOOK", "SLACK", "DISCORD"];
const VALID_TEMPLATE_USAGES: TemplateUsageType[] = ["ALERT", "SUBSCRIPTION", "GENERAL"];

function validateTemplateType(value: string): asserts value is TemplateType {
  if (!VALID_TEMPLATE_TYPES.includes(value as TemplateType)) {
    throw new Error(`Invalid template_type value: ${value}. Must be one of: ${VALID_TEMPLATE_TYPES.join(", ")}`);
  }
}

function validateTemplateUsage(value: string): asserts value is TemplateUsageType {
  if (!VALID_TEMPLATE_USAGES.includes(value as TemplateUsageType)) {
    throw new Error(`Invalid template_usage value: ${value}. Must be one of: ${VALID_TEMPLATE_USAGES.join(", ")}`);
  }
}

function validateTemplateName(value: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error("Template name is required");
  }
  if (value.length > 255) {
    throw new Error("Template name must be 255 characters or less");
  }
}

function validateEmailTemplateJson(json: unknown): asserts json is EmailTemplateJson {
  if (typeof json !== "object" || json === null) {
    throw new Error("Email template JSON must be an object");
  }
  const obj = json as Record<string, unknown>;
  if (typeof obj.email_subject !== "string") {
    throw new Error("Email template must have email_subject as string");
  }
  if (typeof obj.email_body !== "string") {
    throw new Error("Email template must have email_body as string");
  }
}

function validateWebhookTemplateJson(json: unknown): asserts json is WebhookTemplateJson {
  if (typeof json !== "object" || json === null) {
    throw new Error("Webhook template JSON must be an object");
  }
  const obj = json as Record<string, unknown>;
  if (typeof obj.webhook_body !== "string") {
    throw new Error("Webhook template must have webhook_body as string");
  }
}

function validateSlackTemplateJson(json: unknown): asserts json is SlackTemplateJson {
  if (typeof json !== "object" || json === null) {
    throw new Error("Slack template JSON must be an object");
  }
  const obj = json as Record<string, unknown>;
  if (typeof obj.slack_body !== "string") {
    throw new Error("Slack template must have slack_body as string");
  }
}

function validateDiscordTemplateJson(json: unknown): asserts json is DiscordTemplateJson {
  if (typeof json !== "object" || json === null) {
    throw new Error("Discord template JSON must be an object");
  }
  const obj = json as Record<string, unknown>;
  if (typeof obj.discord_body !== "string") {
    throw new Error("Discord template must have discord_body as string");
  }
}

function validateTemplateJson(templateType: TemplateType, jsonString: string): TemplateJsonType {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON format for template_json");
  }

  switch (templateType) {
    case "EMAIL":
      validateEmailTemplateJson(parsed);
      return parsed;
    case "WEBHOOK":
      validateWebhookTemplateJson(parsed);
      return parsed;
    case "SLACK":
      validateSlackTemplateJson(parsed);
      return parsed;
    case "DISCORD":
      validateDiscordTemplateJson(parsed);
      return parsed;
    default:
      throw new Error(`Unknown template type: ${templateType}`);
  }
}

// ============ CRUD Operations ============

export interface CreateTemplateInput {
  template_name: string;
  template_type: TemplateType;
  template_usage: TemplateUsageType;
  template_json: string;
}

export interface UpdateTemplateInput {
  id: number;
  template_name?: string;
  template_type?: TemplateType;
  template_usage?: TemplateUsageType;
  template_json?: string;
}

/**
 * Create a new template
 */
export async function CreateTemplate(input: CreateTemplateInput): Promise<TemplateRecord> {
  // Validate inputs
  validateTemplateName(input.template_name);
  validateTemplateType(input.template_type);
  validateTemplateUsage(input.template_usage);
  validateTemplateJson(input.template_type, input.template_json);

  // Check for duplicate name
  const exists = await db.templateNameExists(input.template_name, input.template_type, input.template_usage);
  if (exists) {
    throw new Error(
      `Template with name "${input.template_name}" already exists for type ${input.template_type} and usage ${input.template_usage}`,
    );
  }

  const insertData: TemplateInsert = {
    template_name: input.template_name.trim(),
    template_type: input.template_type,
    template_usage: input.template_usage,
    template_json: input.template_json,
  };

  const [id] = await db.insertTemplate(insertData);

  const result = await db.getTemplateById(id);
  if (!result) {
    throw new Error("Failed to create template");
  }

  return result;
}

/**
 * Update an existing template
 */
export async function UpdateTemplate(input: UpdateTemplateInput): Promise<TemplateRecord> {
  // Verify template exists
  const existing = await db.getTemplateById(input.id);
  if (!existing) {
    throw new Error(`Template with id ${input.id} not found`);
  }

  const updateData: TemplateUpdate = {};

  if (input.template_name !== undefined) {
    validateTemplateName(input.template_name);
    updateData.template_name = input.template_name.trim();
  }

  if (input.template_type !== undefined) {
    validateTemplateType(input.template_type);
    updateData.template_type = input.template_type;
  }

  if (input.template_usage !== undefined) {
    validateTemplateUsage(input.template_usage);
    updateData.template_usage = input.template_usage;
  }

  // Determine template type for JSON validation
  const effectiveType = input.template_type || existing.template_type;

  if (input.template_json !== undefined) {
    validateTemplateJson(effectiveType, input.template_json);
    updateData.template_json = input.template_json;
  }

  // Check for duplicate name if name is being changed
  if (updateData.template_name) {
    const effectiveUsage = input.template_usage || existing.template_usage;
    const exists = await db.templateNameExists(updateData.template_name, effectiveType, effectiveUsage, input.id);
    if (exists) {
      throw new Error(
        `Template with name "${updateData.template_name}" already exists for type ${effectiveType} and usage ${effectiveUsage}`,
      );
    }
  }

  await db.updateTemplate(input.id, updateData);

  const result = await db.getTemplateById(input.id);
  if (!result) {
    throw new Error("Failed to update template");
  }

  return result;
}

/**
 * Get template by ID
 */
export async function GetTemplateById(id: number): Promise<TemplateRecord | undefined> {
  return await db.getTemplateById(id);
}

/**
 * Get templates with optional filtering
 */
export async function GetTemplates(filter: TemplateFilter = {}): Promise<TemplateRecord[]> {
  return await db.getTemplates(filter);
}

/**
 * Get all templates
 */
export async function GetAllTemplates(): Promise<TemplateRecord[]> {
  return await db.getAllTemplates();
}

/**
 * Get templates by type
 */
export async function GetTemplatesByType(templateType: TemplateType): Promise<TemplateRecord[]> {
  validateTemplateType(templateType);
  return await db.getTemplatesByType(templateType);
}

/**
 * Get templates by usage
 */
export async function GetTemplatesByUsage(templateUsage: TemplateUsageType): Promise<TemplateRecord[]> {
  validateTemplateUsage(templateUsage);
  return await db.getTemplatesByUsage(templateUsage);
}

/**
 * Get templates by type and usage
 */
export async function GetTemplatesByTypeAndUsage(
  templateType: TemplateType,
  templateUsages: TemplateUsageType[],
): Promise<TemplateRecord[]> {
  validateTemplateType(templateType);
  templateUsages.forEach((usage) => validateTemplateUsage(usage));
  return await db.getTemplatesByTypeAndUsage(templateType, templateUsages);
}

/**
 * Delete a template
 */
export async function DeleteTemplate(id: number): Promise<void> {
  const existing = await db.getTemplateById(id);
  if (!existing) {
    throw new Error(`Template with id ${id} not found`);
  }

  await db.deleteTemplate(id);
}

/**
 * Get templates count with optional filtering
 */
export async function GetTemplatesCount(filter: TemplateFilter = {}): Promise<number> {
  const result = await db.getTemplatesCount(filter);
  return Number(result?.count) || 0;
}

// ============ Utility Functions ============

/**
 * Parse template JSON string to typed object
 */
export function parseTemplateJson<T extends TemplateJsonType>(template: TemplateRecord): TemplateParsed<T> {
  return {
    ...template,
    template_json: JSON.parse(template.template_json) as T,
  };
}

/**
 * Get default template JSON for a given template type
 */
export function getDefaultTemplateJson(templateType: TemplateType): TemplateJsonType {
  switch (templateType) {
    case "EMAIL":
      return {
        email_subject: "",
        email_body: "",
      };
    case "WEBHOOK":
      return {
        webhook_body: "{}",
      };
    case "SLACK":
      return {
        slack_body: "{}",
      };
    case "DISCORD":
      return {
        discord_body: "{}",
      };
    default:
      throw new Error(`Unknown template type: ${templateType}`);
  }
}

/**
 * Stringify template JSON object to string
 */
export function stringifyTemplateJson(json: TemplateJsonType): string {
  return JSON.stringify(json);
}

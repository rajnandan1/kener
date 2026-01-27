import db from "$lib/server/db/db";
import type {
  EmailTemplateConfigRecord,
  EmailTemplateConfigUpdate,
  EmailTemplateConfigWithTemplate,
} from "$lib/server/db/repositories/emailTemplateConfig";
import type { TemplateRecord } from "$lib/server/types/db";

// Email type constants
export const EMAIL_TYPES = {
  EMAIL_CODE: "email_code",
  FORGOT_PASSWORD: "forgot_password",
  VERIFY_EMAIL: "verify_email",
  SUBSCRIPTION_UPDATE: "subscription_update",
} as const;

export type EmailType = (typeof EMAIL_TYPES)[keyof typeof EMAIL_TYPES];

// Human-readable labels for email types
export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  email_code: "Verification Code",
  forgot_password: "Forgot Password",
  verify_email: "Verify Email",
  subscription_update: "Subscription Update",
};

// Descriptions for email types
export const EMAIL_TYPE_DESCRIPTIONS: Record<EmailType, string> = {
  email_code: "Email sent when a user requests a verification code for login or actions",
  forgot_password: "Email sent when a user requests to reset their password",
  verify_email: "Email sent when a user needs to verify their email address",
  subscription_update: "Email sent to subscribers when there is an update on monitored services",
};

/**
 * Get all email template configurations
 */
export async function GetAllEmailTemplateConfigs(): Promise<EmailTemplateConfigRecord[]> {
  return await db.getAllEmailTemplateConfigs();
}

/**
 * Get all email template configurations with template details
 */
export async function GetAllEmailTemplateConfigsWithTemplates(): Promise<EmailTemplateConfigWithTemplate[]> {
  return await db.getAllEmailTemplateConfigsWithTemplates();
}

/**
 * Get email template config by email type
 */
export async function GetEmailTemplateConfigByType(emailType: string): Promise<EmailTemplateConfigRecord | undefined> {
  return await db.getEmailTemplateConfigByType(emailType);
}

/**
 * Update email template config
 */
export async function UpdateEmailTemplateConfig(
  emailType: string,
  data: EmailTemplateConfigUpdate,
): Promise<{ success: boolean; error?: string }> {
  // Validate email type
  if (!Object.values(EMAIL_TYPES).includes(emailType as EmailType)) {
    return { success: false, error: `Invalid email type: ${emailType}` };
  }

  // Validate template if provided
  if (data.email_template_id !== null && data.email_template_id !== undefined) {
    const template = await db.getTemplateById(data.email_template_id);
    if (!template) {
      return { success: false, error: `Template with ID ${data.email_template_id} not found` };
    }
    // Ensure it's an email template
    if (template.template_type !== "EMAIL") {
      return {
        success: false,
        error: `Template ${data.email_template_id} is not an email template`,
      };
    }
  }

  // Validate is_active if provided
  if (data.is_active !== undefined && !["YES", "NO"].includes(data.is_active)) {
    return { success: false, error: `Invalid is_active value: ${data.is_active}` };
  }

  await db.updateEmailTemplateConfigByType(emailType, data);
  return { success: true };
}

/**
 * Batch update multiple email template configs
 */
export async function UpdateAllEmailTemplateConfigs(
  configs: Array<{ email_type: string; email_template_id: number | null; is_active: string }>,
): Promise<{ success: boolean; error?: string }> {
  for (const config of configs) {
    const result = await UpdateEmailTemplateConfig(config.email_type, {
      email_template_id: config.email_template_id,
      is_active: config.is_active,
    });
    if (!result.success) {
      return result;
    }
  }
  return { success: true };
}

/**
 * Get active email template config by type with template details
 */
export async function GetActiveEmailTemplateConfigByType(
  emailType: string,
): Promise<EmailTemplateConfigWithTemplate | undefined> {
  return await db.getActiveEmailTemplateConfigByType(emailType);
}

/**
 * Get all email templates (for dropdown)
 */
export async function GetEmailTemplates(): Promise<
  Array<{ id: number; template_name: string; template_type: string }>
> {
  const allTemplates = await db.getTemplatesByTypeAndUsage("EMAIL", ["GENERAL"]);
  return allTemplates.map((t) => ({
    id: t.id,
    template_name: t.template_name,
    template_type: t.template_type,
  }));
}

/**
 * Get the template associated with an email type
 * Returns the template if the config is active and has a valid template_id
 */
export async function GetTemplateByEmailType(emailType: string): Promise<TemplateRecord | null> {
  const config = await db.getEmailTemplateConfigByType(emailType);

  // Check if config exists, is active, and has a template assigned
  if (!config || config.is_active !== "YES" || !config.email_template_id) {
    return null;
  }

  const template = await db.getTemplateById(config.email_template_id);
  return template || null;
}

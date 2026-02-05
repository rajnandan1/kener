import { HashPassword, GenerateToken, VerifyToken, GetAllSiteData } from "$lib/server/controllers/controller.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import db from "$lib/server/db/db.js";
import { GetGeneralEmailTemplateById } from "$lib/server/controllers/generalTemplateController";
import { siteDataToVariables } from "$lib/server/notification/notification_utils";
import sendEmail from "$lib/server/notification/email_notification.js";

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { email } = body;

  if (!email) {
    return json({ error: "Email is required" }, { status: 400 });
  }

  let userDB = await db.getUserByEmail(email);
  if (!!!userDB) {
    let errorMessage = "User does not exist";
    return json({ error: errorMessage }, { status: 401 });
  }

  // Generate token
  const token = await GenerateToken({
    email: userDB.email,
    generatedAt: Date.now(),
  });

  const siteData = await GetAllSiteData();
  const siteVars = siteDataToVariables(siteData);
  const siteUrl = siteVars.site_url || "";
  let link = `${siteUrl}/account/forgot?view=confirm_token&token=${token}`;

  const template = await GetGeneralEmailTemplateById("forgot_password");
  if (!template) {
    return json({ error: "Email template not found" }, { status: 404 });
  }

  // Prepare variables
  const emailVars = {
    ...siteVars,
    reset_link: link,
  };

  // Send email
  try {
    await sendEmail(
      template.template_html_body || "",
      template.template_subject || "Your Password Reset Request",
      emailVars,
      [email],
    );
    return json({ success: true });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return json({ success: false, error: "Failed to send password reset email" }, { status: 500 });
  }
};

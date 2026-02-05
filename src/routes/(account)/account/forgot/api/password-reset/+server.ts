import { HashPassword, GenerateToken, VerifyToken, GetAllSiteData } from "$lib/server/controllers/controller.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import db from "$lib/server/db/db.js";
import { GetGeneralEmailTemplateById } from "$lib/server/controllers/generalTemplateController";
import { siteDataToVariables } from "$lib/server/notification/notification_utils";
import sendEmail from "$lib/server/notification/email_notification.js";

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { receivedToken, newPassword } = body;

  if (!receivedToken) {
    return json({ error: "Token is required" }, { status: 400 });
  }
  let data = await VerifyToken(receivedToken);
  if (!data) {
    return json({ error: "Invalid or expired token" }, { status: 400 });
  }
  let email = data.email;
  if (!email) {
    return json({ error: "Invalid token data" }, { status: 400 });
  }
  let generatedAt = data.generatedAt;
  if (!generatedAt) {
    return json({ error: "Invalid token data" }, { status: 400 });
  }
  let currentTime = Date.now();
  // Check if token is expired (1 hour = 3600000 milliseconds)
  if (currentTime - generatedAt > 3600000) {
    return json({ error: "Token has expired" }, { status: 400 });
  }

  let userDB = await db.getUserByEmail(email);
  if (!!!userDB) {
    let errorMessage = "User does not exist";
    return json({ error: errorMessage }, { status: 401 });
  }
  let password_hash = await HashPassword(newPassword);
  await db.updateUserPassword({
    id: userDB.id,
    password_hash: password_hash,
  });
  return json({ success: true });
};

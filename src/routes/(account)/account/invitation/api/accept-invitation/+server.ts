import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import db from "$lib/server/db/db.js";
import { HashPassword, ValidatePassword, VerifyToken } from "$lib/server/controllers/commonController.js";
import { GetUserPasswordHashById } from "$lib/server/controllers/userController.js";

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { receivedToken, newPassword } = body;

  if (!receivedToken) {
    return json({ error: "Token is required" }, { status: 400 });
  }

  if (!newPassword) {
    return json({ error: "Password is required" }, { status: 400 });
  }

  // Verify token
  const tokenData = await VerifyToken(receivedToken);
  if (!tokenData) {
    return json({ error: "Invalid or expired invitation link" }, { status: 400 });
  }

  const email = tokenData.email;
  if (!email) {
    return json({ error: "Invalid token data" }, { status: 400 });
  }

  // Check token expiry
  const validTill = tokenData.validTill;
  if (!validTill || Date.now() > validTill) {
    return json({ error: "This invitation link has expired" }, { status: 400 });
  }

  // Check user exists with empty password
  const user = await db.getUserByEmail(email);
  if (!user) {
    return json({ error: "User does not exist" }, { status: 401 });
  }

  const passwordData = await GetUserPasswordHashById(user.id);
  if (passwordData && passwordData.password_hash !== "") {
    return json({ error: "This invitation has already been accepted" }, { status: 400 });
  }

  // Validate password strength
  if (!ValidatePassword(newPassword)) {
    return json(
      {
        error: "Password must contain at least 8 characters, one uppercase letter, one lowercase letter and one number",
      },
      { status: 400 },
    );
  }

  // Hash and set password
  const passwordHash = await HashPassword(newPassword);
  await db.updateUserPassword({
    id: user.id,
    password_hash: passwordHash,
  });

  // Activate user and mark as verified
  await db.updateUserIsActive(user.id, 1);
  await db.updateIsVerified(user.id, 1);

  return json({ success: true });
};

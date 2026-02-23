import type { PageServerLoad } from "./$types";
import { VerifyToken } from "$lib/server/controllers/commonController.js";
import db from "$lib/server/db/db.js";
import { GetUserPasswordHashById } from "$lib/server/controllers/userController.js";

export const load: PageServerLoad = async ({ url, cookies }) => {
  // Clear any existing session
  cookies.delete("kener-user", { path: "/" });

  const view = url.searchParams.get("view") || "";
  const token = url.searchParams.get("token") || "";

  // If no token or not confirm_token view, show error
  if (view !== "confirm_token" || !token) {
    return {
      valid: false,
      error: "Invalid or missing invitation link.",
      token: "",
    };
  }

  // Verify the token
  const tokenData = await VerifyToken(token);
  if (!tokenData) {
    return {
      valid: false,
      error: "Invalid or expired invitation link.",
      token: "",
    };
  }

  const email = tokenData.email;
  if (!email) {
    return {
      valid: false,
      error: "Invalid invitation link.",
      token: "",
    };
  }

  // Check if token has expired (validTill)
  const validTill = tokenData.validTill;
  if (!validTill || Date.now() > validTill) {
    return {
      valid: false,
      error: "This invitation link has expired. Please ask your administrator to send a new one.",
      token: "",
    };
  }

  // Check if user exists with empty password (invited but not yet activated)
  const user = await db.getUserByEmail(email);
  if (!user) {
    return {
      valid: false,
      error: "No invitation found for this email address.",
      token: "",
    };
  }

  const passwordData = await GetUserPasswordHashById(user.id);
  if (passwordData && passwordData.password_hash !== "") {
    return {
      valid: false,
      error: "This invitation has already been accepted. Please sign in instead.",
      token: "",
    };
  }

  return {
    valid: true,
    error: "",
    token,
    email: user.email,
    name: user.name,
  };
};

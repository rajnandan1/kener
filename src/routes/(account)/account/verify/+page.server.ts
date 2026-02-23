import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { VerifyToken } from "$lib/server/controllers/commonController.js";
import db from "$lib/server/db/db.js";
import serverResolve from "$lib/server/resolver.js";

export const load: PageServerLoad = async ({ url }) => {
  const view = url.searchParams.get("view") || "";
  const token = url.searchParams.get("token") || "";

  if (view !== "confirm_token" || !token) {
    return {
      valid: false,
      error: "Invalid or missing verification link.",
    };
  }

  const tokenData = await VerifyToken(token);
  if (!tokenData) {
    return {
      valid: false,
      error: "Invalid or expired verification link.",
    };
  }

  const email = tokenData.email;
  if (!email) {
    return {
      valid: false,
      error: "Invalid verification link.",
    };
  }

  const validTill = tokenData.validTill;
  if (!validTill || Date.now() > validTill) {
    return {
      valid: false,
      error: "This verification link has expired. Please request a new one.",
    };
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    return {
      valid: false,
      error: "No user found for this verification link.",
    };
  }

  if (!user.is_verified) {
    await db.updateIsVerified(user.id, 1);
  }

  throw redirect(302, serverResolve("/manage/app/users"));
};

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { GetUserByEmail, GetUsersCount, GetUserPasswordHashById } from "$lib/server/controllers/userController";
import { VerifyPassword, GenerateToken, CookieConfig } from "$lib/server/controllers/commonController";
import constants from "$lib/global-constants";

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check if setup is done
    const userCount = await GetUsersCount();
    if (!userCount || Number(userCount.count) === 0) {
      return json({ error: constants.ERROR_NO_SETUP }, { status: 400 });
    }

    // Check if user exists
    const userDB = await GetUserByEmail(email);
    if (!userDB) {
      return json({ error: "User does not exist" }, { status: 401 });
    }

    // Verify password
    const passwordStored = await GetUserPasswordHashById(userDB.id);
    if (!passwordStored) {
      return json({ error: "Invalid password or Email" }, { status: 401 });
    }

    const isMatch = await VerifyPassword(password, passwordStored.password_hash);
    if (!isMatch) {
      return json({ error: "Invalid password or Email" }, { status: 401 });
    }

    // Generate token
    const token = await GenerateToken(userDB);

    // Set cookie
    const cookieConfig = CookieConfig();
    cookies.set(cookieConfig.name, token, {
      path: cookieConfig.path,
      maxAge: cookieConfig.maxAge,
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
    });

    return json({ success: true, redirect: "/manage/app/site-configurations" });
  } catch (e) {
    console.error("Login error:", e);
    return json({ error: "An error occurred during login" }, { status: 500 });
  }
};

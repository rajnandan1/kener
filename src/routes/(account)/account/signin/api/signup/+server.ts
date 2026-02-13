import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { GetUsersCount, GetUserByEmail, CreateFirstUser } from "$lib/server/controllers/userController";
import { GenerateToken, CookieConfig } from "$lib/server/controllers/commonController";

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    // Check if setup is already done
    const userCount = await GetUsersCount();
    if (userCount && Number(userCount.count) !== 0) {
      return json(
        { error: "Set up already done. Please login with the email and password you have set up." },
        { status: 400 },
      );
    }

    // Create the first admin user
    await CreateFirstUser({ email, name, password });

    // Get the created user
    const userDB = await GetUserByEmail(email);
    if (!userDB) {
      return json({ error: "Failed to create user" }, { status: 500 });
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
    console.error("Signup error:", e);
    const errorMessage = e instanceof Error ? e.message : "An error occurred during signup";
    return json({ error: errorMessage }, { status: 400 });
  }
};

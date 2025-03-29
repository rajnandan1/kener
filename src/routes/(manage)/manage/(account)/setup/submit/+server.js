// @ts-nocheck
import { json, redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import db from "$lib/server/db/db.js";
import { HashPassword, GenerateToken, CookieConfig, ValidatePassword } from "$lib/server/controllers/controller.js";

export async function POST({ request, cookies }) {
  //read form post data email and password
  const formdata = await request.formData();
  const email = formdata.get("email");
  const password = formdata.get("password");
  const name = formdata.get("name");

  //check if any entry in user table is already there
  let userCount = await db.getUsersCount();
  if (userCount.count != 0) {
    let errorMessage = "Set up already done. Please login with the email and password you have set up.";
    throw redirect(302, base + "/manage/setup?error=" + errorMessage);
  }
  //validate password
  if (!ValidatePassword(password)) {
    let errorMessage =
      "Password must contain at least one digit, one lowercase letter, one uppercase letter, and have a minimum length of 8 characters.";
    throw redirect(302, base + "/manage/setup?error=" + errorMessage);
  }
  let user = {
    email: email,
    password_hash: await HashPassword(password),
    name: name,
    role: "admin",
  };

  await db.insertUser(user);
  let userDB = await db.getUserByEmail(email);
  if (!!!userDB) {
    let errorMessage = "User does not exist";
    throw redirect(302, base + "/manage/signin?error=" + errorMessage);
  }
  let token = await GenerateToken(userDB);
  let cookieConfig = CookieConfig();
  cookies.set(cookieConfig.name, token, {
    path: cookieConfig.path,
    maxAge: cookieConfig.maxAge, // 1 year in seconds
    httpOnly: cookieConfig.httpOnly,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
  });
  throw redirect(302, base + "/manage/app/site");
}

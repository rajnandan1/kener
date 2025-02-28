// @ts-nocheck
import { json, redirect } from "@sveltejs/kit";
import { BASE_PATH } from "$lib/server/constants.js";
import db from "$lib/server/db/db.js";
import { HashPassword, GenerateSalt, GenerateToken, CookieConfig } from "$lib/server/controllers/controller.js";

//function to validate a strong password
/**
 * Validates a password to ensure it meets the following criteria:
 * - Contains at least one digit.
 * - Contains at least one lowercase letter.
 * - Contains at least one uppercase letter.
 * - Contains at least one letter (either lowercase or uppercase).
 * - Has a minimum length of 8 characters.
 *
 * @param {string} password - The password to validate.
 * @returns {boolean} - Returns true if the password meets the criteria, otherwise false.
 */
function validatePassword(password) {
  return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/.test(password);
}

export async function POST({ request, cookies }) {
  //read form post data email and passowrd
  const formdata = await request.formData();
  const email = formdata.get("email");
  const password = formdata.get("password");
  const name = formdata.get("name");

  //check if any entry in user table is already there
  let userCount = await db.getUsersCount();
  if (userCount.count != 0) {
    let errorMessage = "Set up already done. Please login with the email and password you have set up.";
    throw redirect(302, BASE_PATH + "/manage/setup?error=" + errorMessage);
  }
  //validate password
  if (!validatePassword(password)) {
    let errorMessage =
      "Password must contain at least one digit, one lowercase letter, one uppercase letter, and have a minimum length of 8 characters.";
    throw redirect(302, BASE_PATH + "/manage/setup?error=" + errorMessage);
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
    throw redirect(302, BASE_PATH + "/manage/signin?error=" + errorMessage);
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
  throw redirect(302, BASE_PATH + "/manage/app/site");
}

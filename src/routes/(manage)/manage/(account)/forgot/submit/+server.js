// @ts-nocheck
import { json, redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import db from "$lib/server/db/db.js";
import { SendEmailWithTemplate, GetSiteLogoURL } from "$lib/server/controllers/controller.js";
import forgotPasswordTemplate from "$lib/server/templates/forgot_pass.html?raw";

import { HashPassword, GenerateToken, VerifyToken, GetSMTPFromENV } from "$lib/server/controllers/controller.js";

export async function POST({ request, cookies }) {
  //read form post data email and password
  const formdata = await request.formData();
  const email = formdata.get("email");
  const senderEmail = process.env.RESEND_SENDER_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  const siteURL = await db.getSiteData("siteURL");
  const siteName = await db.getSiteData("siteName");
  const logo = await db.getSiteData("logo");

  //check if any entry in user table is already there
  let userDB = await db.getUserByEmail(email);
  if (!!!userDB) {
    let errorMessage = "User does not exist";
    throw redirect(302, base + "/manage/forgot?view=sent&email=" + email);
  }

  //generate token
  let token = await GenerateToken({
    email: email,
  });

  //send email with link to reset password
  let link = siteURL.value + base + "/manage/forgot?view=token&token=" + token;
  let subject = "[Reset Password] Kener Reset password request";

  let emailText = `
		Click on the link below to reset your password:
		${link}
		This link will expire in 1 hour.
		If you did not request a password reset, please ignore this email.
	`;

  let emailData = {
    logo_url: await GetSiteLogoURL(siteURL.value, logo.value, base),
    link: link,
    brand_name: siteName.value,
  };

  await SendEmailWithTemplate(forgotPasswordTemplate, emailData, email, subject, emailText);
  throw redirect(302, base + "/manage/forgot?view=sent&email=" + email);
}

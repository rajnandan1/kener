// @ts-nocheck
import { json, redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import db from "$lib/server/db/db.js";
import { Resend } from "resend";
import {
	HashPassword,
	GenerateSalt,
	GenerateToken,
	VerifyToken
} from "$lib/server/controllers/controller.js";

export async function POST({ request, cookies }) {
	//read form post data email and password
	const formdata = await request.formData();
	const email = formdata.get("email");
	const senderEmail = process.env.RESEND_SENDER_EMAIL;
	const resendKey = process.env.RESEND_API_KEY;
	const siteURL = await db.getSiteData("siteURL");

	//check if any entry in user table is already there
	let userDB = await db.getUserByEmail(email);
	if (!!!userDB) {
		let errorMessage = "User does not exist";
		throw redirect(302, base + "/manage/forgot?view=sent&email=" + email);
	}

	//generate token
	let token = await GenerateToken({
		email: email
	});

	//send email with link to reset password
	let link = siteURL.value + base + "/manage/forgot?view=token&token=" + token;
	let subject = "[Reset Password] Kener Reset password request";
	let message = `
		<!DOCTYPE html>
		<html>
		<head>
			<title>Reset Password</title>
		</head>
		<body>
			<p>Click on the link below to reset your password:</p>
			<p><a href="${link}">Reset Password</a></p>
			<p>You can also copy paste this link ${link}</p>
			<p></p>This link will expire in 1 hour.</p>
			<p>If you did not request a password reset, please ignore this email.</p>
		</body>
		</html>
	`;
	let mail = {
		from: senderEmail,
		to: [email],
		subject: subject,
		html: message
	};

	const resend = new Resend(resendKey);
	await resend.emails.send(mail);

	throw redirect(302, base + "/manage/forgot?view=sent&email=" + email);
}

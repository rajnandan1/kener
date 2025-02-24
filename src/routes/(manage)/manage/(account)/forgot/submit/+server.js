// @ts-nocheck
import { json, redirect } from "@sveltejs/kit";
import { BASE_PATH } from "$lib/server/constants.js";
import db from "$lib/server/db/db.js";
import { Resend } from "resend";
import getSMTPTransport from "$lib/server/notification/smtps.js";
import {
	HashPassword,
	GenerateSalt,
	GenerateToken,
	VerifyToken,
	GetSMTPFromENV
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
		throw redirect(302, BASE_PATH + "/manage/forgot?view=sent&email=" + email);
	}

	//generate token
	let token = await GenerateToken({
		email: email
	});

	//send email with link to reset password
	let link = siteURL.value + BASE_PATH + "/manage/forgot?view=token&token=" + token;
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
	let emailText = `
		Click on the link below to reset your password:
		${link}
		This link will expire in 1 hour.
		If you did not request a password reset, please ignore this email.
	`;
	let mail = {
		from: senderEmail,
		to: [email],
		subject: subject,
		text: emailText,
		html: message
	};

	let smtpData = GetSMTPFromENV();
	if (!!smtpData) {
		const transporter = getSMTPTransport(smtpData);
		const mailOptions = {
			from: smtpData.smtp_from_email,
			to: email,
			subject: mail.subject,
			html: mail.html,
			text: mail.text
		};
		try {
			await transporter.sendMail(mailOptions);
		} catch (error) {
			console.error("Error sending email via SMTP", error);
			return;
		}
	} else {
		const resend = new Resend(resendKey);
		await resend.emails.send(mail);
	}

	throw redirect(302, BASE_PATH + "/manage/forgot?view=sent&email=" + email);
}

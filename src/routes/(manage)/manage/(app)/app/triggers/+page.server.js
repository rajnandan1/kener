// @ts-nocheck

import { GetSMTPFromENV } from "$lib/server/controllers/controller.js";
import { MaskString } from "$lib/server/tool.js";

export async function load({ parent }) {
	let preferredModeEmail = "resend";
	let fromEmail = "";
	let isResendKeySet = !!process.env.RESEND_API_KEY;
	let isResendSenderEmailSet = !!process.env.RESEND_SENDER_EMAIL;
	if (isResendKeySet && isResendSenderEmailSet) {
		fromEmail = process.env.RESEND_SENDER_EMAIL;
	}
	let smtp = GetSMTPFromENV();
	if (!!smtp) {
		preferredModeEmail = "smtp";
		fromEmail = smtp.smtp_from_email;
		smtp.smtp_pass = "$SMTP_PASS";
	}
	return {
		fromEmail,
		preferredModeEmail,
		RESEND_API_KEY: isResendKeySet ? MaskString(process.env.RESEND_API_KEY) : "",
		smtp
	};
}

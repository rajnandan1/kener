import dotenv from "dotenv";
dotenv.config();
import db from "$lib/server/db/db.js";
import { GetSMTPFromENV } from "$lib/server/controllers/controller.js";

export async function load({ params, route, url, parent }) {
	//read query parameters
	const query = url.searchParams;
	const token = query.get("token");
	const email = query.get("email");
	let view = query.get("view") || "forgot";
	let siteURL = await db.getSiteData("siteURL");
	return {
		error: query.get("error"),
		isSecretSet: !!process.env.KENER_SECRET_KEY,
		isResendSet: !!process.env.RESEND_API_KEY && !!process.env.RESEND_SENDER_EMAIL,
		isSiteURLSet: !!siteURL.value,
		isSMTPSet: !!GetSMTPFromENV(),
		view,
		token,
		email
	};
}

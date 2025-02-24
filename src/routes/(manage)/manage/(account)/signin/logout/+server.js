// @ts-nocheck
import { json, redirect } from "@sveltejs/kit";
import { BASE_PATH } from "$lib/server/constants.js";
import db from "$lib/server/db/db.js";
import { VerifyPassword, GenerateToken, CookieConfig } from "$lib/server/controllers/controller.js";

export async function GET({ request, cookies }) {
	//read form post data email and password
	let cookieConfig = CookieConfig();

	//delete cookie from browser
	cookies.set(cookieConfig.name, "", {
		path: cookieConfig.path,
		maxAge: 0,
		httpOnly: cookieConfig.httpOnly,
		secure: cookieConfig.secure,
		sameSite: cookieConfig.sameSite
	});

	throw redirect(302, BASE_PATH + "/manage/signin");
}

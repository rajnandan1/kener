// @ts-nocheck
import { json, redirect } from "@sveltejs/kit";

import { base } from "$app/paths";
import db from "$lib/server/db/db.js";
import {
	VerifyPassword,
	GenerateToken,
	VerifyToken,
	CookieConfig
} from "$lib/server/controllers/controller.js";
export async function POST({ request, cookies }) {
	//read form post data email and passowrd
	const formdata = await request.formData();
	const email = formdata.get("email");
	const password = formdata.get("password");

	let userCount = await db.getUsersCount();
	if (userCount.count == 0) {
		let errorMessage = "Set up not done yet. Create a user first.";
		throw redirect(302, base + "/manage/setup?error=" + errorMessage);
	}

	//check if any entry in user table is already there
	let userDB = await db.getUserByEmail(email);
	if (!!!userDB) {
		let errorMessage = "User does not exist";
		throw redirect(302, base + "/manage/signin?error=" + errorMessage);
	}

	let passwordStored = await db.getUserPasswordHashById(userDB.id);
	let isMatch = await VerifyPassword(password, passwordStored.password_hash);
	if (!isMatch) {
		let errorMessage = "Invalid password or Email";
		throw redirect(302, base + "/manage/signin?error=" + errorMessage);
	}

	//generate token
	let token = await GenerateToken(userDB);

	let cookieConfig = CookieConfig();
	//set server side cookie with 1 year expiry
	cookies.set(cookieConfig.name, token, {
		path: cookieConfig.path,
		maxAge: cookieConfig.maxAge, // 1 year in seconds
		httpOnly: cookieConfig.httpOnly,
		secure: cookieConfig.secure,
		sameSite: cookieConfig.sameSite
	});

	throw redirect(302, base + "/manage/app/site");
}

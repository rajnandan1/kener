// @ts-nocheck
import { json, redirect } from "@sveltejs/kit";
import { BASE_PATH } from "$lib/server/constants.js";
import db from "$lib/server/db/db.js";
import { HashPassword, VerifyToken } from "$lib/server/controllers/controller.js";

export async function POST({ request, cookies }) {
	//read form post data email and passowrd
	const formdata = await request.formData();
	const password = formdata.get("password");
	const token = formdata.get("token");

	//check if any entry in user table is already there

	try {
		let data = await VerifyToken(token);
		let email = data.email;
		let userDB = await db.getUserByEmail(email);
		if (!!!userDB) {
			let errorMessage = "User does not exist";
			throw redirect(302, BASE_PATH + "/manage/signin?view=error&error=" + errorMessage);
		}
		let password_hash = await HashPassword(password);
		await db.updateUserPassword({
			id: userDB.id,
			password_hash: password_hash
		});
	} catch (e) {
		let errorMessage = "Invalid token";
		throw redirect(302, BASE_PATH + "/manage/forgot?view=error&error=" + errorMessage);
	}

	throw redirect(302, BASE_PATH + "/manage/forgot?view=success");
}

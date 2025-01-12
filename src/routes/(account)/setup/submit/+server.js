// @ts-nocheck
import { json, redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import db from "$lib/server/db/db.js";
import { HashPassword, GenerateSalt } from "$lib/server/controllers/controller.js";

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

export async function POST({ request }) {
	//read form post data email and passowrd
	const formdata = await request.formData();
	const email = formdata.get("email");
	const password = formdata.get("password");
	const name = formdata.get("name");

	//check if any entry in user table is already there
	let userCount = await db.getUsersCount();
	if (userCount.count != 0) {
		let errorMessage =
			"Set up already done. Please login with the email and password you have set up.";
		throw redirect(302, base + "/setup?error=" + errorMessage);
	}

	let user = {
		email: email,
		password_hash: await HashPassword(password),
		name: name,
		role: "admin"
	};

	//validate password
	if (!validatePassword(password)) {
		let errorMessage =
			"Password must contain at least one digit, one lowercase letter, one uppercase letter, and have a minimum length of 8 characters.";
		throw redirect(302, base + "/setup?error=" + errorMessage);
	}

	await db.insertUser(user);
	throw redirect(302, base + "/");
}

// @ts-nocheck
import { json, redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import db from "$lib/server/db/db.js";
import seedSiteData from "$lib/server/db/seedSiteData.js";
import { HashPassword, GenerateSalt } from "$lib/server/controllers/controller.js";

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
	await db.insertUser(user);

	for (const key in seedSiteData) {
		if (Object.prototype.hasOwnProperty.call(seedSiteData, key)) {
			let value = seedSiteData[key];
			let dataType = typeof value;
			if (dataType === "object") {
				value = JSON.stringify(value);
			}
			await this.insertOrUpdateSiteData(key, value, dataType);
		}
	}

	throw redirect(302, base + "/signin");
}

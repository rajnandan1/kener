// @ts-nocheck

import { redirect } from "@sveltejs/kit";
import db from "$lib/server/db/db.js";
import { VerifyToken } from "$lib/server/controllers/controller.js";

import { base } from "$app/paths";
export async function load({ params, route, url, cookies }) {
	//read query parameters
	let tokenData = cookies.get("kener-user");
	if (!!tokenData) {
		let tokenUser = await VerifyToken(tokenData);
		if (!!!tokenUser) {
			throw redirect(302, base + "/signin/logout");
		}
		let userDB = await db.getUserByEmail(tokenUser.email);
		if (!!userDB) {
			throw redirect(302, base + "/manage");
		}
	}
	const query = url.searchParams;
	return {
		error: query.get("error")
	};
}

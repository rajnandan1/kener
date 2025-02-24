// @ts-nocheck

import { redirect } from "@sveltejs/kit";
import db from "$lib/server/db/db.js";
import { VerifyToken } from "$lib/server/controllers/controller.js";

// import { base } from "$app/paths";
import { BASE_PATH } from "$lib/server/constants.js";
export async function load({ params, route, url, cookies }) {
	//read query parameters
	let tokenData = cookies.get("kener-user");
	if (!!tokenData) {
		let tokenUser = await VerifyToken(tokenData);
		if (!!!tokenUser) {
			throw redirect(302, BASE_PATH + "/manage/signin/logout");
		}
		let userDB = await db.getUserByEmail(tokenUser.email);
		if (!!userDB) {
			throw redirect(302, BASE_PATH + "/manage/app/site");
		}
	}
	let userCount = await db.getUsersCount();
	const query = url.searchParams;
	return {
    basePath: BASE_PATH,
		error: query.get("error"),
		firstUser: userCount.count === 0
	};
}

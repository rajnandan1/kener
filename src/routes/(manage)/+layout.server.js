// @ts-nocheck
import { GetAllSiteData, VerifyToken } from "$lib/server/controllers/controller.js";
import { redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import db from "$lib/server/db/db.js";
//write a function to mask a string, just have last 4 characters visible
function maskString(str) {
	return "*".repeat(str.length - 4) + str.slice(-4);
}

export async function load({ params, route, url, cookies, request }) {
	let siteData = await GetAllSiteData();
	//check if user is authenticated using cookies
	if (process.env.KENER_SECRET_KEY === undefined) {
		throw redirect(302, base + "/setup");
	}
	let tokenData = cookies.get("kener-user");

	if (!!!tokenData) {
		//redirect to signin page if user is not authenticated
		throw redirect(302, base + "/signin");
	}

	//get user by email
	let tokenUser = await VerifyToken(tokenData);
	if (!!!tokenUser) {
		//redirect to signin page if user is not authenticated
		throw redirect(302, base + "/signin/logout");
	}
	let userDB = await db.getUserByEmail(tokenUser.email);
	if (!!!userDB) {
		//redirect to signin page if user is not authenticated
		throw redirect(302, base + "/signin");
	}

	//
	return {
		siteData,
		GH_TOKEN: !!process.env.GH_TOKEN ? maskString(process.env.GH_TOKEN) : "",
		KENER_SECRET_KEY: !!process.env.KENER_SECRET_KEY
			? maskString(process.env.KENER_SECRET_KEY)
			: "",
		RESEND_API_KEY: !!process.env.RESEND_API_KEY ? maskString(process.env.RESEND_API_KEY) : ""
	};
}

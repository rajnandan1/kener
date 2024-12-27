// @ts-nocheck
import { json, redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import db from "$lib/server/db/db.js";
import { VerifyPassword, GenerateToken } from "$lib/server/controllers/controller.js";

export async function GET({ request, cookies }) {
	//read form post data email and passowrd

	//clear the cookie
	cookies.delete("kener-user", {
		path: "/" + base
	});

	throw redirect(302, base + "/signin");
}

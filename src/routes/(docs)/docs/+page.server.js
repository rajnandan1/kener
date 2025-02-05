// @ts-nocheck

import { redirect } from "@sveltejs/kit";
import { base } from "$app/paths";

export async function load({ parent, url }) {
	throw redirect(302, base + "/docs/home");
}

// @ts-nocheck

import { redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import moment from "moment";

export async function load({ parent, url }) {
	throw redirect(302, base + "/incidents/" + moment().format("MMMM-YYYY"));
}

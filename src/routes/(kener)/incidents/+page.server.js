// @ts-nocheck

import { redirect } from "@sveltejs/kit";
import { BASE_PATH } from "$lib/server/constants.js";
import { format } from "date-fns";

export async function load({ parent, url }) {
	throw redirect(302, BASE_PATH + "/incidents/" + format(new Date(), "MMMM-yyyy"));
}

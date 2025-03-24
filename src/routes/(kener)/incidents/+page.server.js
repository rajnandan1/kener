// @ts-nocheck

import { redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import { format } from "date-fns";

export async function load({ parent, url }) {
  throw redirect(302, base + "/incidents/" + format(new Date(), "MMMM-yyyy"));
}

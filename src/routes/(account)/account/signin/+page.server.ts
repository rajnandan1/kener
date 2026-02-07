import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { VerifyToken } from "$lib/server/controllers/controller.js";
import db from "$lib/server/db/db.js";
import serverResolve from "$lib/server/resolver.js";

export const load: PageServerLoad = async ({ parent }) => {
  const parentData = await parent();
  if (!!!parentData.loggedInUser) {
    throw redirect(302, serverResolve("/account/logout"));
  }
  throw redirect(302, serverResolve("/manage/app/site-configurations"));
};

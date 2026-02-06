import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { VerifyToken } from "$lib/server/controllers/controller.js";
import db from "$lib/server/db/db.js";
import serverResolve from "$lib/server/resolver.js";

export const load: PageServerLoad = async ({ cookies }) => {
  const tokenData = cookies.get("kener-user");
  if (tokenData) {
    const tokenUser = await VerifyToken(tokenData);
    if (!tokenUser) {
      throw redirect(302, serverResolve("/account/logout"));
    }
    const userDB = await db.getUserByEmail(tokenUser.email);
    if (userDB) {
      throw redirect(302, serverResolve("/manage/app/site-configurations"));
    }
  }

  return {};
};

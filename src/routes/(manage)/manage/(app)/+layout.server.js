// @ts-nocheck
import { GetAllSiteData, VerifyToken, IsLoggedInSession } from "$lib/server/controllers/controller.js";
import { redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import { MaskString } from "$lib/server/tool.js";
import db from "$lib/server/db/db.js";
import version from "$lib/version.js";
//write a function to mask a string, just have last 4 characters visible

export async function load({ params, route, url, cookies, request }) {
  let siteData = await GetAllSiteData();
  //check if user is authenticated using cookies
  if (process.env.KENER_SECRET_KEY === undefined) {
    throw redirect(302, base + "/manage/setup");
  }

  let userDB = null;
  let isLoggedIn = await IsLoggedInSession(cookies);
  if (!!isLoggedIn.error) {
    throw redirect(302, base + isLoggedIn.location);
  }

  userDB = isLoggedIn.user;
  return {
    siteData,
    KENER_SECRET_KEY: !!process.env.KENER_SECRET_KEY ? MaskString(process.env.KENER_SECRET_KEY) : "",
    user: userDB,
    kenerVersion: version(),
  };
}

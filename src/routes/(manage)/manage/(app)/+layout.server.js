// @ts-nocheck
import {
  GetAllSiteData,
  VerifyToken,
} from "$lib/server/controllers/controller.js";
import { redirect } from "@sveltejs/kit";
import { BASE_PATH } from "$lib/server/constants.js";
import { MaskString } from "$lib/server/tool.js";
import db from "$lib/server/db/db.js";
//write a function to mask a string, just have last 4 characters visible

export async function load({ params, route, url, cookies, request }) {
  let siteData = await GetAllSiteData();
  //check if user is authenticated using cookies
  if (process.env.KENER_SECRET_KEY === undefined) {
    throw redirect(302, BASE_PATH + "/manage/setup");
  }
  let tokenData = cookies.get("kener-user");

  if (!!!tokenData) {
    //redirect to signin page if user is not authenticated
    throw redirect(302, BASE_PATH + "/manage/signin");
  }

  //get user by email
  let tokenUser = await VerifyToken(tokenData);
  if (!!!tokenUser) {
    //redirect to signin page if user is not authenticated
    throw redirect(302, BASE_PATH + "/manage/signin/logout");
  }
  let userDB = await db.getUserByEmail(tokenUser.email);
  if (!!!userDB) {
    //redirect to signin page if user is not authenticated
    throw redirect(302, BASE_PATH + "/manage/signin");
  }

  return {
    siteData,
    basePath: BASE_PATH,
    KENER_SECRET_KEY: !!process.env.KENER_SECRET_KEY
      ? MaskString(process.env.KENER_SECRET_KEY)
      : "",
  };
}

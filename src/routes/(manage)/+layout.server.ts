import i18n from "$lib/i18n/server";
import { redirect } from "@sveltejs/kit";
import MobileDetect from "mobile-detect";
import type { LayoutServerLoad } from "./$types";
import { IsEmailSetup, CheckInvitationExists } from "$lib/server/controllers/controller.js";
import GC from "$lib/global-constants";

import { resolve } from "$app/paths";
import {
  GetAllSiteData,
  IsSetupComplete,
  IsLoggedInSession,
  GetLocaleFromCookie,
} from "$lib/server/controllers/controller.js";

export const load: LayoutServerLoad = async ({ cookies, request, url }) => {
  const userAgent = request.headers.get("user-agent") ?? "";
  const md = new MobileDetect(userAgent);
  const isMobile = !!md.mobile();

  let isSetupComplete = await IsSetupComplete();
  if (!isSetupComplete) {
    throw redirect(302, resolve(`/manage/setup`));
  }

  let isLoggedIn = await IsLoggedInSession(cookies);

  //if user not set throw redirect to signin
  if (!isLoggedIn.user) {
    throw redirect(302, "/account/logout");
  }

  const siteData = await GetAllSiteData();
  let localTz = "UTC";
  const localTzCookie = cookies.get("localTz");
  if (!!localTzCookie) {
    localTz = localTzCookie;
  }

  // if the user agent is lighthouse, then we are running a lighthouse test
  //if bot also set localTz to -1 to avoid reload
  let isBot = false;
  if (userAgent?.includes("Chrome-Lighthouse") || userAgent?.includes("bot")) {
    isBot = true;
  }

  let selectedLang = GetLocaleFromCookie(siteData, cookies);
  const siteStatusColors = siteData.colors;

  // const emailSubscriptionTrigger = await GetSubscriptionTriggerByEmail();
  return {
    userDb: isLoggedIn.user,
    siteStatusColors,
    canSendEmail: IsEmailSetup(),
    activeInvitationExists: await CheckInvitationExists(isLoggedIn.user.id, GC.INVITE_VERIFY_EMAIL),
  };
};

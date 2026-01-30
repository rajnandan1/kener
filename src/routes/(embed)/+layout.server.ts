import { redirect } from "@sveltejs/kit";
import MobileDetect from "mobile-detect";
import type { LayoutServerLoad } from "./$types";

import { resolve } from "$app/paths";
import {
  GetAllSiteData,
  IsSetupComplete,
  IsLoggedInSession,
  GetLocaleFromCookie,
  GetUsersCount,
} from "$lib/server/controllers/controller.js";

export const load: LayoutServerLoad = async ({ cookies, request, url }) => {
  const userAgent = request.headers.get("user-agent") ?? "";
  const md = new MobileDetect(userAgent);
  const isMobile = !!md.mobile();

  let isSetupComplete = await IsSetupComplete();

  let isLoggedIn = await IsLoggedInSession(cookies);

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
  const userCounts = await GetUsersCount();

  const languageSetting = siteData.i18n;
  languageSetting.locales = languageSetting.locales.filter((l) => l.selected);

  // const emailSubscriptionTrigger = await GetSubscriptionTriggerByEmail();
  return {
    isMobile,
    isSetupComplete,
    isAdminAccountCreated: userCounts ? Number(userCounts.count) > 0 : false,
    isLoggedIn,
    localTz,
    selectedLang,
    siteStatusColors,
    navItems: siteData.nav || [],
    siteName: siteData.siteName || "Kener",
    siteUrl: siteData.siteURL || "",
    logo: siteData.logo,
    languageSetting,
    // fontFamily: siteData.font?.family || "Inter",
  };
};

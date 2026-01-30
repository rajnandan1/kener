import { redirect } from "@sveltejs/kit";
import MobileDetect from "mobile-detect";
import type { LayoutServerLoad } from "./$types";

import { resolve } from "$app/paths";
import {
  GetAllSiteData,
  IsSetupComplete,
  IsLoggedInSession,
  GetLocaleFromCookie,
  GetAllPages,
} from "$lib/server/controllers/controller.js";

import type { PageNavItem } from "$lib/server/controllers/dashboardController";

export const load: LayoutServerLoad = async ({ cookies, request, url }) => {
  const userAgent = request.headers.get("user-agent") ?? "";
  const md = new MobileDetect(userAgent);
  const isMobile = !!md.mobile();

  let isSetupComplete = await IsSetupComplete();
  if (!isSetupComplete) {
    throw redirect(302, resolve(`/account/signin`));
  }

  let isLoggedIn = await IsLoggedInSession(cookies);

  const siteData = await GetAllSiteData();

  let selectedLang = GetLocaleFromCookie(siteData, cookies);
  const siteStatusColors = siteData.colors;

  const allPagesData = await GetAllPages();
  const allPages: PageNavItem[] = allPagesData.map((p) => ({
    page_title: p.page_title,
    page_path: p.page_path,
  }));

  //is subscription enabled/
  let isSubsEnabled = false;
  let subsSetting = siteData.subscriptionsSettings;
  if (
    subsSetting &&
    subsSetting.enable &&
    (subsSetting.methods.emails.incidents || subsSetting.methods.emails.maintenance)
  ) {
    isSubsEnabled = true;
  }

  const languageSetting = siteData.i18n;
  languageSetting.locales = languageSetting.locales.filter((l) => l.selected);
  return {
    isMobile,
    isSetupComplete,
    isLoggedIn,
    selectedLang,
    siteStatusColors,
    navItems: siteData.nav || [],
    allPages,
    siteName: siteData.siteName || "Kener",
    siteUrl: siteData.siteURL || "",
    logo: siteData.logo,
    favicon: siteData.favicon,
    footerHTML: siteData.footerHTML || "",
    isSubsEnabled,
    languageSetting,
  };
};

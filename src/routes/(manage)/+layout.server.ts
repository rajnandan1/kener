import { redirect } from "@sveltejs/kit";
import MobileDetect from "mobile-detect";
import type { LayoutServerLoad } from "./$types";
import { IsEmailSetup } from "$lib/server/controllers/controller.js";
import GC from "$lib/global-constants";
import serverResolve from "$lib/server/resolver.js";

import { resolve } from "$app/paths";
import {
  GetAllSiteData,
  IsSetupComplete,
  GetLoggedInSession,
  GetLocaleFromCookie,
} from "$lib/server/controllers/controller.js";

export const load: LayoutServerLoad = async ({ cookies }) => {
  let isSetupComplete = await IsSetupComplete();
  if (!isSetupComplete) {
    throw redirect(302, serverResolve(`/account/signin`));
  }

  let loggedInUser = await GetLoggedInSession(cookies);

  //if user not set throw redirect to signin
  if (!loggedInUser) {
    throw redirect(302, serverResolve("/account/signin"));
  }

  const siteData = await GetAllSiteData();

  const siteStatusColors = siteData.colors;
  const siteStatusColorsDark = siteData.colorsDark || siteStatusColors;
  const font = siteData.font || { cssSrc: "", family: "" };
  // const emailSubscriptionTrigger = await GetSubscriptionTriggerByEmail();
  return {
    userDb: loggedInUser,
    siteStatusColors,
    siteStatusColorsDark,
    font,
    canSendEmail: IsEmailSetup(),
  };
};

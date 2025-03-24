// @ts-nocheck

import { GetSiteDataByKey, GetMonitors } from "$lib/server/controllers/controller.js";
import { INVITE_VERIFY_EMAIL } from "$lib/server/constants.js";

export async function load({ parent }) {
  let monitors = await GetMonitors({ status: "ACTIVE" });

  return {
    monitors: monitors,
    siteName: await GetSiteDataByKey("siteName"),
    siteURL: await GetSiteDataByKey("siteURL"),
    i18n: await GetSiteDataByKey("i18n"),
  };
}

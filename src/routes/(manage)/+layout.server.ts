import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { IsEmailSetup } from "$lib/server/controllers/controller.js";
import { RequirePermission } from "$lib/server/controllers/userController.js";
import seedSiteData from "$lib/server/db/seedSiteData.js";
import serverResolve from "$lib/server/resolver.js";
import { ROUTE_PERMISSION_MAP } from "$lib/allPerms.js";
import { error } from "@sveltejs/kit";

import { GetAllSiteData, IsSetupComplete, GetLoggedInSession } from "$lib/server/controllers/controller.js";
import { GetUserPermissions } from "$lib/server/controllers/userController.js";

export const load: LayoutServerLoad = async ({ cookies, route }) => {
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
  const userPermissions = await GetUserPermissions(loggedInUser.id);
  const routeId = route.id || "";

  const requiredPermission = ROUTE_PERMISSION_MAP[routeId];
  if (requiredPermission === undefined) {
    throw error(403, "Forbidden");
  }
  if (requiredPermission !== null) {
    try {
      RequirePermission(userPermissions, requiredPermission);
    } catch {
      throw error(403, "Forbidden");
    }
  }

  const siteStatusColors = siteData.colors;
  const siteStatusColorsDark = siteData.colorsDark || siteStatusColors;
  const font = siteData.font || { cssSrc: "", family: "" };
  return {
    userDb: loggedInUser,
    userPermissions: [...userPermissions],
    siteStatusColors,
    siteStatusColorsDark,
    font,
    canSendEmail: IsEmailSetup(),
    seedSiteData,
  };
};

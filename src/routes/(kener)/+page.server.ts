import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController.js";
import { CheckPageAccess } from "$lib/server/controllers/pagesController.js";
import { GetPageByPath } from "$lib/server/controllers/pagesController.js";
import serverResolve from "$lib/server/resolver.js";

export const load: PageServerLoad = async ({ parent }) => {
  const layoutData = await parent();

  // Check access before loading dashboard data
  const page = await GetPageByPath("");
  if (page) {
    const access = await CheckPageAccess(page.id, layoutData.loggedInUser);
    if (access === "login_required") {
      throw redirect(302, serverResolve("/account/signin"));
    }
    if (access === "denied") {
      throw error(404, "Page Not Found");
    }
  }

  const dashboardData = await GetPageDashboardData("", layoutData);
  if (!dashboardData) {
    throw error(404, "Page Not Found");
  }
  return {
    ...dashboardData,
  };
};

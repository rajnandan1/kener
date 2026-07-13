import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController.js";
import { CheckPageAccess, GetPageByPath } from "$lib/server/controllers/pagesController.js";
import serverResolve from "$lib/server/resolver.js";

export const load: PageServerLoad = async ({ params, parent }) => {
  const layoutData = await parent();

  // Check access before loading dashboard data
  const page = await GetPageByPath(params.page_path);
  if (!page) {
    throw error(404, "Page Not Found");
  }

  const access = await CheckPageAccess(page.id, layoutData.loggedInUser);
  if (access === "login_required") {
    throw redirect(302, serverResolve("/account/signin"));
  }
  if (access === "denied") {
    // Return 404 instead of 403 to not reveal page existence
    throw error(404, "Page Not Found");
  }

  const dashboardData = await GetPageDashboardData(params.page_path, layoutData);
  if (!dashboardData) {
    throw error(404, "Page Not Found");
  }

  return {
    ...dashboardData,
  };
};

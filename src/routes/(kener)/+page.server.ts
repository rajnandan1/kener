import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController.js";
import { GetVisiblePageByPath } from "$lib/server/controllers/pagesController.js";

export const load: PageServerLoad = async ({ parent }) => {
  const layoutData = await parent();
  // The home page can be restricted with access groups too
  if (!(await GetVisiblePageByPath("", layoutData.loggedInUser))) {
    throw error(404, "Page Not Found");
  }
  const dashboardData = await GetPageDashboardData("", layoutData);
  if (!dashboardData) {
    throw error(404, "Page Not Found");
  }
  return {
    ...dashboardData,
  };
};

import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController.js";
import { GetVisiblePageByPath } from "$lib/server/controllers/pagesController.js";

export const load: PageServerLoad = async ({ params, parent }) => {
  const layoutData = await parent();
  // A page the user may not see answers like a missing one, so its existence stays hidden
  if (!(await GetVisiblePageByPath(params.page_path, layoutData.loggedInUser))) {
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

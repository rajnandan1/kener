import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController.js";

export const load: PageServerLoad = async ({ parent, url }) => {
  const parentData = await parent();
  const pagePath = url.pathname.substring(1); // Remove leading slash

  const dashboardData = await GetPageDashboardData(pagePath, parentData.allPages);
  if (!dashboardData) {
    throw error(404, "Page Not Found");
  }

  return {
    ...dashboardData,
  };
};

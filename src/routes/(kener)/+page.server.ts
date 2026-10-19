import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController.js";

export const load: PageServerLoad = async ({ parent }) => {
  const layoutData = await parent();
  const dashboardData = await GetPageDashboardData("", layoutData);
  if (!dashboardData) {
    throw error(404, "Page Not Found");
  }
  return {
    ...dashboardData,
  };
};

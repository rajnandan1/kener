import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController.js";

export const load: PageServerLoad = async ({ url }) => {
  const pagePath = url.pathname.substring(1); // Remove leading slash

  const dashboardData = await GetPageDashboardData(pagePath);
  if (!dashboardData) {
    throw error(404, "Page Not Found");
  }

  return {
    ...dashboardData,
  };
};

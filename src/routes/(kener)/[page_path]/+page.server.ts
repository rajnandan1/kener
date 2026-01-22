import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController.js";

export const load: PageServerLoad = async ({ parent, url }) => {
  const parentData = await parent();
  const pagePath = url.pathname;
  const localTz = parentData.localTz;

  const dashboardData = await GetPageDashboardData(pagePath, localTz);
  if (!dashboardData) {
    throw error(404, "Page Not Found");
  }

  return {
    ...dashboardData,
  };
};

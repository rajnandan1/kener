import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController.js";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ params }) => {
  const dashboardData = await GetPageDashboardData(params.page_path);
  if (!dashboardData) {
    throw error(404, "Page Not Found");
  }

  return {
    ...dashboardData,
  };
};

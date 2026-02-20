import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController.js";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ url }) => {
  const pagePath = url.pathname.substring(1); // Remove leading slash
  const base = !!env.KENER_BASE_PATH ? env.KENER_BASE_PATH.substring(1) : "";
  const normalizedPagePath = base && pagePath.startsWith(base) ? pagePath.substring(base.length) : pagePath;
  const dashboardData = await GetPageDashboardData(normalizedPagePath.substring(1)); // Remove trailing slash if it exists
  if (!dashboardData) {
    throw error(404, "Page Not Found");
  }

  return {
    ...dashboardData,
  };
};

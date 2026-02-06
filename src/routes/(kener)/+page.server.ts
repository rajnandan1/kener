import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController.js";
import { resolve } from "$app/paths";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ url, params }) => {
  const pagePath = url.pathname.replace(/\//g, ""); // Remove all slash if it exists
  const base = !!env.KENER_BASE_PATH ? env.KENER_BASE_PATH.substring(1) : ""; // Remove leading slash from base path if it exists
  const normalizedPagePath = base && pagePath.startsWith(base) ? pagePath.substring(base.length) : pagePath;
  const dashboardData = await GetPageDashboardData(normalizedPagePath);
  if (!dashboardData) {
    throw error(404, "Page Not Found");
  }
  return {
    ...dashboardData,
  };
};

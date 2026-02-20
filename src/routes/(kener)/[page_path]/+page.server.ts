import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { GetPageDashboardData } from "$lib/server/controllers/dashboardController.js";
import { env } from "$env/dynamic/private";

export const load: PageServerLoad = async ({ url }) => {
  const pagePath = url.pathname.substring(1); // Remove leading slash
  const base = !!env.KENER_BASE_PATH ? env.KENER_BASE_PATH.substring(1) : "";
  const normalizedPagePath = base && pagePath.startsWith(base) ? pagePath.substring(base.length) : pagePath;
  console.log(">>>>>>----  +page.server:10 ", { pagePath, base, normalizedPagePath });
  const dashboardData = await GetPageDashboardData(normalizedPagePath);
  if (!dashboardData) {
    throw error(404, "Page Not Found");
  }

  return {
    ...dashboardData,
  };
};

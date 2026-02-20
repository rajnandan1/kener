import { json } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import { GetAllPages } from "$lib/server/controllers/pagesController";
import type { PageNavItem } from "$lib/server/controllers/dashboardController";

/**
 * GET /dashboard-apis/pages
 * Returns all pages as PageNavItem[] (page_title, page_path)
 */
export default async function get(_req: APIServerRequest): Promise<Response> {
  const allPagesData = await GetAllPages();
  const pages: PageNavItem[] = allPagesData.map((p) => ({
    page_title: p.page_title,
    page_path: p.page_path,
  }));
  return json(pages);
}

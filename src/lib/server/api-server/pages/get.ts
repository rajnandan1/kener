import { json } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import { GetAllPages } from "$lib/server/controllers/pagesController";
import { GetSiteDataByKey } from "$lib/server/controllers/siteDataController";
import type { PageNavItem } from "$lib/server/controllers/dashboardController";
import type { PageOrderingSettings } from "$lib/types/site";

/**
 * GET /dashboard-apis/pages
 * Returns all pages as PageNavItem[] (page_title, page_path)
 * Respects pageOrderingSettings if enabled
 */
export default async function get(_req: APIServerRequest): Promise<Response> {
  const allPagesData = await GetAllPages();
  const pageOrderingSettings = (await GetSiteDataByKey("pageOrderingSettings")) as PageOrderingSettings | null;

  let orderedPages = allPagesData;

  if (pageOrderingSettings?.enabled && pageOrderingSettings.order?.length > 0) {
    const orderMap = new Map(pageOrderingSettings.order.map((id, idx) => [id, idx]));
    orderedPages = [...allPagesData].sort((a, b) => {
      const aIdx = orderMap.get(a.id);
      const bIdx = orderMap.get(b.id);
      // Pages in the order list come first, sorted by their position
      if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
      if (aIdx !== undefined) return -1;
      if (bIdx !== undefined) return 1;
      // Pages not in the order list keep their default order (by id)
      return a.id - b.id;
    });
  }

  const pages: PageNavItem[] = orderedPages.map((p) => ({
    page_title: p.page_title,
    page_path: p.page_path,
  }));
  return json(pages);
}

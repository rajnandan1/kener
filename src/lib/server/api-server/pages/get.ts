import { json } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import { GetAllPages } from "$lib/server/controllers/pagesController";
import { GetSiteDataByKey } from "$lib/server/controllers/siteDataController";
import { GetLoggedInSession } from "$lib/server/controllers/userController";
import type { PageNavItem } from "$lib/server/controllers/dashboardController";
import type { PageOrderingSettings } from "$lib/types/site";

/**
 * GET /dashboard-apis/pages
 * Returns all pages as PageNavItem[] (page_title, page_path)
 * Respects pageOrderingSettings if enabled.
 * Pages with page_is_internal are only shown to logged-in users.
 */
export default async function get(req: APIServerRequest): Promise<Response> {
  const allPagesData = await GetAllPages();
  const pageOrderingSettings = (await GetSiteDataByKey("pageOrderingSettings")) as PageOrderingSettings | null;
  const loggedInUser = await GetLoggedInSession(req.cookies);

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

  const pages: PageNavItem[] = orderedPages
    .filter((p) => !p.page_is_internal || !!loggedInUser)
    .map((p) => ({
      page_title: p.page_title,
      page_path: p.page_path,
      page_header: p.page_header,
      page_logo: p.page_logo,
    }));
  return json(pages);
}

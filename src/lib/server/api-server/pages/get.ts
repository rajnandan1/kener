import { json } from "@sveltejs/kit";
import type { APIServerRequest } from "$lib/server/types/api-server";
import { GetAccessiblePages } from "$lib/server/controllers/pagesController";
import { GetSiteDataByKey } from "$lib/server/controllers/siteDataController";
import { GetLoggedInSession } from "$lib/server/controllers/controller";
import type { PageNavItem } from "$lib/server/controllers/dashboardController";
import type { PageOrderingSettings } from "$lib/types/site";

/**
 * GET /dashboard-apis/pages
 * Returns pages the current user is allowed to see, respecting
 * access groups and page ordering settings.
 */
export default async function get(req: APIServerRequest): Promise<Response> {
  // Get the logged-in user from the session cookie (null if anonymous)
  const user = req.cookies ? await GetLoggedInSession(req.cookies) : null;

  // Get only pages the user can access
  const accessiblePages = await GetAccessiblePages(user);
  const pageOrderingSettings = (await GetSiteDataByKey("pageOrderingSettings")) as PageOrderingSettings | null;

  let orderedPages = accessiblePages;

  if (pageOrderingSettings?.enabled && pageOrderingSettings.order?.length > 0) {
    const orderMap = new Map(pageOrderingSettings.order.map((id, idx) => [id, idx]));
    orderedPages = [...accessiblePages].sort((a, b) => {
      const aIdx = orderMap.get(a.id);
      const bIdx = orderMap.get(b.id);
      if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
      if (aIdx !== undefined) return -1;
      if (bIdx !== undefined) return 1;
      return a.id - b.id;
    });
  }

  const pages: PageNavItem[] = orderedPages.map((p) => ({
    page_title: p.page_title,
    page_path: p.page_path,
    page_header: p.page_header,
    page_logo: p.page_logo,
  }));
  return json(pages);
}

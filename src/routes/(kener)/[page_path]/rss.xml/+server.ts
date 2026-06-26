import type { RequestHandler } from "./$types";
import { renderRssFeedResponse } from "$lib/server/rss.js";

export const GET: RequestHandler = ({ params }) =>
  renderRssFeedResponse({
    scope: { type: "page", pagePath: params.page_path },
    feedPath: `/${params.page_path}/rss.xml`,
  });

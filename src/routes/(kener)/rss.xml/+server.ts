import type { RequestHandler } from "./$types";
import { renderRssFeedResponse } from "$lib/server/rss.js";

export const GET: RequestHandler = () => renderRssFeedResponse({ pagePath: null, feedPath: "/rss.xml" });

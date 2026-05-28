import type { RequestHandler } from "./$types";
import { renderRssFeedResponse } from "$lib/server/rss.js";

export const GET: RequestHandler = () =>
  renderRssFeedResponse({ scope: { type: "page", pagePath: null }, feedPath: "/rss.xml" });

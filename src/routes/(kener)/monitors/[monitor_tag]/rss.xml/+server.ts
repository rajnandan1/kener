import type { RequestHandler } from "./$types";
import { renderRssFeedResponse } from "$lib/server/rss.js";

export const GET: RequestHandler = ({ params }) =>
  renderRssFeedResponse({
    scope: { type: "monitor", tag: params.monitor_tag },
    feedPath: `/monitors/${params.monitor_tag}/rss.xml`,
  });

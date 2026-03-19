import { GetSiteDataByKey } from "$lib/server/controllers/siteDataController.js";
import { GetAllPages } from "$lib/server/controllers/pagesController.js";
import { GetMonitors } from "$lib/server/controllers/monitorsController.js";
import serverResolver from "$lib/server/resolver.js";
import type { SitemapXMLConfig } from "$lib/types/site.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  const sitemap = (await GetSiteDataByKey("sitemap")) as SitemapXMLConfig | null;
  const mode = sitemap?.mode ?? "auto";

  if (mode === "off") {
    return new Response("Not found", { status: 404 });
  }

  if (mode === "manual") {
    const urls = sitemap?.urls ?? [];
    const urlEntries = urls
      .filter((u) => u.loc.trim().length > 0)
      .map((u) => `  <url>\n    <loc>${escapeXml(u.loc.trim())}</loc>\n  </url>`)
      .join("\n");

    return sitemapResponse(urlEntries);
  }

  // auto mode
  const siteURL = (await GetSiteDataByKey("siteURL")) as string | null;
  if (!siteURL) {
    return new Response("Not found", { status: 404 });
  }

  const locs: string[] = [];

  // Add pages
  const pages = await GetAllPages();
  for (const page of pages) {
    const path = page.page_path ? `/${page.page_path}` : "/";
    locs.push(siteURL + serverResolver(path));
  }

  // Add active, visible monitors
  const monitors = await GetMonitors({ status: "ACTIVE", is_hidden: "NO" });
  for (const monitor of monitors) {
    locs.push(siteURL + serverResolver(`/monitors/${monitor.tag}`));
  }

  // Add current and previous month events pages
  const now = new Date();
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const currentMonth = `${months[now.getUTCMonth()]}-${now.getUTCFullYear()}`;
  const prevDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const previousMonth = `${months[prevDate.getUTCMonth()]}-${prevDate.getUTCFullYear()}`;
  locs.push(siteURL + serverResolver(`/events/${currentMonth}`));
  locs.push(siteURL + serverResolver(`/events/${previousMonth}`));

  // Add any manual URLs configured alongside auto
  const manualUrls = sitemap?.urls ?? [];
  for (const u of manualUrls) {
    if (u.loc.trim().length > 0) {
      locs.push(u.loc.trim());
    }
  }

  const urlEntries = locs.map((loc) => `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`).join("\n");

  return sitemapResponse(urlEntries);
};

function sitemapResponse(urlEntries: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

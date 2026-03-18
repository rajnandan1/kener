import type { RequestHandler } from "@sveltejs/kit";
import { getDocsRootConfig, getVersionDocsUrls } from "../(docs)/docs/docs-utils.server";

const BASE_DOMAIN = "https://kener.ing";

export const GET: RequestHandler = () => {
  const rootConfig = getDocsRootConfig();
  const latestVersion = rootConfig.versions.find((v) => v.latest) ?? rootConfig.versions[0];

  const urls: { loc: string; priority: string; changefreq: string }[] = [
    { loc: `${BASE_DOMAIN}/docs`, priority: "1.0", changefreq: "weekly" },
  ];

  if (latestVersion) {
    const docsUrls = getVersionDocsUrls(latestVersion.slug, BASE_DOMAIN);
    for (const url of docsUrls) {
      // Skip raw markdown URLs and external URLs
      if (url.includes("/docs/raw/") || !url.startsWith(BASE_DOMAIN)) continue;
      urls.push({ loc: url, priority: "0.8", changefreq: "weekly" });
    }

    // Add llms.txt for AI discoverability
    urls.push({
      loc: `${BASE_DOMAIN}/docs/${latestVersion.slug}/llms.txt`,
      priority: "0.5",
      changefreq: "weekly",
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

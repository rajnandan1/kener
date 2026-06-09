/**
 * RSS 2.0 feed for Kener status pages.
 *
 * Two layers live in this file:
 *   1. buildRssFeed — pure XML formatter (no I/O).
 *   2. renderRssFeedResponse — fetches recent incidents + maintenances for a
 *      page, shapes them into items, and returns an HTTP Response. Shared by
 *      both the default-page and named-page route handlers.
 */

import db from "$lib/server/db/db.js";
import { GetAllSiteData } from "$lib/server/controllers/siteDataController.js";
import type { IncidentForMonitorListWithComments, MaintenanceEventsMonitorList } from "$lib/server/types/db.js";

export type RssFeedItemType = "incident" | "maintenance";

export interface RssFeedItem {
  type: RssFeedItemType;
  id: number;
  title: string;
  link: string;
  pubDate: number;
  description: string;
}

export interface BuildRssFeedArgs {
  siteName: string;
  siteURL: string;
  basePath: string;
  feedPath: string;
  items: RssFeedItem[];
}

const TYPE_TITLE_PREFIX: Record<RssFeedItemType, string> = {
  incident: "[Incident]",
  maintenance: "[Maintenance]",
};

export function buildRssFeed(args: BuildRssFeedArgs): string {
  const channelLink = joinUrl(args.siteURL, args.basePath);
  const selfLink = joinUrl(args.siteURL, args.basePath, args.feedPath);
  const channelTitle = `${args.siteName} — Incidents & Maintenance`;
  const channelDescription = `Latest incidents and scheduled maintenance for ${args.siteName}`;

  const lastBuildSeconds = args.items.length > 0 ? Math.max(...args.items.map((i) => i.pubDate)) : nowSeconds();

  const itemsXml = args.items.map(renderItem).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>en</language>
    <lastBuildDate>${formatRfc822(lastBuildSeconds)}</lastBuildDate>
    <atom:link href="${escapeXml(selfLink)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`;
}

function renderItem(item: RssFeedItem): string {
  const prefixedTitle = `${TYPE_TITLE_PREFIX[item.type]} ${item.title}`;
  const guid = `${item.type}-${item.id}`;
  return `    <item>
      <title>${escapeXml(prefixedTitle)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <pubDate>${formatRfc822(item.pubDate)}</pubDate>
      <description>${cdata(item.description)}</description>
    </item>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value: string): string {
  // Split any literal ]]> sequence so the CDATA section terminates only at ours.
  const safe = value.replace(/]]>/g, "]]]]><![CDATA[>");
  return `<![CDATA[${safe}]]>`;
}

function formatRfc822(seconds: number): string {
  // Date#toUTCString returns RFC-1123 form, which RSS 2.0 readers accept as RFC-822.
  return new Date(seconds * 1000).toUTCString();
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function joinUrl(...parts: string[]): string {
  const [origin, ...rest] = parts;
  const trimmedOrigin = origin.replace(/\/+$/, "");
  const path = rest
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => "/" + p.replace(/^\/+/, "").replace(/\/+$/, ""))
    .join("");
  return trimmedOrigin + path;
}

// Window for items pulled into the feed. Bounded by both: last 90 days AND
// the most recent 50 entries after merging. Matches typical reader expectations
// without scanning the entire incident history.
const FEED_WINDOW_DAYS = 90;
const FEED_MAX_ITEMS = 50;

// Scope determines which monitors the feed covers.
//   - page: scoped to a status page's monitor list (honors hidden-monitor
//     stripping and globalPageVisibilitySettings.forceExclusivity when pagePath is null)
//   - monitor: scoped to a single monitor by tag (404 if hidden, inactive, or unknown)
export type RenderRssFeedScope = { type: "page"; pagePath: string | null } | { type: "monitor"; tag: string };

export interface RenderRssFeedArgs {
  scope: RenderRssFeedScope;
  // Path of THIS feed under basePath, e.g. "/rss.xml" or "/monitors/foo/rss.xml".
  feedPath: string;
}

export async function renderRssFeedResponse(args: RenderRssFeedArgs): Promise<Response> {
  const siteData = await GetAllSiteData();
  const siteURL = siteData.siteURL;
  if (!siteURL) {
    return new Response("Not found", { status: 404 });
  }
  const siteName = siteData.siteName || "Status";
  const basePath = process.env.KENER_BASE_PATH || "";

  let monitorTags: string[] | undefined = undefined;
  if (args.scope.type === "monitor") {
    const monitor = await db.getMonitorByTag(args.scope.tag);
    if (!monitor || monitor.is_hidden === "YES" || monitor.status !== "ACTIVE") {
      return new Response("Not found", { status: 404 });
    }
    monitorTags = [args.scope.tag];
  } else {
    let pagePath = args.scope.pagePath;
    if (!!siteData.globalPageVisibilitySettings?.forceExclusivity && pagePath === null) {
      pagePath = "";
    }
    if (pagePath !== null) {
      const page = await db.getPageByPath(pagePath);
      if (!page) {
        return new Response("Not found", { status: 404 });
      }
      const pageMonitors = await db.getPageMonitorsExcludeHidden(page.id);
      monitorTags = pageMonitors.map((m) => m.monitor_tag);
    }
  }

  const nowTs = nowSeconds();
  const startTs = nowTs - FEED_WINDOW_DAYS * 24 * 60 * 60;
  // Maintenances need a future end too: a SCHEDULED maintenance has its
  // start_date_time in the future, and we want subscribers to learn about
  // upcoming windows. Incidents are always past, so they keep nowTs as end.
  const futureTs = nowTs + FEED_WINDOW_DAYS * 24 * 60 * 60;
  const [incidents, maintenances] = await Promise.all([
    db.getIncidentsForEventsByDateRange(startTs, nowTs, monitorTags),
    db.getMaintenanceEventsForEventsByDateRange(startTs, futureTs, monitorTags),
  ]);

  const items: RssFeedItem[] = [];
  for (const incident of incidents) {
    items.push({
      type: "incident",
      id: incident.id,
      title: incident.title,
      link: joinUrl(siteURL, basePath, `/incidents/${incident.id}`),
      pubDate: incident.comments[0]?.commented_at ?? incident.start_date_time,
      description: buildIncidentDescription(incident),
    });
  }
  for (const maintenance of maintenances) {
    // Drop events whose affected monitors were all hidden: the DB layer strips
    // hidden monitors from the row; a now-empty monitors[] means the public
    // shouldn't see this on the events page either.
    if (maintenance.monitors.length === 0) continue;
    items.push({
      type: "maintenance",
      id: maintenance.id,
      title: maintenance.title,
      link: joinUrl(siteURL, basePath, `/maintenances/${maintenance.id}`),
      pubDate: maintenance.start_date_time,
      description: buildMaintenanceDescription(maintenance),
    });
  }

  items.sort((a, b) => b.pubDate - a.pubDate);
  const capped = items.slice(0, FEED_MAX_ITEMS);

  const xml = buildRssFeed({ siteName, siteURL, basePath, feedPath: args.feedPath, items: capped });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

function buildIncidentDescription(incident: IncidentForMonitorListWithComments): string {
  const lines: string[] = [];
  lines.push(`Status: ${incident.state}`);
  if (incident.monitors.length > 0) {
    const names = incident.monitors.map((m) => m.monitor_name).join(", ");
    lines.push(`Affected: ${names}`);
  }
  const latest = incident.comments[0];
  if (latest) {
    lines.push("");
    lines.push(latest.comment);
  }
  return lines.join("\n");
}

function buildMaintenanceDescription(maintenance: MaintenanceEventsMonitorList): string {
  const lines: string[] = [];
  lines.push(`Status: ${maintenance.status}`);
  const start = formatRfc822(maintenance.start_date_time);
  const end = maintenance.end_date_time != null ? formatRfc822(maintenance.end_date_time) : "open-ended";
  lines.push(`Scheduled: ${start} → ${end}`);
  if (maintenance.monitors.length > 0) {
    const names = maintenance.monitors.map((m) => m.monitor_name).join(", ");
    lines.push(`Affected: ${names}`);
  }
  if (maintenance.description) {
    lines.push("");
    lines.push(maintenance.description);
  }
  return lines.join("\n");
}

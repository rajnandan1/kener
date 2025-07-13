// src/routes/(kener)/+page.server.js
// @ts-nocheck
import { SortMonitor } from "$lib/clientTools.js";
import { GetIncidentsOpenHome, GetMonitors, SystemDataMessage } from "$lib/server/controllers/controller.js";
import { FetchData } from "$lib/server/page";
import { error } from "@sveltejs/kit";
import moment from "moment";

/** utility to strip HTML tags out of a string */
function removeTags(str) {
  if (str === null || str === "") return false;
  return str.toString().replace(/(<([^>]+)>)/gi, "");
}

/**
 * Determines pageType + which monitors to load.
 */
async function returnTypeOfMonitorsPageMeta(url) {
  const query = url.searchParams;
  let filter = { status: "ACTIVE" };
  let pageType = "home";
  let group = null;

  // Category page
  if (query.get("category") && query.get("category") !== "Home") {
    filter.category_name = query.get("category");
    pageType = "category";
  }

  // Single-monitor page
  if (query.get("monitor")) {
    filter.tag = query.get("monitor");
    pageType = "monitor";
  }

  // Group-detail page
  if (query.get("group")) {
    const g = await GetMonitors({ status: "ACTIVE", tag: query.get("group") });
    if (g.length > 0) {
      group = g[0];
      const typeData = JSON.parse(group.type_data);
      filter.tags = typeData.monitors.map((m) => m.tag);
      pageType = "group";
    }
  }

  const monitors = await GetMonitors(filter);
  return { monitors, pageType, group };
}

export async function load({ parent, url }) {
  // 0) Get parent data including login state
  const parentData = await parent();
  const { site: siteData, isLoggedIn } = parentData;

  // 1) Subscribable monitors for sidebar
  let subscribableMonitors = await GetMonitors({ status: "ACTIVE" });
  subscribableMonitors = subscribableMonitors.map((m) => ({
    tag: m.tag,
    name: m.name,
    image: m.image,
  }));

  // 2) Determine monitors + context
  const { monitors: rawMonitors, pageType, group } = await returnTypeOfMonitorsPageMeta(url);

  // 3) Guard: group-detail 404 when logged-out
  if (!isLoggedIn && pageType === "group") {
    // a) Group detail disabled?
    if (!group.enable_details_to_be_examined) {
      throw error(404, "Group detail view disabled");
    }
    // b) No visible children?
    const typeData = JSON.parse(group.type_data);
    const childTags = typeData.monitors.map((c) => c.tag);
    const children = await GetMonitors({ status: "ACTIVE", tags: childTags });
    const visibleCount = children.filter((c) => c.enable_individual_view_if_grouped).length;
    if (visibleCount === 0) {
      throw error(404, "No monitors available for detail view");
    }
  }

  // 4) Guard: direct-monitor page 404 when logged-out & individual-hidden
  if (!isLoggedIn && pageType === "monitor") {
    const requestedTag = url.searchParams.get("monitor");
    const m = rawMonitors.find((x) => x.tag === requestedTag);
    if (m && !m.enable_individual_view_if_grouped) {
      throw error(404, "Monitor detail view disabled when logged-out");
    }
  }

  // 5) Hide grouped-home monitors
  let hiddenGroupedMonitorsTags = [];
  if (pageType === "home") {
    for (const m of rawMonitors) {
      if (m.monitor_type === "GROUP") {
        const td = JSON.parse(m.type_data);
        if (td.hideMonitors) {
          hiddenGroupedMonitorsTags.push(...td.monitors.map((c) => c.tag));
        }
      }
    }
  }

  // 6) Enrich each monitor with has_visible_members (for groups)
  const enriched = [];
  for (const m of rawMonitors) {
    let has_visible_members = undefined;
    if (m.monitor_type === "GROUP") {
      const td = JSON.parse(m.type_data);
      const childTags = td.monitors.map((c) => c.tag);
      const children = await GetMonitors({ status: "ACTIVE", tags: childTags });
      const visibleCount = children.filter((c) => c.enable_individual_view_if_grouped).length;
      has_visible_members = visibleCount > 0;
    }
    enriched.push({
      tag: m.tag,
      name: m.name,
      description: m.description,
      monitor_type: m.monitor_type,
      image: m.image,
      category_name: m.category_name,
      day_degraded_minimum_count: m.day_degraded_minimum_count,
      day_down_minimum_count: m.day_down_minimum_count,
      id: m.id,
      include_degraded_in_downtime: m.include_degraded_in_downtime,
      enable_details_to_be_examined: m.enable_details_to_be_examined,
      enable_individual_view_if_grouped: m.enable_individual_view_if_grouped,
      has_visible_members,
    });
  }

  // 7) Filter out hidden-home monitors and, for group pages when logged-out,
  //    filter out individual-hidden children
  let monitors = enriched
    .filter((m) => !hiddenGroupedMonitorsTags.includes(m.tag))
    .filter((m) => {
      if (pageType === "home") {
        return m.category_name === "Home";
      }
      if (!isLoggedIn && pageType === "group") {
        // on group page, remove children with individual view disabled
        return m.enable_individual_view_if_grouped;
      }
      return true;
    });

  // 8) Prepare page metadata
  let hero = siteData.hero;
  let pageTitle = siteData.title;
  let canonical = siteData.siteURL;
  let pageDescription = "";
  const descTag = siteData.metaTags.find((t) => t.key === "description");
  if (descTag) pageDescription = descTag.value;

  // 9) Sort and fetch live data
  monitors = SortMonitor(siteData.monitorSort, monitors);
  const monitorsActive = [];
  for (const m of monitors) {
    const data = await FetchData(
      siteData,
      m,
      parentData.localTz,
      parentData.selectedLang,
      parentData.lang,
      parentData.isMobile,
    );
    m.pageData = data;
    m.activeIncidents = [];
    monitorsActive.push(m);
  }

  // 10) Fetch open incidents
  const startWithin = moment().subtract(siteData.homeIncidentStartTimeWithin, "days").unix();
  const endWithin = moment().add(siteData.homeIncidentStartTimeWithin, "days").unix();
  let allOpenIncidents = await GetIncidentsOpenHome(siteData.homeIncidentCount, startWithin, endWithin);

  // 11) Page-type flags
  const isCategoryPage = pageType === "category";
  const isMonitorPage = pageType === "monitor";
  const isGroupPage = pageType === "group";

  // 12) Single-monitor page meta
  if (isMonitorPage && monitorsActive.length > 0) {
    const m = monitorsActive[0];
    pageTitle = `${m.name} - ${pageTitle}`;
    pageDescription = m.description;
    canonical = `${canonical}?monitor=${m.tag}`;
    hero = { title: m.name, subtitle: m.description, image: m.image };
  }

  // 13) Group page meta
  if (isGroupPage) {
    pageTitle = `${group.name} - ${pageTitle}`;
    pageDescription = group.description;
    canonical = `${canonical}?group=${group.tag}`;
    hero = { title: group.name, subtitle: group.description, image: group.image };
  }

  // 14) Category page meta
  if (isCategoryPage) {
    const selCat = siteData.categories.find((c) => c.name === url.searchParams.get("category"));
    if (!selCat || (selCat.isHidden && !isLoggedIn)) {
      throw error(404, "Category not found");
    }
    pageTitle = `${selCat.name} - ${pageTitle}`;
    pageDescription = selCat.description;
    canonical = `${canonical}?category=${selCat.name}`;
    hero = { title: selCat.name, subtitle: selCat.description, image: selCat.image };
  }

  // 15) Filter incidents to only those matching monitorsActive
  if (isCategoryPage || isMonitorPage || isGroupPage) {
    const tags = monitorsActive.map((m) => m.tag);
    allOpenIncidents = allOpenIncidents.filter((inc) => inc.monitors.some((mon) => tags.includes(mon.monitor_tag)));
  }

  // 16) Finalize incident monitors shape
  allOpenIncidents = allOpenIncidents.map((inc) => {
    const tags = inc.monitors.map((c) => c.monitor_tag);
    inc.monitors = monitors
      .filter((m) => tags.includes(m.tag))
      .map((m) => ({
        tag: m.tag,
        name: m.name,
        description: m.description,
        image: m.image,
        impact_type: inc.monitors.find((c) => c.monitor_tag === m.tag).monitor_impact,
      }));
    return inc;
  });

  // 17) Separate recent incidents/maintenances
  const allRecentIncidents = allOpenIncidents.filter((i) => i.incident_type === "INCIDENT");
  const allRecentMaintenances = allOpenIncidents.filter((i) => i.incident_type === "MAINTENANCE");

  // 18) Optional site-wide summary
  let systemDataMessage = null;
  if (siteData.showSiteStatus === "YES") {
    systemDataMessage = await SystemDataMessage();
  }

  // 19) Return to page
  return {
    monitors: monitorsActive,
    subscribableMonitors,
    allRecentIncidents,
    allRecentMaintenances,
    pageType,
    pageTitle,
    pageDescription: removeTags(pageDescription),
    hero,
    categoryName: url.searchParams.get("category"),
    canonical,
    systemDataMessage,
  };
}

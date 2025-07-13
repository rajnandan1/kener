// @ts-nocheck
import { SortMonitor } from "$lib/clientTools.js";
import { GetIncidentsOpenHome, GetMonitors, SystemDataMessage } from "$lib/server/controllers/controller.js";
import { FetchData } from "$lib/server/page";
import { error } from "@sveltejs/kit";
import moment from "moment";

function removeTags(str) {
  if (str === null || str === "") return false;
  else str = str.toString();
  return str.replace(/(<([^>]+)>)/gi, "");
}

async function returnTypeOfMonitorsPageMeta(url) {
  const query = url.searchParams;
  let filter = { status: "ACTIVE" };
  let pageType = "home";
  let group = null;

  if (query.get("category") && query.get("category") !== "Home") {
    filter.category_name = query.get("category");
    pageType = "category";
  }
  if (query.get("monitor")) {
    filter.tag = query.get("monitor");
    pageType = "monitor";
  }
  if (query.get("group")) {
    const g = await GetMonitors({ status: "ACTIVE", tag: query.get("group") });
    if (g.length) {
      group = g[0];
      const typeData = JSON.parse(group.type_data);
      let groupPresentMonitorTags = typeData.monitors.map((monitor) => monitor.tag);
      filter.tags = groupPresentMonitorTags;
      pageType = "group";
    }
  }

  const monitors = await GetMonitors(filter);
  return { monitors, pageType, group };
}

export async function load({ parent, url }) {
  const parentData = await parent();
  const { site: siteData, isLoggedIn } = parentData;

  let subscribableMonitors = await GetMonitors({ status: "ACTIVE" });
  subscribableMonitors = subscribableMonitors.map((monitor) => {
    return {
      tag: monitor.tag,
      name: monitor.name,
      image: monitor.image,
    };
  });
  const query = url.searchParams;

  const { monitors: rawMonitors, pageType, group } = await returnTypeOfMonitorsPageMeta(url);

  if (!isLoggedIn && pageType === "group") {
    if (!group.enable_details_to_be_examined) {
      throw error(404, "Group detail view disabled");
    }
    // also guard no‐children, but that’s done below
  }

  if (!isLoggedIn && pageType === "monitor") {
    const requested = query.get("monitor");
    // find any group that includes this monitor
    const allGroups = await GetMonitors({ status: "ACTIVE", monitor_type: "GROUP" });
    for (const g of allGroups) {
      const typeData = JSON.parse(g.type_data);
      if (typeData.monitors.some((c) => c.tag === requested) && !g.enable_details_to_be_examined) {
        throw error(401, "Unauthorized; log in to view");
      }
    }
    // existing individual‐hidden guard can remain or be removed if redundant
    const monitor = rawMonitors.find((x) => x.tag === requested);
    if (monitor && !monitor.enable_individual_view_if_grouped) {
      throw error(401, "Unauthorized; log in to view");
    }
  }

  let hiddenGroupedMonitorsTags = [];
  if (pageType === "home") {
    for (const monitor of rawMonitors) {
      if (monitor.monitor_type === "GROUP") {
        const typeData = JSON.parse(monitor.type_data);
        if (typeData.hideMonitors) {
          hiddenGroupedMonitorsTags.push(...typeData.monitors.map((c) => c.tag));
        }
      }
    }
  }

  const enriched = [];
  for (const monitor of rawMonitors) {
    let has_visible_members;
    if (monitor.monitor_type === "GROUP") {
      const typeData = JSON.parse(monitor.type_data);
      const childTags = typeData.monitors.map((c) => c.tag);
      const children = await GetMonitors({ status: "ACTIVE", tags: childTags });
      const visibleCount = children.filter((c) => c.enable_individual_view_if_grouped).length;
      has_visible_members = visibleCount > 0;

      // Group‐detail no‐children => 404
      if (!isLoggedIn && pageType === "group" && visibleCount === 0) {
        throw error(404, "No monitors available for detail view");
      }
    }
    enriched.push({
      tag: monitor.tag,
      name: monitor.name,
      description: monitor.description,
      monitor_type: monitor.monitor_type,
      image: monitor.image,
      category_name: monitor.category_name,
      day_degraded_minimum_count: monitor.day_degraded_minimum_count,
      day_down_minimum_count: monitor.day_down_minimum_count,
      id: monitor.id,
      include_degraded_in_downtime: monitor.include_degraded_in_downtime,
      enable_details_to_be_examined: monitor.enable_details_to_be_examined,
      enable_individual_view_if_grouped: monitor.enable_individual_view_if_grouped,
      has_visible_members,
      hidden_publicly: pageType === "group" && !monitor.enable_individual_view_if_grouped,
    });
  }

  let monitors = enriched
    .filter((monitor) => !hiddenGroupedMonitorsTags.includes(monitor.tag))
    .filter((monitor) => {
      if (pageType === "home") return monitor.category_name === "Home";
      if (!isLoggedIn && pageType === "group") {
        return monitor.enable_individual_view_if_grouped;
      }
      return true;
    });

  let hero = siteData.hero;
  let pageTitle = siteData.title;
  let canonical = siteData.siteURL;
  let pageDescription = "";
  const descTag = siteData.metaTags.find((t) => t.key === "description");
  if (descTag) pageDescription = descTag.value;

  monitors = SortMonitor(siteData.monitorSort, monitors);
  const monitorsActive = [];
  for (const monitor of monitors) {
    const data = await FetchData(
      siteData,
      monitor,
      parentData.localTz,
      parentData.selectedLang,
      parentData.lang,
      parentData.isMobile,
    );
    monitor.pageData = data;
    monitor.activeIncidents = [];
    monitorsActive.push(monitor);
  }

  const startWithin = moment().subtract(siteData.homeIncidentStartTimeWithin, "days").unix();
  const endWithin = moment().add(siteData.homeIncidentStartTimeWithin, "days").unix();
  let allOpenIncidents = await GetIncidentsOpenHome(siteData.homeIncidentCount, startWithin, endWithin);

  const isCategoryPage = pageType === "category";
  const isMonitorPage = pageType === "monitor";
  const isGroupPage = pageType === "group";

  if (isMonitorPage && monitorsActive.length > 0) {
    const monitor = monitorsActive[0];
    pageTitle = `${monitor.name} - ${pageTitle}`;
    pageDescription = monitor.description;
    canonical = `${canonical}?monitor=${monitor.tag}`;
    hero = { title: monitor.name, subtitle: monitor.description, image: monitor.image };
  }

  if (isGroupPage) {
    pageTitle = `${group.name} - ${pageTitle}`;
    pageDescription = group.description;
    canonical = `${canonical}?group=${group.tag}`;
    hero = { title: group.name, subtitle: group.description, image: group.image };
  }

  if (isCategoryPage) {
    const selCat = siteData.categories.find((c) => c.name === query.get("category"));
    if (!selCat || (selCat.isHidden && !isLoggedIn)) {
      throw error(404, "Category not found");
    }
    pageTitle = `${selCat.name} - ${pageTitle}`;
    pageDescription = selCat.description;
    canonical = `${canonical}?category=${selCat.name}`;
    hero = { title: selCat.name, subtitle: selCat.description, image: selCat.image };
  }

  if (isCategoryPage || isMonitorPage || isGroupPage) {
    const tags = monitorsActive.map((monitor) => monitor.tag);
    allOpenIncidents = allOpenIncidents.filter((incident) =>
      incident.monitors.some((mon) => tags.includes(mon.monitor_tag)),
    );
  }

  allOpenIncidents = allOpenIncidents.map((incident) => {
    const tags = incident.monitors.map((c) => c.monitor_tag);
    incident.monitors = monitors
      .filter((monitor) => tags.includes(monitor.tag))
      .map((monitor) => ({
        tag: monitor.tag,
        name: monitor.name,
        description: monitor.description,
        image: monitor.image,
        impact_type: incident.monitors.find((c) => c.monitor_tag === monitor.tag).monitor_impact,
      }));
    return inc;
  });

  const allRecentIncidents = allOpenIncidents.filter((incident) => incident.incident_type === "INCIDENT");
  const allRecentMaintenances = allOpenIncidents.filter((incident) => incident.incident_type === "MAINTENANCE");

  let systemDataMessage = null;
  if (siteData.showSiteStatus === "YES") {
    systemDataMessage = await SystemDataMessage();
  }

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

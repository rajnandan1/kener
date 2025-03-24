// @ts-nocheck
import { FetchData } from "$lib/server/page";
import { GetMonitors, GetIncidentsOpenHome } from "$lib/server/controllers/controller.js";
import { SortMonitor } from "$lib/clientTools.js";
import moment from "moment";

function removeTags(str) {
  if (str === null || str === "") return false;
  else str = str.toString();

  return str.replace(/(<([^>]+)>)/gi, "");
}

async function returnTypeOfMonitorsPageMeta(url) {
  const query = url.searchParams;
  let filter = {
    status: "ACTIVE",
  };

  let pageType = "home";
  let group;
  if (!!query.get("category") && query.get("category") !== "Home") {
    filter.category_name = query.get("category");
    pageType = "category";
  }

  if (!!query.get("monitor")) {
    filter.tag = query.get("monitor");
    pageType = "monitor";
  }

  if (!!query.get("group")) {
    const groupStart = performance.now();
    let g = await GetMonitors({ status: "ACTIVE", tag: query.get("group") });

    if (g.length > 0) {
      group = g[0];
      let typeData = JSON.parse(g[0].type_data);
      let groupPresentMonitorTags = typeData.monitors.map((monitor) => monitor.tag);
      filter.tags = groupPresentMonitorTags;
      pageType = "group";
    }
  }

  const monitorStart = performance.now();
  let monitors = await GetMonitors(filter);
  return { monitors, pageType, group };
}

export async function load({ parent, url }) {
  const totalLoadStart = performance.now();

  const query = url.searchParams;

  const metaStart = performance.now();
  let { monitors, pageType, group } = await returnTypeOfMonitorsPageMeta(url);

  const processStart = performance.now();
  let hiddenGroupedMonitorsTags = [];
  for (let i = 0; i < monitors.length; i++) {
    if (pageType === "home" && monitors[i].monitor_type === "GROUP") {
      let typeData = JSON.parse(monitors[i].type_data);
      if (typeData.monitors && typeData.hideMonitors) {
        hiddenGroupedMonitorsTags = hiddenGroupedMonitorsTags.concat(typeData.monitors.map((monitor) => monitor.tag));
      }
    }
  }
  monitors = monitors
    .map((monitor) => {
      return {
        tag: monitor.tag,
        name: monitor.name,
        description: monitor.description,
        monitor_type: monitor.monitor_type,
        image: monitor.image,
        category_name: monitor.category_name,
        day_degraded_minimum_count: monitor.day_degraded_minimum_count,
        day_down_minimum_count: monitor.day_down_minimum_count,
        id: monitor.id,
        image: monitor.image,
        include_degraded_in_downtime: monitor.include_degraded_in_downtime,
      };
    })
    .filter((monitor) => !hiddenGroupedMonitorsTags.includes(monitor.tag))
    .filter((monitor) => {
      if (pageType == "home") {
        return monitor.category_name == "Home";
      }
      return true;
    });

  const parentData = await parent();
  const siteData = parentData.site;
  let hero = siteData.hero;

  let pageTitle = siteData.title;
  let canonical = siteData.siteURL;
  let pageDescription = "";
  let descDb = siteData.metaTags.find((tag) => tag.key === "description");
  if (descDb) {
    pageDescription = descDb.value;
  }

  monitors = SortMonitor(siteData.monitorSort, monitors);
  const monitorsActive = [];
  for (let i = 0; i < monitors.length; i++) {
    let data = await FetchData(siteData, monitors[i], parentData.localTz, parentData.selectedLang, parentData.lang);
    monitors[i].pageData = data;

    monitors[i].activeIncidents = [];
    monitorsActive.push(monitors[i]);
  }

  let startWithin = moment().subtract(siteData.homeIncidentStartTimeWithin, "days").unix();
  let endWithin = moment().add(siteData.homeIncidentStartTimeWithin, "days").unix();
  let allOpenIncidents = await GetIncidentsOpenHome(siteData.homeIncidentCount, startWithin, endWithin);

  //if not home page
  let isCategoryPage = pageType === "category";
  let isMonitorPage = pageType === "monitor";
  let isGroupPage = pageType === "group";

  if (isMonitorPage && monitorsActive.length > 0) {
    pageTitle = monitorsActive[0].name + " - " + pageTitle;
    pageDescription = monitorsActive[0].description;
    canonical = canonical + "?monitor=" + monitorsActive[0].tag;
    hero = {
      title: monitorsActive[0].name,
      subtitle: monitorsActive[0].description,
      image: monitorsActive[0].image,
    };
  }

  if (isGroupPage) {
    pageTitle = group.name + " - " + pageTitle;
    pageDescription = group.description;
    canonical = canonical + "?group=" + group.tag;

    hero = {
      title: group.name,
      subtitle: group.description,
      image: group.image,
    };
  }

  //if category page
  if (isCategoryPage) {
    let allCategories = siteData.categories;
    let selectedCategory = allCategories.find((category) => category.name === query.get("category"));
    if (selectedCategory) {
      pageTitle = selectedCategory.name + " - " + pageTitle;
      pageDescription = selectedCategory.description;
      canonical = canonical + "?category=" + query.get("category");

      hero = {
        title: selectedCategory.name,
        subtitle: selectedCategory.description,
        image: selectedCategory.image,
      };
    }
  }
  if (isCategoryPage || isMonitorPage || isGroupPage) {
    let eligibleTags = monitorsActive.map((monitor) => monitor.tag);
    //filter incidents that have monitor_tag in monitors
    allOpenIncidents = allOpenIncidents.filter((incident) => {
      let incidentMonitors = incident.monitors;
      let monitorTags = incidentMonitors.map((monitor) => monitor.monitor_tag);
      let isPresent = false;
      monitorTags.forEach((tag) => {
        if (eligibleTags.includes(tag)) {
          isPresent = true;
        }
      });
      return isPresent;
    });
  }

  allOpenIncidents = allOpenIncidents.map((incident) => {
    let incidentMonitors = incident.monitors;
    let monitorTags = incidentMonitors.map((monitor) => monitor.monitor_tag);
    let xm = monitors.filter((monitor) => monitorTags.includes(monitor.tag));

    incident.monitors = xm.map((monitor) => {
      return {
        tag: monitor.tag,
        name: monitor.name,
        description: monitor.description,
        image: monitor.image,
        impact_type: incidentMonitors.filter((m) => m.monitor_tag === monitor.tag)[0].monitor_impact,
      };
    });
    return incident;
  });

  let allRecentIncidents = allOpenIncidents.filter((incident) => incident.incident_type == "INCIDENT");
  let allRecentMaintenances = allOpenIncidents.filter((incident) => incident.incident_type == "MAINTENANCE");
  return {
    monitors: monitorsActive,
    allRecentIncidents,
    allRecentMaintenances,
    pageType,
    pageTitle: pageTitle,
    pageDescription: removeTags(pageDescription),
    hero,
    categoryName: query.get("category"),
    canonical,
  };
}

// @ts-nocheck
import { FetchData } from "$lib/server/page";
import {
  GetMonitors,
  GetIncidentsOpenHome,
} from "$lib/server/controllers/controller.js";
import { SortMonitor } from "$lib/clientTools.js";
import moment from "moment";
function removeTags(str) {
  if (str === null || str === "") return false;
  else str = str.toString();

  // Regular expression to identify HTML tags in
  // the input string. Replacing the identified
  // HTML tag with a null string.
  return str.replace(/(<([^>]+)>)/gi, "");
}
export async function load({ parent, url }) {
  let monitors = await GetMonitors({ status: "ACTIVE" });
  const query = url.searchParams;
  const requiredCategory = query.get("category") || "Home";
  const parentData = await parent();
  const siteData = parentData.site;
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
    //only return monitors that have category as home or category is not present
    if (
      !!!query.get("monitor") &&
      !!monitors[i].category_name &&
      monitors[i].category_name !== requiredCategory
    ) {
      continue;
    }
    if (query.get("monitor") && query.get("monitor") !== monitors[i].tag) {
      continue;
    }
    delete monitors[i].api;
    delete monitors[i].default_status;

    let data = await FetchData(
      siteData,
      monitors[i],
      parentData.localTz,
      parentData.selectedLang,
      parentData.lang,
    );
    monitors[i].pageData = data;

    monitors[i].activeIncidents = [];
    monitorsActive.push(monitors[i]);
  }
  let startWithin = moment()
    .subtract(siteData.homeIncidentStartTimeWithin, "days")
    .unix();
  let endWithin = moment()
    .add(siteData.homeIncidentStartTimeWithin, "days")
    .unix();
  let allOpenIncidents = await GetIncidentsOpenHome(
    siteData.homeIncidentCount,
    startWithin,
    endWithin,
  );

  //if not home page
  let isCategoryPage =
    !!query.get("category") && query.get("category") !== "Home";
  let isMonitorPage = !!query.get("monitor");
  if (isMonitorPage && monitorsActive.length > 0) {
    pageTitle = monitorsActive[0].name + " - " + pageTitle;
    pageDescription = monitorsActive[0].description;
    canonical = canonical + "?monitor=" + monitorsActive[0].tag;
  }
  //if category page
  if (isCategoryPage) {
    let allCategories = siteData.categories;
    let selectedCategory = allCategories.find(
      (category) => category.name === requiredCategory,
    );
    if (selectedCategory) {
      pageTitle = selectedCategory.name + " - " + pageTitle;
      pageDescription = selectedCategory.description;
      canonical = canonical + "?category=" + requiredCategory;
    }
  }
  if (isCategoryPage || isMonitorPage) {
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
        impact_type: incidentMonitors.filter(
          (m) => m.monitor_tag === monitor.tag,
        )[0].monitor_impact,
      };
    });
    return incident;
  });

  let allRecentIncidents = allOpenIncidents.filter(
    (incident) => incident.incident_type == "INCIDENT",
  );
  let allRecentMaintenances = allOpenIncidents.filter(
    (incident) => incident.incident_type == "MAINTENANCE",
  );
  return {
    monitors: monitorsActive,
    allRecentIncidents,
    allRecentMaintenances,
    categoryName: requiredCategory,
    isCategoryPage: isCategoryPage,
    isMonitorPage: isMonitorPage,
    pageTitle: pageTitle,
    pageDescription: removeTags(pageDescription),
    canonical,
  };
}

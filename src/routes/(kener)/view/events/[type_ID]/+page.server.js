// @ts-nocheck
import { GetIncidentsByIDS, GetIncidentMonitors, GetMonitorsByTag } from "$lib/server/controllers/controller.js";
export async function load({ parent, url, params, cookies }) {
  const parentData = await parent();
  const siteData = parentData.site;
  let typeID = params.type_ID;
  if (!!!typeID) {
    return {
      error: "Unknown event id",
      title: "Unknown event id",
    };
  }

  //check array length 2
  if (typeID.split("-").length !== 2) {
    return {
      error: "Unknown event id",
      title: "Unknown event id",
    };
  }

  let eventID = typeID.split("-")[1];

  let incident = await GetIncidentsByIDS([eventID]);
  if (incident.length === 0) {
    return {
      error: "Unknown event id",
    };
  }

  incident = incident[0];

  let monitors = await GetIncidentMonitors(eventID);
  for (let i = 0; i < monitors.length; i++) {
    const element = monitors[i];
    const tag = element.monitor_tag;
    const monitor = await GetMonitorsByTag(tag);
    if (!!monitor) {
      monitors[i] = {
        tag: monitor.tag,
        name: monitor.name,
        description: monitor.description,
        image: monitor.image,
        impact_type: element.monitor_impact,
        id: monitor.id,
      };
    }
  }

  incident.monitors = monitors;

  return { incident, title: incident.title };
}

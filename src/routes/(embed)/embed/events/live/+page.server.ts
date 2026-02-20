import type { PageServerLoad } from "./$types";
import db from "$lib/server/db/db";

import { GetNowTimestampUTC } from "$lib/server/tool";

export const load: PageServerLoad = async ({ params, parent, url }) => {
  const ts = GetNowTimestampUTC();
  let showIncident = false;
  const theme = url.searchParams.get("theme");

  const showIncidentParam = url.searchParams.get("incidents");
  if (showIncidentParam !== null) {
    showIncident = showIncidentParam === "1";
  }
  let showMaintenance = false;
  const showMaintenanceParam = url.searchParams.get("maintenance");
  if (showMaintenanceParam !== null) {
    showMaintenance = showMaintenanceParam === "1";
  }
  //if both null then show both by default
  if (showIncidentParam === null && showMaintenanceParam === null) {
    showIncident = true;
    showMaintenance = true;
  }
  let tags: string[] = [];
  const tagsParam = url.searchParams.get("tags");
  if (tagsParam) {
    tags = tagsParam.split(",").map((tag) => tag.trim());
  }
  return {
    ...{
      theme,
      incidents: showIncident ? await db.getAllGlobalOngoingIncidentsWithComments(ts, tags) : [],
      maintenance_events: showMaintenance ? await db.getAllGlobalOngoingMaintenanceEvents(ts, tags) : [],
    },
  };
};

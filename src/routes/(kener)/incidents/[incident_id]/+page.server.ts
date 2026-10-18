import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import {
  GetIncidentById,
  GetIncidentCommentsByIncidentId,
  GetAffectedMonitorsByIncidentId,
} from "$lib/server/controllers/dashboardController.js";

export const load: PageServerLoad = async ({ params, parent }) => {
  const { incident_id } = params;
  const incidentIdNum = Number(incident_id);
  if (isNaN(incidentIdNum)) {
    throw error(400, { message: "Invalid incident ID" });
  }

  // Fetch incident details
  const incident = await GetIncidentById(incidentIdNum);
  if (!incident) {
    throw error(404, { message: "Incident not found" });
  }
  // Fetch incident comments
  const comments = await GetIncidentCommentsByIncidentId(incidentIdNum);

  // Fetch affected monitors
  const { canSeeHiddenMonitors } = await parent();
  const affectedMonitors = await GetAffectedMonitorsByIncidentId(incidentIdNum, canSeeHiddenMonitors);

  return {
    ...{ incident, comments, affectedMonitors },
  };
};

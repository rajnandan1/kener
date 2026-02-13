import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import {
  GetMaintenanceWithEvents,
  GetMaintenanceMonitors,
  GetMaintenanceEventById,
} from "$lib/server/controllers/maintenanceController.js";
import db from "$lib/server/db/db";
import type { MaintenanceEventRecord } from "$lib/server/db/dbimpl";

export const load: PageServerLoad = async ({ params, url }) => {
  const { maintenance_id } = params;
  let idType = "event";

  // Determine if the maintenance_id is an event ID or a maintenance ID
  if (url.searchParams.get("type") === "maintenance") {
    idType = "maintenance";
  }

  const eventIdNum = Number(maintenance_id);
  if (isNaN(eventIdNum)) {
    throw error(400, { message: "Invalid maintenance event ID" });
  }

  // First fetch the maintenance event to get the maintenance_id
  let maintenanceId: number;
  let maintenanceEvent: MaintenanceEventRecord | null = null;
  if (idType === "event") {
    maintenanceEvent = await GetMaintenanceEventById(eventIdNum);
    if (!maintenanceEvent) {
      throw error(404, { message: "Maintenance event not found" });
    }
    maintenanceId = maintenanceEvent.maintenance_id;
    //
  } else {
    maintenanceId = eventIdNum;
    //get the first maintenance event for this maintenance
  }

  // Fetch maintenance details with events using the maintenance_id from the event
  const maintenance = await GetMaintenanceWithEvents(maintenanceId);
  if (!maintenance) {
    throw error(404, { message: "Maintenance not found" });
  }
  if (!maintenanceEvent && !!maintenance.events && maintenance.events.length > 0) {
    maintenanceEvent = maintenance.events[0];
  }

  // Fetch monitor tags for this maintenance
  const monitorRecords = await GetMaintenanceMonitors(maintenanceId);
  const monitorTags = monitorRecords.map((m) => m.monitor_tag);

  // Fetch full monitor details (name, image, etc.)
  let affectedMonitors: Array<{
    monitor_tag: string;
    monitor_name: string;
    monitor_image: string | null;
    monitor_impact: string;
  }> = [];

  if (monitorTags.length > 0) {
    const monitors = await db.getMonitorsByTags(monitorTags);
    affectedMonitors = monitors
      .filter((m) => m.is_hidden !== "YES") // Exclude hidden monitors
      .map((m) => ({
        monitor_tag: m.tag,
        monitor_name: m.name,
        monitor_image: m.image || null,
        monitor_impact: monitorRecords.find((mr) => mr.monitor_tag === m.tag)?.monitor_impact || "",
      }));
  }

  return {
    maintenance,
    maintenanceEvent, // The specific event that was clicked
    affectedMonitors,
  };
};

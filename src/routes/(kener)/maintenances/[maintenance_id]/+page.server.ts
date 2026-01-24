import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import {
  GetMaintenanceWithEvents,
  GetMaintenanceMonitors,
  GetMaintenanceEventById,
} from "$lib/server/controllers/maintenanceController.js";
import db from "$lib/server/db/db";

export const load: PageServerLoad = async ({ params }) => {
  const { maintenance_id } = params;
  const eventIdNum = Number(maintenance_id);
  if (isNaN(eventIdNum)) {
    throw error(400, { message: "Invalid maintenance event ID" });
  }

  // First fetch the maintenance event to get the maintenance_id
  const maintenanceEvent = await GetMaintenanceEventById(eventIdNum);
  if (!maintenanceEvent) {
    throw error(404, { message: "Maintenance event not found" });
  }

  // Fetch maintenance details with events using the maintenance_id from the event
  const maintenance = await GetMaintenanceWithEvents(maintenanceEvent.maintenance_id);
  if (!maintenance) {
    throw error(404, { message: "Maintenance not found" });
  }

  // Fetch monitor tags for this maintenance
  const monitorRecords = await GetMaintenanceMonitors(maintenanceEvent.maintenance_id);
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

// @ts-nocheck
import { GetMonitors } from "$lib/server/controllers/controller.js";

export async function load({ parent }) {
  // Wait for parent layout to verify authentication
  await parent();

  // Get all active monitors
  const monitors = await GetMonitors({ status: "ACTIVE" });

  return {
    monitors: monitors.map((m) => ({
      tag: m.tag,
      name: m.name,
      monitor_type: m.monitor_type,
    })),
  };
}

import { expect, it } from "vitest";

const routes = import.meta.glob<string>("./**/+server.ts", { query: "?raw", import: "default", eager: true });

const OPEN_GAPS: Record<string, string[]> = {
  "./incidents/+server.ts": ["createIncident", "insertIncidentMonitor"],
  "./incidents/[incident_id]/+server.ts": ["insertIncidentMonitorWithMerge", "removeIncidentMonitor", "updateIncident"],
  "./incidents/[incident_id]/comments/[comment_id]/+server.ts": [
    "updateIncidentCommentByID",
    "updateIncidentCommentStatusByID",
  ],
  "./maintenances/[maintenance_id]/+server.ts": [
    "addMonitorsToMaintenanceWithStatus",
    "deleteMaintenanceEvent",
    "removeAllMonitorsFromMaintenance",
    "updateMaintenance",
  ],
  "./maintenances/[maintenance_id]/events/[event_id]/+server.ts": ["updateMaintenanceEvent"],
};

it("v4 routes write through the controllers the dashboard uses, never through db directly", () => {
  const directWrites: Record<string, string[]> = {};
  for (const [file, source] of Object.entries(routes)) {
    const writes = [...source.matchAll(/\bdb\.(\w+)\(/g)].map((m) => m[1]).filter((name) => !name.startsWith("get"));
    if (writes.length > 0) directWrites[file] = [...new Set(writes)].sort();
  }
  expect(directWrites).toEqual(OPEN_GAPS);
});

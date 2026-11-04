import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, subscriberQueue, siteData } = vi.hoisted(() => ({
  db: {
    getMaintenanceById: vi.fn(),
    updateMaintenance: vi.fn(),
    getMaintenanceMonitors: vi.fn(),
    removeAllMonitorsFromMaintenance: vi.fn(),
    addMonitorsToMaintenanceWithStatus: vi.fn(),
    addMonitorToMaintenance: vi.fn(),
    getMonitorByTag: vi.fn(),
    getMonitorsByMaintenanceId: vi.fn(),
    getMaintenanceEventsByMaintenanceId: vi.fn(),
  },
  subscriberQueue: { push: vi.fn() },
  siteData: {
    siteURL: "https://status.example.com",
    siteName: "Example",
    colors: {},
    globalMaintenanceNotificationSettings: {
      event_types: { created: true, reminder: true, started: true, ended: true },
      reminder_buffer_hours: 1,
    },
  },
}));
vi.mock("../db/db.js", () => ({ default: db }));
vi.mock("../queues/subscriberQueue.js", () => ({ default: subscriberQueue }));
vi.mock("./controller.js", () => ({ GetAllSiteData: vi.fn(async () => siteData) }));

import { AddMonitorToMaintenance, UpdateMaintenance } from "./maintenanceController.js";

const NAMES: Record<string, string> = { api: "Public API", web: "Website", db: "Database" };
const maintenance = {
  id: 5,
  title: "DB upgrade",
  description: null,
  status: "ACTIVE",
  start_date_time: 1000,
  rrule: "FREQ=DAILY;COUNT=1",
  duration_seconds: 600,
};
const event = (id: number, status: string, start: number) => ({
  id,
  maintenance_id: 5,
  start_date_time: start,
  end_date_time: start + 600,
  status,
});

describe("monitors added to a maintenance", () => {
  let attached: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    siteData.globalMaintenanceNotificationSettings.event_types.created = true;
    attached = ["api"];
    db.getMaintenanceById.mockResolvedValue(maintenance);
    db.getMonitorByTag.mockImplementation(async (tag: string) => ({ tag }));
    db.getMaintenanceMonitors.mockImplementation(async () => attached.map((monitor_tag) => ({ monitor_tag })));
    db.removeAllMonitorsFromMaintenance.mockImplementation(async () => {
      attached = [];
    });
    db.addMonitorsToMaintenanceWithStatus.mockImplementation(
      async (_id: number, monitors: { monitor_tag: string }[]) => {
        attached.push(...monitors.map((m) => m.monitor_tag));
      },
    );
    db.addMonitorToMaintenance.mockImplementation(async ({ monitor_tag }: { monitor_tag: string }) => {
      if (!attached.includes(monitor_tag)) attached.push(monitor_tag);
    });
    db.getMonitorsByMaintenanceId.mockImplementation(async () =>
      attached.map((tag) => ({ monitor_tag: tag, monitor_name: NAMES[tag], monitor_impact: "MAINTENANCE" })),
    );
    db.getMaintenanceEventsByMaintenanceId.mockResolvedValue([
      event(1, "COMPLETED", 500),
      event(3, "SCHEDULED", 9000),
      event(2, "READY", 5000),
    ]);
  });

  const setMonitors = (tags: string[]) =>
    UpdateMaintenance(5, { monitors: tags.map((monitor_tag) => ({ monitor_tag, monitor_impact: "MAINTENANCE" })) });

  it("tells the subscribers of the added monitors only about the next window", async () => {
    await setMonitors(["api", "web", "db"]);

    expect(subscriberQueue.push).toHaveBeenCalledOnce();
    const [variables, monitorTags] = subscriberQueue.push.mock.calls[0];
    expect(monitorTags).toEqual(["web", "db"]);
    expect(variables).toMatchObject({
      title: "Maintenance Updated: DB upgrade",
      event_type: "maintenances",
      update_id: "maintenance_2_monitors_added_db_web",
    });
    expect(variables.update_text).toContain("now includes Website, Database");
  });

  it("sends nothing when no monitor is added", async () => {
    await setMonitors(["api"]);
    await setMonitors([]);

    expect(subscriberQueue.push).not.toHaveBeenCalled();
  });

  it("sends nothing when no window is still to come", async () => {
    db.getMaintenanceEventsByMaintenanceId.mockResolvedValue([event(1, "COMPLETED", 500), event(2, "CANCELLED", 900)]);

    await setMonitors(["api", "web"]);

    expect(subscriberQueue.push).not.toHaveBeenCalled();
  });

  it("sends nothing for an inactive maintenance, or when creation mails are off", async () => {
    db.getMaintenanceById.mockResolvedValue({ ...maintenance, status: "INACTIVE" });
    await setMonitors(["api", "web"]);

    db.getMaintenanceById.mockResolvedValue(maintenance);
    siteData.globalMaintenanceNotificationSettings.event_types.created = false;
    attached = ["api"];
    await setMonitors(["api", "web"]);

    expect(subscriberQueue.push).not.toHaveBeenCalled();
  });

  it("tells the subscribers of a monitor added on its own, once", async () => {
    await AddMonitorToMaintenance(5, "web");
    await AddMonitorToMaintenance(5, "web");

    expect(subscriberQueue.push).toHaveBeenCalledOnce();
    expect(subscriberQueue.push.mock.calls[0][1]).toEqual(["web"]);
  });
});

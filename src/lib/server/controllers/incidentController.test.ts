import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, subscriberQueue } = vi.hoisted(() => ({
  db: {
    getIncidentById: vi.fn(),
    insertIncidentComment: vi.fn(),
    updateIncident: vi.fn(),
    setIncidentEndTimeToNull: vi.fn(),
    getIncidentMonitorsByIncidentID: vi.fn(),
    createIncident: vi.fn(),
    getMonitorByTag: vi.fn(),
    insertIncidentMonitorWithMerge: vi.fn(),
  },
  subscriberQueue: { push: vi.fn() },
}));
vi.mock("../db/db.js", () => ({ default: db }));
vi.mock("../queues/subscriberQueue.js", () => ({ default: subscriberQueue }));
vi.mock("./siteDataController.js", () => ({
  GetAllSiteData: vi.fn(async () => ({ siteURL: "https://status.example.com", siteName: "Example", colors: {} })),
}));

import { AddIncidentComment, CreateNewIncidentWithCommentAndMonitor } from "./incidentController.js";

const incident = {
  id: 12,
  title: "Checkout is slow",
  state: "INVESTIGATING",
  incident_type: "INCIDENT",
  start_date_time: 1000,
  end_date_time: null,
};

function pushedVariables() {
  expect(subscriberQueue.push).toHaveBeenCalledOnce();
  return subscriberQueue.push.mock.calls[0][0];
}

describe("AddIncidentComment: subscriber mail variables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getIncidentById.mockResolvedValue(incident);
    db.insertIncidentComment.mockImplementation(async (_id: number, comment: string, state: string) => ({
      id: 99,
      comment,
      state,
    }));
  });

  it("flags the comment's state and the worst monitor impact", async () => {
    db.getIncidentMonitorsByIncidentID.mockResolvedValue([
      { monitor_tag: "api", monitor_impact: "DEGRADED" },
      { monitor_tag: "web", monitor_impact: "DOWN" },
    ]);

    await AddIncidentComment(12, "Looking into it", "INVESTIGATING", 2000);

    expect(pushedVariables()).toMatchObject({
      update_state: "INVESTIGATING",
      is_investigating: true,
      is_identified: false,
      is_monitoring: false,
      is_resolved: false,
      incident_impact: "DOWN",
      is_down: true,
      is_degraded: false,
    });
  });

  it("reads degraded when no monitor is down", async () => {
    db.getIncidentMonitorsByIncidentID.mockResolvedValue([{ monitor_tag: "api", monitor_impact: "DEGRADED" }]);

    await AddIncidentComment(12, "Fixed", "RESOLVED", 3000);

    expect(pushedVariables()).toMatchObject({
      is_resolved: true,
      is_investigating: false,
      incident_impact: "DEGRADED",
      is_down: false,
      is_degraded: true,
    });
  });

  it("leaves the impact empty for an incident without monitors", async () => {
    db.getIncidentMonitorsByIncidentID.mockResolvedValue([]);

    await AddIncidentComment(12, "We know why", "IDENTIFIED", 2500);

    expect(pushedVariables()).toMatchObject({
      is_identified: true,
      incident_impact: "",
      is_down: false,
      is_degraded: false,
    });
  });
});

describe("CreateNewIncidentWithCommentAndMonitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const attached: Array<{ monitor_tag: string; monitor_impact: string }> = [];
    db.createIncident.mockResolvedValue({ id: 12 });
    db.getIncidentById.mockResolvedValue(incident);
    db.getMonitorByTag.mockResolvedValue({ tag: "web" });
    db.insertIncidentMonitorWithMerge.mockImplementation(
      async (row: { monitor_tag: string; monitor_impact: string }) => {
        attached.push(row);
      },
    );
    db.getIncidentMonitorsByIncidentID.mockImplementation(async () => [...attached]);
    db.insertIncidentComment.mockImplementation(async (_id: number, comment: string, state: string) => ({
      id: 99,
      comment,
      state,
    }));
  });

  it("attaches the monitor before the opening comment, so its mail carries the impact", async () => {
    await CreateNewIncidentWithCommentAndMonitor(
      { title: "web is down", start_date_time: 1000 } as Parameters<typeof CreateNewIncidentWithCommentAndMonitor>[0],
      "Alert triggered",
      "web",
      "DOWN",
    );

    expect(pushedVariables()).toMatchObject({ is_investigating: true, incident_impact: "DOWN", is_down: true });
  });
});

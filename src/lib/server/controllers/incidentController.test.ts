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

  it("still sends the mail, without impact, when the monitors cannot be read", async () => {
    db.getIncidentMonitorsByIncidentID.mockRejectedValue(new Error("connection reset"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await AddIncidentComment(12, "Looking into it", "INVESTIGATING", 2000);

    expect(pushedVariables()).toMatchObject({
      is_investigating: true,
      incident_impact: "",
      is_down: false,
      is_degraded: false,
    });
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
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
  let attached: Array<{ monitor_tag: string; monitor_impact: string }>;

  beforeEach(() => {
    vi.clearAllMocks();
    attached = [];
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

  const create = (alertValue: string) =>
    CreateNewIncidentWithCommentAndMonitor(
      { title: "web alert", start_date_time: 1000 } as Parameters<typeof CreateNewIncidentWithCommentAndMonitor>[0],
      "Alert triggered",
      "web",
      alertValue,
    );

  it.each([
    ["a STATUS DOWN alert", "DOWN", "DOWN"],
    ["a STATUS DEGRADED alert", "DEGRADED", "DEGRADED"],
    ["a LATENCY alert, whose value is a threshold in ms", "1000", "DEGRADED"],
    ["an UPTIME alert, whose value is a percentage", "99.5", "DEGRADED"],
  ])(
    "attaches the monitor for %s before the opening comment, so its mail carries the impact",
    async (_, alertValue, impact) => {
      await expect(create(alertValue)).resolves.toEqual({ incident_id: 12 });

      expect(attached).toEqual([{ incident_id: 12, monitor_tag: "web", monitor_impact: impact }]);
      expect(db.insertIncidentMonitorWithMerge.mock.invocationCallOrder[0]).toBeLessThan(
        db.insertIncidentComment.mock.invocationCallOrder[0],
      );
      expect(pushedVariables()).toMatchObject({
        is_investigating: true,
        incident_impact: impact,
        is_down: impact === "DOWN",
        is_degraded: impact === "DEGRADED",
      });
    },
  );

  it("still posts the opening comment and its mail when the monitor cannot be attached, then raises", async () => {
    db.getMonitorByTag.mockResolvedValue(undefined);

    await expect(create("DOWN")).rejects.toThrow("Monitor with tag web does not exist");

    expect(db.insertIncidentComment).toHaveBeenCalledOnce();
    expect(pushedVariables()).toMatchObject({ is_investigating: true, incident_impact: "" });
  });
});

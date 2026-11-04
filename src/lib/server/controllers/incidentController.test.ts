import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, subscriberQueue } = vi.hoisted(() => ({
  db: {
    getIncidentById: vi.fn(),
    insertIncidentComment: vi.fn(),
    updateIncident: vi.fn(),
    setIncidentEndTimeToNull: vi.fn(),
    getMonitorsByIncidentId: vi.fn(),
    getActiveIncidentComments: vi.fn(),
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

import {
  AddIncidentComment,
  AddIncidentMonitor,
  CreateNewIncidentWithCommentAndMonitor,
} from "./incidentController.js";

const incident = {
  id: 12,
  title: "Checkout is slow",
  state: "INVESTIGATING",
  incident_type: "INCIDENT",
  is_global: "YES",
  start_date_time: 1000,
  end_date_time: null,
};

function pushedVariables() {
  expect(subscriberQueue.push).toHaveBeenCalledOnce();
  return subscriberQueue.push.mock.calls[0][0];
}

function pushedMonitorTags() {
  expect(subscriberQueue.push).toHaveBeenCalledOnce();
  return subscriberQueue.push.mock.calls[0][1];
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
    db.getMonitorsByIncidentId.mockResolvedValue([
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
    db.getMonitorsByIncidentId.mockResolvedValue([{ monitor_tag: "api", monitor_impact: "DEGRADED" }]);

    await AddIncidentComment(12, "Fixed", "RESOLVED", 3000);

    expect(pushedVariables()).toMatchObject({
      is_resolved: true,
      is_investigating: false,
      incident_impact: "DEGRADED",
      is_down: false,
      is_degraded: true,
    });
  });

  it("sends the mail to the subscribers of the incident's monitors", async () => {
    db.getMonitorsByIncidentId.mockResolvedValue([
      { monitor_tag: "api", monitor_impact: "DEGRADED" },
      { monitor_tag: "web", monitor_impact: "DOWN" },
    ]);

    await AddIncidentComment(12, "Looking into it", "INVESTIGATING", 2000);

    expect(pushedMonitorTags()).toEqual(["api", "web"]);
  });

  it("sends no mail, and logs, when the monitors cannot be read", async () => {
    db.getMonitorsByIncidentId.mockRejectedValue(new Error("connection reset"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await AddIncidentComment(12, "Looking into it", "INVESTIGATING", 2000);

    expect(db.insertIncidentComment).toHaveBeenCalledOnce();
    expect(subscriberQueue.push).not.toHaveBeenCalled();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it("sends no mail for an incident without visible monitors, even a global one", async () => {
    db.getMonitorsByIncidentId.mockResolvedValue([]);

    await AddIncidentComment(12, "We know why", "IDENTIFIED", 2500);

    expect(db.insertIncidentComment).toHaveBeenCalledOnce();
    expect(subscriberQueue.push).not.toHaveBeenCalled();
  });

  it("rejects a RESOLVED comment dated before the incident start, and saves and sends nothing", async () => {
    await expect(AddIncidentComment(12, "Fixed", "RESOLVED", 900)).rejects.toThrow(
      "A RESOLVED comment cannot be dated before the incident start",
    );

    expect(db.insertIncidentComment).not.toHaveBeenCalled();
    expect(db.updateIncident).not.toHaveBeenCalled();
    expect(subscriberQueue.push).not.toHaveBeenCalled();
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
    db.getMonitorsByIncidentId.mockImplementation(async () => [...attached]);
    db.getActiveIncidentComments.mockResolvedValue([]);
    db.insertIncidentComment.mockImplementation(async (_id: number, comment: string, state: string) => ({
      id: 99,
      comment,
      state,
    }));
  });

  const create = (alertValue: string, alertFor = "STATUS") =>
    CreateNewIncidentWithCommentAndMonitor(
      { title: "web alert", start_date_time: 1000 } as Parameters<typeof CreateNewIncidentWithCommentAndMonitor>[0],
      "Alert triggered",
      "web",
      alertValue,
      alertFor,
    );

  it.each([
    ["a STATUS DOWN alert", "STATUS", "DOWN", "DOWN"],
    ["a STATUS DEGRADED alert", "STATUS", "DEGRADED", "DEGRADED"],
    ["a LATENCY alert, whose value is a threshold in ms", "LATENCY", "1000", "DEGRADED"],
    ["an UPTIME alert, whose value is a percentage", "UPTIME", "99.5", "DEGRADED"],
  ])(
    "attaches the monitor for %s before the opening comment, so its mail carries the impact",
    async (_, alertFor, alertValue, impact) => {
      await expect(create(alertValue, alertFor)).resolves.toEqual({ incident_id: 12 });

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
      expect(pushedMonitorTags()).toEqual(["web"]);
    },
  );

  it("opens a STATUS UP alert's incident without the monitor, so a healthy monitor is not called degraded", async () => {
    await expect(create("UP")).resolves.toEqual({ incident_id: 12 });

    expect(db.insertIncidentMonitorWithMerge).not.toHaveBeenCalled();
    expect(db.insertIncidentComment).toHaveBeenCalledOnce();
    // No monitor, so no subscriber to tell.
    expect(subscriberQueue.push).not.toHaveBeenCalled();
  });

  it("claims no impact for an alert type it does not know", async () => {
    await expect(create("DOWN", "SOMETHING_NEW")).resolves.toEqual({ incident_id: 12 });

    expect(db.insertIncidentMonitorWithMerge).not.toHaveBeenCalled();
    expect(subscriberQueue.push).not.toHaveBeenCalled();
  });

  it("still posts the opening comment and its mail when the monitor cannot be attached, then raises", async () => {
    db.getMonitorByTag.mockResolvedValue(undefined);

    await expect(create("DOWN")).rejects.toThrow("Monitor with tag web does not exist");

    expect(db.insertIncidentComment).toHaveBeenCalledOnce();
    expect(subscriberQueue.push).not.toHaveBeenCalled();
  });

  it("sends no separate mail for the monitor it attaches before the opening comment", async () => {
    await create("DOWN");

    // One mail: the opening comment's. The attach found no comment to repeat.
    expect(pushedVariables()).toMatchObject({ update_id: "99" });
  });
});

describe("AddIncidentMonitor: a monitor added to an announced incident", () => {
  let attached: Array<{ monitor_tag: string; monitor_impact: string; monitor_name: string }>;
  const latest = { id: 41, comment: "Payments are failing", state: "IDENTIFIED" };

  beforeEach(() => {
    vi.clearAllMocks();
    attached = [{ monitor_tag: "api", monitor_impact: "DEGRADED", monitor_name: "API" }];
    db.getIncidentById.mockResolvedValue({ ...incident, state: "IDENTIFIED" });
    db.getMonitorByTag.mockResolvedValue({ tag: "web" });
    db.insertIncidentMonitorWithMerge.mockImplementation(
      async (row: { monitor_tag: string; monitor_impact: string }) => {
        attached = attached.filter((m) => m.monitor_tag !== row.monitor_tag);
        attached.push({ ...row, monitor_name: row.monitor_tag === "web" ? "Website" : row.monitor_tag });
      },
    );
    db.getMonitorsByIncidentId.mockImplementation(async () => [...attached]);
    db.getActiveIncidentComments.mockResolvedValue([latest]);
  });

  it("sends the latest update to the subscribers of the added monitor only", async () => {
    await AddIncidentMonitor(12, "web", "DOWN");

    expect(pushedMonitorTags()).toEqual(["web"]);
    const variables = pushedVariables();
    expect(variables).toMatchObject({
      title: incident.title,
      update_state: "IDENTIFIED",
      incident_impact: "DOWN",
      update_id: "41_web",
    });
    expect(variables.update_text).toContain("Website");
    expect(variables.update_text).toContain("Payments are failing");
  });

  it("sends nothing when the monitor was already on the incident", async () => {
    await AddIncidentMonitor(12, "api", "DOWN");

    expect(db.insertIncidentMonitorWithMerge).toHaveBeenCalledOnce();
    expect(subscriberQueue.push).not.toHaveBeenCalled();
  });

  it("sends nothing before the incident's first update", async () => {
    db.getActiveIncidentComments.mockResolvedValue([]);

    await AddIncidentMonitor(12, "web", "DOWN");

    expect(subscriberQueue.push).not.toHaveBeenCalled();
  });

  it("sends nothing for a resolved incident", async () => {
    db.getIncidentById.mockResolvedValue({ ...incident, state: "RESOLVED" });

    await AddIncidentMonitor(12, "web", "DOWN");

    expect(subscriberQueue.push).not.toHaveBeenCalled();
  });
});

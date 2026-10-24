import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, subscriberQueue, row } = vi.hoisted(() => {
  const row: Record<string, unknown> = {};
  return {
    row,
    db: {
      getIncidentById: vi.fn(async () => ({ ...row })),
      insertIncidentComment: vi.fn(
        async (incident_id: number, comment: string, state: string, commented_at: number) => ({
          id: 99,
          incident_id,
          comment,
          state,
          commented_at,
          created_at: "2026-10-18 12:00:00",
          updated_at: "2026-10-18 12:00:00",
        }),
      ),
      updateIncident: vi.fn(async (data: Record<string, unknown>) => {
        Object.assign(row, data);
        return 1;
      }),
      setIncidentEndTimeToNull: vi.fn(async () => {
        row.end_date_time = null;
        return 1;
      }),
      getMonitorsByIncidentId: vi.fn(async () => [{ monitor_tag: "api", monitor_impact: "DOWN" }]),
    },
    subscriberQueue: { push: vi.fn() },
  };
});
vi.mock("$lib/server/db/db", () => ({ default: db }));
vi.mock("$lib/server/queues/subscriberQueue", () => ({ default: subscriberQueue }));
vi.mock("$lib/server/controllers/siteDataController", () => ({
  GetAllSiteData: vi.fn(async () => ({ siteURL: "https://status.example.com", siteName: "Example", colors: {} })),
}));

import { POST } from "./+server";

const incident = {
  id: 12,
  title: "Checkout is slow",
  state: "INVESTIGATING",
  incident_type: "INCIDENT",
  is_global: "YES",
  status: "OPEN",
  start_date_time: 1000,
  end_date_time: null as number | null,
};

const post = (body: Record<string, unknown>) =>
  POST({
    locals: { incident: { ...row } },
    request: new Request("http://localhost/api/v4/incidents/12/comments", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  } as unknown as Parameters<typeof POST>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(row)) delete row[key];
  Object.assign(row, incident);
});

describe("POST /api/v4/incidents/{incident_id}/comments", () => {
  it("emails incident subscribers, like a comment posted from the dashboard", async () => {
    const response = await post({ comment: "  We found the cause  ", state: "IDENTIFIED", timestamp: 2000 });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      comment: {
        id: 99,
        incident_id: 12,
        comment: "We found the cause",
        timestamp: 1980,
        state: "IDENTIFIED",
        created_at: expect.any(String),
        updated_at: expect.any(String),
      },
    });
    expect(subscriberQueue.push).toHaveBeenCalledOnce();
    expect(subscriberQueue.push.mock.calls[0][0]).toMatchObject({
      event_type: "incidents",
      update_state: "IDENTIFIED",
      is_identified: true,
      incident_impact: "DOWN",
    });
    expect(subscriberQueue.push.mock.calls[0][1]).toEqual({ deduplication: { id: "subscriber-incidents-99" } });
  });

  it("sets the end time when the comment resolves the incident", async () => {
    await post({ comment: "Fixed", state: "RESOLVED", timestamp: 3000 });

    expect(row).toMatchObject({ state: "RESOLVED", end_date_time: 3000 });
  });

  it("clears the end time when the comment reopens a resolved incident", async () => {
    Object.assign(row, { state: "RESOLVED", end_date_time: 3000 });

    await post({ comment: "It is back", state: "INVESTIGATING", timestamp: 4000 });

    expect(row).toMatchObject({ state: "INVESTIGATING", end_date_time: null });
  });

  it("returns 400 and saves nothing for a RESOLVED comment dated before the incident start", async () => {
    const response = await post({ comment: "Fixed", state: "RESOLVED", timestamp: 900 });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "BAD_REQUEST", message: "A RESOLVED comment cannot be dated before the incident start" },
    });
    expect(db.insertIncidentComment).not.toHaveBeenCalled();
    expect(db.updateIncident).not.toHaveBeenCalled();
    expect(subscriberQueue.push).not.toHaveBeenCalled();
  });
});

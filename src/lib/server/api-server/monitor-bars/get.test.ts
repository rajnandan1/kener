import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$lib/server/db/db", () => ({
  default: {
    getMonitorsByTags: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("$lib/server/controllers/monitorsController", () => ({
  GetLatestMonitoringDataAllActive: vi.fn().mockResolvedValue([]),
  GetStatusCountsByIntervalGroupedByMonitor: vi.fn().mockResolvedValue([]),
}));

import { GetStatusCountsByIntervalGroupedByMonitor } from "$lib/server/controllers/monitorsController";
import type { APIServerRequest } from "$lib/server/types/api-server";
import get from "./get";

const mockedCounts = vi.mocked(GetStatusCountsByIntervalGroupedByMonitor);

const request = (query: string) => ({ query: new URLSearchParams(query) }) as APIServerRequest;

beforeEach(() => {
  mockedCounts.mockClear();
});

describe("GET /dashboard-apis/monitor-bars query parsing", () => {
  it("passes a valid endOfDayTodayAtTz and days through", async () => {
    const res = await get(request("tags=a,b&days=30&endOfDayTodayAtTz=1788780000"));
    expect(res.status).toBe(200);
    expect(mockedCounts).toHaveBeenCalledWith(["a", "b"], 1788780000 - 30 * 86400, 86400, 30);
  });

  it.each(["NaN", "abc", "", "30abc", "1.5"])(
    "falls back instead of querying with NaN when endOfDayTodayAtTz=%j",
    async (value) => {
      const res = await get(request(`tags=a&days=90&endOfDayTodayAtTz=${value}`));
      expect(res.status).toBe(200);
      const [, startTime, , days] = mockedCounts.mock.calls[0];
      expect(Number.isFinite(startTime)).toBe(true);
      // The fallback is the current time, not a prefix like 30 or 1.
      expect(startTime).toBeGreaterThan(1_000_000_000);
      expect(days).toBe(90);
    },
  );

  it.each(["abc", "30abc", "1.5"])("falls back to the default days when days=%j", async (value) => {
    const res = await get(request(`tags=a&days=${value}&endOfDayTodayAtTz=1788780000`));
    expect(res.status).toBe(200);
    expect(mockedCounts).toHaveBeenCalledWith(["a"], 1788780000 - 90 * 86400, 86400, 90);
  });

  it("accepts integer params surrounded by whitespace", async () => {
    const res = await get(request("tags=a&days=%2030%20&endOfDayTodayAtTz=%201788780000%20"));
    expect(res.status).toBe(200);
    expect(mockedCounts).toHaveBeenCalledWith(["a"], 1788780000 - 30 * 86400, 86400, 30);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IncidentForMonitorListWithComments, MaintenanceEventsMonitorList } from "$lib/server/types/db.js";

vi.mock("$lib/server/db/db.js", () => ({
  default: {
    getIncidentsForEventsByDateRange: vi.fn(),
    getMaintenanceEventsForEventsByDateRange: vi.fn(),
  },
}));

vi.mock("$lib/server/controllers/siteDataController.js", () => ({
  GetAllSiteData: vi.fn(),
}));

import db from "$lib/server/db/db.js";
import { GetAllSiteData } from "$lib/server/controllers/siteDataController.js";
import { renderRssFeedResponse } from "./rss";

const mockedDb = vi.mocked(db);
const now = Math.floor(Date.now() / 1000);

const maintenance = (overrides: Partial<MaintenanceEventsMonitorList>): MaintenanceEventsMonitorList => ({
  id: 1,
  title: "Database upgrade",
  status: "SCHEDULED",
  description: null,
  start_date_time: now - 3600,
  end_date_time: now,
  is_global: "NO",
  monitors: [],
  created_at: "",
  updated_at: "",
  ...overrides,
});

const incident = (overrides: Partial<IncidentForMonitorListWithComments>): IncidentForMonitorListWithComments => ({
  id: 1,
  title: "API errors",
  start_date_time: now - 7200,
  end_date_time: null,
  created_at: "",
  updated_at: "",
  status: "OPEN",
  state: "INVESTIGATING",
  monitors: [],
  comments: [],
  ...overrides,
});

const rootFeed = async (
  incidents: IncidentForMonitorListWithComments[],
  maintenances: MaintenanceEventsMonitorList[],
) => {
  mockedDb.getIncidentsForEventsByDateRange.mockResolvedValue(incidents);
  mockedDb.getMaintenanceEventsForEventsByDateRange.mockResolvedValue(maintenances);
  const res = await renderRssFeedResponse({ scope: { type: "page", pagePath: null }, feedPath: "/rss.xml" });
  return res.text();
};

const itemFor = (xml: string, guid: string) =>
  xml.split("<item>").find((item) => item.includes(`<guid isPermaLink="false">${guid}</guid>`));

beforeEach(() => {
  vi.mocked(GetAllSiteData).mockResolvedValue({
    siteURL: "https://status.example.com",
    siteName: "Example",
    globalPageVisibilitySettings: { forceExclusivity: false },
  } as Awaited<ReturnType<typeof GetAllSiteData>>);
});

describe("/rss.xml with forceExclusivity off", () => {
  it("lists a non-global maintenance whose monitors are all hidden, with no Affected line", async () => {
    const xml = await rootFeed([], [maintenance({ id: 7, is_global: "NO", monitors: [] })]);
    const item = itemFor(xml, "maintenance-7");
    expect(item).toBeDefined();
    expect(item).not.toContain("Affected:");
  });

  it("lists a global maintenance as affecting all monitors", async () => {
    const xml = await rootFeed([], [maintenance({ id: 8, is_global: "YES", monitors: [] })]);
    expect(itemFor(xml, "maintenance-8")).toContain("Affected: All monitors");
  });

  it("lists every incident, with or without visible monitors", async () => {
    const api = { monitor_tag: "api", monitor_impact: "DOWN", monitor_name: "API", monitor_image: null };
    const xml = await rootFeed([incident({ id: 3, monitors: [api] }), incident({ id: 4, monitors: [] })], []);
    expect(itemFor(xml, "incident-3")).toContain("Affected: API");
    expect(itemFor(xml, "incident-4")).not.toContain("Affected:");
  });
});

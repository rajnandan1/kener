import { vi } from "vitest";

// Shared stubs for SvelteKit runtime modules used by components under test.
// Values are minimal but realistic; individual tests can override with their
// own vi.mock(...) when they need different page data.
vi.mock("$app/state", () => ({
  page: {
    data: {
      siteStatusColors: { UP: "#22c55e", DOWN: "#ef4444", DEGRADED: "#eab308", MAINTENANCE: "#3b82f6" },
      dateAndTimeFormat: { dateOnly: "yyyy-MM-dd", timeOnly: "HH:mm" },
      nowAtTz: 1768478400, // 2026-01-15T12:00:00Z
    },
    url: new URL("http://localhost/"),
    params: {},
    route: { id: null },
    status: 200,
    error: null,
    form: null,
    state: {},
  },
}));

vi.mock("$app/paths", () => ({
  base: "",
  assets: "",
  resolve: (path: string) => path,
}));

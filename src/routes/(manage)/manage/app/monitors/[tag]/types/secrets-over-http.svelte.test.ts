import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
// svelte-codemirror-editor CSS fails to load under the tailwind vite plugin in browser tests
vi.mock("svelte-codemirror-editor", () => ({ default: () => {} }));
import MonitorApi from "./monitor-api.svelte";
import MonitorPrometheus from "./monitor-prometheus.svelte";

const WARNING = /sent in cleartext/g;
const warnings = (el: HTMLElement) => (el.textContent?.match(WARNING) ?? []).length;
const auth = [{ key: "Authorization", value: "Bearer $TOKEN" }];

const apiCases: Array<[string, Record<string, unknown>, number]> = [
  ["http url + $ header", { url: "http://a.internal/h", headers: auth }, 1],
  ["https url + $ header", { url: "https://a.example.com/h", headers: auth }, 0],
  ["http url, no $", { url: "http://a.internal/h", headers: [{ key: "X", value: "y" }] }, 0],
  ["http url + $ body", { url: "http://a.internal/h", body: '{"k":"$TOKEN"}' }, 1],
  ["http url + $ in url", { url: "http://a.internal/h?k=$TOKEN" }, 1],
  ["HTTP upper + $ header", { url: "HTTP://A.INTERNAL/h", headers: auth }, 1],
  ["https url + http proxy $", { url: "https://a.example.com", proxy: "http://u:$PASS@p:3128" }, 1],
  ["https url + https proxy $", { url: "https://a.example.com", proxy: "https://u:$PASS@p:3128" }, 0],
  ["https url + http proxy no $", { url: "https://a.example.com", proxy: "http://p:3128", headers: auth }, 0],
];

const promCases: Array<[string, Record<string, unknown>, number]> = [
  ["http url + $ header", { url: "http://prom.internal:9090", headers: auth }, 1],
  ["https url + $ header", { url: "https://prom.example.com", headers: auth }, 0],
  ["http url + $ only in query", { url: "http://prom.internal:9090", query: 'up{job="$JOB"}' }, 0],
  ["https url + http proxy $", { url: "https://prom.example.com", proxy: "http://u:$PASS@p:3128" }, 1],
  ["http url, no $", { url: "http://prom.internal:9090" }, 0],
];

describe("secret-over-http warning count", () => {
  it.each(apiCases)("API: %s", async (_name, td, expected) => {
    const data = $state({ ...td });
    const screen = await render(MonitorApi, { data });
    expect(warnings(screen.container)).toBe(expected);
  });

  it.each(promCases)("Prometheus: %s", async (_name, td, expected) => {
    const data = $state({ ...td });
    const screen = await render(MonitorPrometheus, { data });
    expect(warnings(screen.container)).toBe(expected);
  });

  it("API: typing an http url shows the warning, https hides it", async () => {
    const data = $state({ url: "https://a.example.com", headers: auth });
    const screen = await render(MonitorApi, { data });
    expect(warnings(screen.container)).toBe(0);
    await screen.getByLabelText(/^URL/).fill("http://a.internal");
    await expect.poll(() => warnings(screen.container)).toBe(1);
    await screen.getByLabelText(/^URL/).fill("https://a.internal");
    await expect.poll(() => warnings(screen.container)).toBe(0);
  });
});

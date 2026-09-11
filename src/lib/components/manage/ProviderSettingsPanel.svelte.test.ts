import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import ProviderSettingsPanel from "./ProviderSettingsPanel.svelte";
import type { ProviderDefinition } from "$lib/client/types/provider-settings.js";

vi.mock("svelte-sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { toast } from "svelte-sonner";

const singleProvider: ProviderDefinition[] = [
  {
    label: "Test Provider",
    key: "test.provider",
    isEnabled: false,
    activeInSite: false,
    requirements: [
      { label: "Site Key", type: "text", placeholder: "", required: true, value: "" },
      { label: "Secret Key", type: "password", placeholder: "", required: true, value: "" }
    ]
  }
];

describe("ProviderSettingsPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("uses a whitespace-free HTML id for each requirement field instead of the raw label text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({}) }));

    const screen = await render(ProviderSettingsPanel, {
      initialProviders: singleProvider,
      description: "test"
    });
    await expect.element(screen.getByText("Add details for your Test Provider account")).toBeInTheDocument();

    // "Site Key" / "Secret Key" both contain a space, which is invalid in
    // an HTML id -- assert on the actual attribute value directly, since
    // getByLabelText's real-browser lookup turned out to tolerate this
    // (a literal-string for/id match still "works" in Chromium even
    // though the id itself is not spec-valid).
    const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) {
      expect(input.id).not.toMatch(/\s/);
      expect(input.id.length).toBeGreaterThan(0);
    }
  });

  it("surfaces a server-reported load error via toast instead of silently showing empty defaults", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ error: "db unavailable" }) }));

    await render(ProviderSettingsPanel, { initialProviders: singleProvider, description: "test" });

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("db unavailable"));
  });

  it("still initializes the selected provider (form area) even when the load request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const screen = await render(ProviderSettingsPanel, { initialProviders: singleProvider, description: "test" });

    await expect.element(screen.getByText("Add details for your Test Provider account")).toBeInTheDocument();
  });

  it("blocks saving a single-active provider if the initial load never succeeded, to avoid clobbering other providers' stored credentials", async () => {
    const twoProviders: ProviderDefinition[] = [
      { label: "Provider A", key: "test.a", isEnabled: true, activeInSite: false, requirements: [] },
      { label: "Provider B", key: "test.b", isEnabled: false, activeInSite: false, requirements: [] }
    ];

    const storeSiteDataCalls: unknown[] = [];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (body.action === "getAllSiteData") {
        throw new Error("network down");
      }
      if (body.action === "storeSiteData") {
        storeSiteDataCalls.push(body.data);
        return { json: async () => ({}) } as Response;
      }
      throw new Error(`Unhandled action in test: ${body.action}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const screen = await render(ProviderSettingsPanel, {
      initialProviders: twoProviders,
      description: "test",
      enforceSingleActive: true
    });

    await expect.element(screen.getByText("Add details for your Provider A account")).toBeInTheDocument();
    await screen.getByRole("button", { name: /save changes/i }).click();

    await new Promise((r) => setTimeout(r, 50));
    expect(storeSiteDataCalls.length).toBe(0);
    expect(toast.error).toHaveBeenCalled();
  });
});

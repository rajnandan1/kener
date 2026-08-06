import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import SubscribeMenu from "./SubscribeMenu.svelte";

function mockFetchByUrl(handlers: Record<string, () => Promise<unknown>>) {
  return vi.fn(async (url: string) => {
    const match = Object.keys(handlers).find((key) => url.includes(key));
    if (!match) throw new Error(`Unhandled fetch in test: ${url}`);
    const body = await handlers[match]();
    return { ok: true, json: async () => body } as Response;
  });
}

describe("SubscribeMenu — captcha gating", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("disables Continue until the captcha reports a token when a provider is configured", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchByUrl({ "captcha-config.json": async () => ({ provider: "turnstile", siteKey: "site-key-123" }) }),
    );

    const screen = await render(SubscribeMenu, {});
    await screen.getByRole("button", { name: "Subscribe" }).click();

    await expect.element(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("leaves Continue enabled when no captcha provider is configured", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchByUrl({ "captcha-config.json": async () => ({ provider: null, siteKey: null }) }),
    );

    const screen = await render(SubscribeMenu, {});
    await screen.getByRole("button", { name: "Subscribe" }).click();

    await expect.element(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
  });

  it("resets the captcha widget after a rejected token so the user can solve it again", async () => {
    const resetSpy = vi.fn();
    const renderSpy = vi.fn((_container: HTMLElement, opts: { callback: (t: string) => void }) => {
      opts.callback("solved-token-1");
      return "widget-id-1";
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).turnstile = { render: renderSpy, reset: resetSpy };

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("captcha-config.json")) {
        return { ok: true, json: async () => ({ provider: "turnstile", siteKey: "site-key-123" }) } as Response;
      }
      if (url.includes("dashboard-apis/subscription")) {
        return { ok: false, json: async () => ({ message: "Captcha verification failed" }) } as Response;
      }
      throw new Error(`Unhandled fetch in test: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const screen = await render(SubscribeMenu, {});
    await screen.getByRole("button", { name: "Subscribe" }).click();

    const continueButton = screen.getByRole("button", { name: "Continue" });
    // Widget "solves" immediately per the renderSpy mock above.
    await expect.element(continueButton).not.toBeDisabled();

    await screen.getByLabelText("Email address").fill("test@example.com");
    await continueButton.click();

    await vi.waitFor(() => expect(resetSpy).toHaveBeenCalledWith("widget-id-1"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).turnstile;
  });
});

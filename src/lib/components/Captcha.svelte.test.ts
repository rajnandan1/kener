import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import Captcha from "./Captcha.svelte";

describe("Captcha", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing and reports not-required when no provider is configured", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ provider: null, siteKey: null }) }));
    const onReady = vi.fn();
    const onVerify = vi.fn();

    const screen = await render(Captcha, { onVerify, onReady });
    await expect.element(screen.getByTestId("captcha-widget")).not.toBeInTheDocument();

    expect(onReady).toHaveBeenCalledWith(false);
    expect(onVerify).not.toHaveBeenCalled();
  });

  it("renders the widget container and reports required when a provider is configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ provider: "turnstile", siteKey: "site-key-123" }) }),
    );
    const onReady = vi.fn();
    const onVerify = vi.fn();

    const screen = await render(Captcha, { onVerify, onReady });
    await expect.element(screen.getByTestId("captcha-widget")).toBeInTheDocument();

    expect(onReady).toHaveBeenCalledWith(true);
  });
});

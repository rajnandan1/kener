import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import Captcha, { loadScript } from "./Captcha.svelte";

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

  it("does not walk back the required state when the provider SDK fails after being detected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ provider: "hcaptcha", siteKey: "site-key-123" }) }),
    );

    // Pre-seed the script tag so loadScript finds it already present (no
    // real network call needed), then fire its load event shortly after —
    // loadScript now always waits for a real load/error event rather than
    // assuming presence means "already loaded" (see the concurrent-load
    // test below), so this simulates it finishing normally. Then make the
    // provider global's render() throw, simulating the SDK failing to
    // initialize after the script itself loaded.
    const script = document.createElement("script");
    script.src = "https://js.hcaptcha.com/1/api.js";
    document.head.appendChild(script);
    setTimeout(() => script.dispatchEvent(new Event("load")), 10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).hcaptcha = {
      render: () => {
        throw new Error("provider SDK init failed");
      },
    };

    const onReady = vi.fn();
    await render(Captcha, { onVerify: vi.fn(), onReady });

    await vi.waitFor(() => expect(onReady).toHaveBeenCalledWith(true));
    // Give the (failing) render attempt a chance to run and hit the catch
    // block before asserting it never reported not-required afterwards.
    await new Promise((r) => setTimeout(r, 50));
    expect(onReady).not.toHaveBeenCalledWith(false);

    document.head.removeChild(script);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).hcaptcha;
  });

});

describe("loadScript", () => {
  const src = "https://example.com/captcha-test-script.js";

  afterEach(() => {
    document.head.querySelectorAll(`script[src="${src}"]`).forEach((el) => el.remove());
  });

  it("shares one in-flight load across concurrent callers instead of resolving early", async () => {
    const onload1 = vi.fn();
    const onload2 = vi.fn();

    const p1 = loadScript(src).then(onload1);
    const p2 = loadScript(src).then(onload2);

    const scripts = document.head.querySelectorAll(`script[src="${src}"]`);
    expect(scripts.length).toBe(1);

    // Neither caller should resolve just because a second call saw the
    // first call's still-loading <script> tag.
    await Promise.resolve();
    await Promise.resolve();
    expect(onload1).not.toHaveBeenCalled();
    expect(onload2).not.toHaveBeenCalled();

    scripts[0].dispatchEvent(new Event("load"));
    await Promise.all([p1, p2]);

    expect(onload1).toHaveBeenCalled();
    expect(onload2).toHaveBeenCalled();
  });
});

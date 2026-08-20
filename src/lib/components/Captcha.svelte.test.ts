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

  it("removes a failed script tag so a retry creates a fresh one instead of hanging on stale listeners", async () => {
    // Own URL, distinct from `src` above -- the module-level cache is a
    // singleton shared across tests in this file, so reusing `src` here
    // would just return the already-resolved promise the earlier test left
    // behind instead of exercising a fresh load.
    const failSrc = "https://example.com/captcha-test-script-retry.js";

    const failedLoad = loadScript(failSrc);
    const scriptsAfterFirstAttempt = document.head.querySelectorAll(`script[src="${failSrc}"]`);
    expect(scriptsAfterFirstAttempt.length).toBe(1);

    scriptsAfterFirstAttempt[0].dispatchEvent(new Event("error"));
    await expect(failedLoad).rejects.toThrow();

    // The failed tag must be gone -- otherwise a retry would find a dead
    // script whose error event already fired (and never will again),
    // attach listeners that never trigger, and hang forever.
    expect(document.head.querySelectorAll(`script[src="${failSrc}"]`).length).toBe(0);

    const retryLoad = loadScript(failSrc);
    const scriptsAfterRetry = document.head.querySelectorAll(`script[src="${failSrc}"]`);
    expect(scriptsAfterRetry.length).toBe(1);

    scriptsAfterRetry[0].dispatchEvent(new Event("load"));
    await expect(retryLoad).resolves.toBeUndefined();

    document.head.querySelectorAll(`script[src="${failSrc}"]`).forEach((el) => el.remove());
  });

  it("resolves immediately when it finds a script tag already marked as loaded", async () => {
    // Simulates the module-level cache having been reset (e.g. a dev-mode
    // hot reload) while a previously-loaded <script> tag survives in the
    // DOM -- loadScript must recognize it's already done rather than
    // attaching listeners and waiting on a load event that already fired.
    const preloadedSrc = "https://example.com/captcha-test-script-preloaded.js";
    const preloadedScript = document.createElement("script");
    preloadedScript.src = preloadedSrc;
    preloadedScript.setAttribute("data-kener-script-loaded", "true");
    document.head.appendChild(preloadedScript);

    const onload = vi.fn();
    await loadScript(preloadedSrc).then(onload);

    expect(onload).toHaveBeenCalled();
    expect(document.head.querySelectorAll(`script[src="${preloadedSrc}"]`).length).toBe(1);

    preloadedScript.remove();
  });

  it("replaces a script tag already marked as failed instead of waiting on a dead element", async () => {
    const preDeadSrc = "https://example.com/captcha-test-script-predead.js";
    const deadScript = document.createElement("script");
    deadScript.src = preDeadSrc;
    deadScript.setAttribute("data-kener-script-failed", "true");
    document.head.appendChild(deadScript);

    const loadPromise = loadScript(preDeadSrc);

    const scripts = document.head.querySelectorAll(`script[src="${preDeadSrc}"]`);
    expect(scripts.length).toBe(1);
    expect(scripts[0]).not.toBe(deadScript);

    scripts[0].dispatchEvent(new Event("load"));
    await expect(loadPromise).resolves.toBeUndefined();

    document.head.querySelectorAll(`script[src="${preDeadSrc}"]`).forEach((el) => el.remove());
  });
});

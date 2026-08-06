<script module lang="ts">
  // Module scope (shared across every Captcha instance, unlike a plain
  // const in the instance script below) — so if two instances ever load
  // the same provider script concurrently, the second one awaits the
  // first's in-flight load instead of finding the <script> tag already
  // present and resolving immediately before it's actually finished.
  const scriptLoadPromises = new Map<string, Promise<void>>();

  export function loadScript(src: string): Promise<void> {
    const existing = scriptLoadPromises.get(src);
    if (existing) {
      return existing;
    }

    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        existingScript.addEventListener("load", () => resolvePromise(), { once: true });
        existingScript.addEventListener(
          "error",
          () => rejectPromise(new Error(`Failed to load ${src}`)),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolvePromise();
      script.onerror = () => rejectPromise(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    }).catch((err) => {
      // Don't cache a permanent failure — a transient network blip
      // shouldn't block every future attempt to load this script.
      scriptLoadPromises.delete(src);
      throw err;
    });

    scriptLoadPromises.set(src, promise);
    return promise;
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  interface Props {
    onVerify: (token: string) => void;
    onReady?: (required: boolean) => void;
  }

  let { onVerify, onReady }: Props = $props();

  type ProviderName = "hcaptcha" | "recaptcha" | "turnstile";

  const PROVIDER_SCRIPT: Record<ProviderName, string> = {
    hcaptcha: "https://js.hcaptcha.com/1/api.js",
    recaptcha: "https://www.google.com/recaptcha/api.js",
    turnstile: "https://challenges.cloudflare.com/turnstile/v0/api.js"
  };

  // All three providers' checkbox-widget SDKs converge on the same
  // `global.render(container, { sitekey, callback })` shape, so one code
  // path covers all of them instead of three near-duplicate branches.
  const PROVIDER_GLOBAL: Record<ProviderName, string> = {
    hcaptcha: "hcaptcha",
    recaptcha: "grecaptcha",
    turnstile: "turnstile"
  };

  let provider = $state<ProviderName | null>(null);
  let siteKey = $state<string | null>(null);
  let container: HTMLDivElement | undefined = $state();
  let widgetId: string | number | undefined;

  // Resets the rendered widget so the user can solve it again, e.g. after
  // the server rejects a token (expired/already used). Exposed to the
  // parent via `bind:this`.
  export function reset() {
    if (!provider || widgetId === undefined) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const global = (window as any)[PROVIDER_GLOBAL[provider]];
    global?.reset?.(widgetId);
  }

  onMount(async () => {
    // Tracks whether we've already told the parent a provider is required,
    // so a later failure (script load, SDK init) never walks that back —
    // the server enforces the check regardless, so the button should stay
    // disabled rather than falsely suggesting the form can be submitted.
    let providerConfirmed = false;

    try {
      const response = await fetch(clientResolver(resolve, "/captcha-config.json"));
      const config = await response.json();

      if (!config.provider || !config.siteKey) {
        onReady?.(false);
        return;
      }

      provider = config.provider as ProviderName;
      siteKey = config.siteKey;
      providerConfirmed = true;
      onReady?.(true);

      await loadScript(PROVIDER_SCRIPT[provider]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const global = (window as any)[PROVIDER_GLOBAL[provider]];
      const renderWidget = () => {
        if (container && global?.render) {
          widgetId = global.render(container, {
            sitekey: siteKey,
            callback: (token: string) => onVerify(token)
          });
        }
      };

      // reCAPTCHA (and hCaptcha) attach `.render` asynchronously after the
      // script's onload fires — calling render() immediately can hit
      // "grecaptcha.render is not a function". Their SDKs expose `.ready()`
      // to gate on; Turnstile has no such method, so it just falls through
      // to an immediate render as before.
      if (global?.ready) {
        global.ready(renderWidget);
      } else {
        renderWidget();
      }
    } catch (err) {
      console.error("Failed to load captcha widget", err);
      if (!providerConfirmed) {
        onReady?.(false);
      }
    }
  });
</script>

{#if provider}
  <div bind:this={container} data-testid="captcha-widget"></div>
{/if}

<style>
  /*
   * The subscribe Dialog sets `pointer-events: none` on <body> while open
   * (its scroll-lock). Google reCAPTCHA's expanded image-challenge (and
   * similarly hCaptcha/Turnstile challenge overlays) are injected as direct
   * children of <body> by the provider's own script, so they inherit that
   * `none` and become click-through — clicks meant for the challenge fall
   * through to whatever's underneath with pointer-events re-enabled, which
   * is our own dialog. `:has()` re-arms pointer-events on the iframe and
   * its whole wrapper chain regardless of how deep the provider nests it.
   */
  :global(body *:has(> iframe[src*="recaptcha"])),
  :global(body *:has(> iframe[src*="hcaptcha.com"])),
  :global(body *:has(> iframe[src*="challenges.cloudflare.com"])),
  :global(iframe[src*="recaptcha"]),
  :global(iframe[src*="hcaptcha.com"]),
  :global(iframe[src*="challenges.cloudflare.com"]) {
    pointer-events: auto !important;
  }
</style>

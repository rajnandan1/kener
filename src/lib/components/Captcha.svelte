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

  function loadScript(src: string): Promise<void> {
    return new Promise((resolvePromise, rejectPromise) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolvePromise();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolvePromise();
      script.onerror = () => rejectPromise(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  onMount(async () => {
    try {
      const response = await fetch(clientResolver(resolve, "/captcha-config.json"));
      const config = await response.json();

      if (!config.provider || !config.siteKey) {
        onReady?.(false);
        return;
      }

      provider = config.provider as ProviderName;
      siteKey = config.siteKey;
      onReady?.(true);

      await loadScript(PROVIDER_SCRIPT[provider]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const global = (window as any)[PROVIDER_GLOBAL[provider]];
      const renderWidget = () => {
        if (container && global?.render) {
          global.render(container, {
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
      onReady?.(false);
    }
  });
</script>

{#if provider}
  <div bind:this={container} data-testid="captcha-widget"></div>
{/if}

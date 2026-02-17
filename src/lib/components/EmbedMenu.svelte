<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import CopyButton from "$lib/components/CopyButton.svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { t } from "$lib/stores/i18n";
  import { mode } from "mode-watcher";
  import trackEvent from "$lib/beacon";

  import Code from "@lucide/svelte/icons/code";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import Copy from "@lucide/svelte/icons/clipboard";
  import { Check } from "@lucide/svelte";

  interface Props {
    open: boolean;
    monitorTag: string;
    protocol: string;
    domain: string;
  }

  let { open = $bindable(false), monitorTag, protocol, domain }: Props = $props();

  let monitorTheme = $state<"light" | "dark">(mode.current === "dark" ? "dark" : "light");
  let monitorEmbedType = $state<"script" | "iframe">("iframe");

  let latencyTheme = $state<"light" | "dark">(mode.current === "dark" ? "dark" : "light");
  let latencyEmbedType = $state<"script" | "iframe">("iframe");

  function setMonitorTheme(theme: "light" | "dark") {
    monitorTheme = theme;
    trackEvent("embed_theme_changed", { target: "monitor", theme, monitorTag });
  }

  function setMonitorEmbedType(type: "script" | "iframe") {
    monitorEmbedType = type;
    trackEvent("embed_format_changed", { target: "monitor", format: type, monitorTag });
  }

  function setLatencyTheme(theme: "light" | "dark") {
    latencyTheme = theme;
    trackEvent("embed_theme_changed", { target: "latency", theme, monitorTag });
  }

  function setLatencyEmbedType(type: "script" | "iframe") {
    latencyEmbedType = type;
    trackEvent("embed_format_changed", { target: "latency", format: type, monitorTag });
  }

  function handleEmbedCopy(target: "monitor" | "latency") {
    const theme = target === "monitor" ? monitorTheme : latencyTheme;
    const format = target === "monitor" ? monitorEmbedType : latencyEmbedType;
    trackEvent("embed_code_copied", { target, theme, format, monitorTag });
  }

  // Monitor Embed URL
  const monitorEmbedUrl = $derived(() => {
    if (!protocol || !domain) return "";
    return `${protocol}//${domain}` + clientResolver(resolve, `/embed/monitor-${monitorTag}`);
  });

  // Monitor Preview URL
  const monitorPreviewUrl = $derived(() => {
    const url = monitorEmbedUrl();
    if (!url) return "";
    return `${url}`;
  });

  // Monitor Embed code
  const monitorEmbedCode = $derived(() => {
    if (!protocol || !domain) return "";
    const url = monitorEmbedUrl();
    const fullUrl = `${url}?theme=${monitorTheme}`;

    if (monitorEmbedType === "iframe") {
      return `<iframe src="${fullUrl}" width="100%" height="200" allowfullscreen="allowfullscreen" allowpaymentrequest frameborder="0"></iframe>`;
    }
    return `<script src="${url}/js?theme=${monitorTheme}&monitor=${url}"><` + "/script>";
  });

  // Latency Embed URL
  const latencyEmbedUrl = $derived(() => {
    if (!protocol || !domain) return "";
    return `${protocol}//${domain}` + clientResolver(resolve, `/embed/latency-${monitorTag}`);
  });

  // Latency Preview URL
  const latencyPreviewUrl = $derived(() => {
    const url = latencyEmbedUrl();
    if (!url) return "";
    return `${url}`;
  });

  // Latency Embed code
  const latencyEmbedCode = $derived(() => {
    if (!protocol || !domain) return "";
    const url = latencyEmbedUrl();
    const fullUrl = `${url}?theme=${latencyTheme}`;

    if (latencyEmbedType === "iframe") {
      return `<iframe src="${fullUrl}" width="100%" height="200" allowfullscreen="allowfullscreen" allowpaymentrequest frameborder="0"></iframe>`;
    }
    return `<script src="${url}/js?theme=${latencyTheme}&monitor=${url}"><` + "/script>";
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Overlay class="backdrop-blur-[2px]" />
  <Dialog.Content class="max-w-2xl rounded-3xl">
    <Dialog.Header>
      <Dialog.Title>{$t("Embed Monitor")}</Dialog.Title>
      <Dialog.Description>{$t("Embed this monitor in your website or app")}</Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-4">
      <!-- Status Embed -->
      <div>
        <Label class="mb-2 block text-sm font-semibold">{$t("Status Embed")}</Label>
        <div class="flex flex-col gap-3 rounded-3xl border p-4">
          <iframe title="status embed preview" src={monitorPreviewUrl()} width="100%" height="70" frameborder="0"
          ></iframe>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-2">
                <ButtonGroup.Root class="rounded-btn-grp">
                  <Button variant="outline" size="sm" onclick={() => setMonitorTheme("light")}>
                    {#if monitorTheme === "light"}
                      <Check class="text-accent-foreground h-3 w-3" />
                    {/if}
                    {$t("Light")}
                  </Button>
                  <Button variant="outline" size="sm" onclick={() => setMonitorTheme("dark")}>
                    {#if monitorTheme === "dark"}
                      <Check class="text-accent-foreground h-3 w-3" />
                    {/if}
                    {$t("Dark")}
                  </Button>
                </ButtonGroup.Root>
              </div>
              <div class="flex items-center gap-2">
                <ButtonGroup.Root class="rounded-btn-grp">
                  <Button variant="outline" size="sm" onclick={() => setMonitorEmbedType("iframe")}>
                    {#if monitorEmbedType === "iframe"}
                      <Check class="text-accent-foreground h-3 w-3" />
                    {/if}

                    {$t("iFrame")}
                  </Button>
                  <Button variant="outline" size="sm" onclick={() => setMonitorEmbedType("script")}>
                    {#if monitorEmbedType === "script"}
                      <Check class="text-accent-foreground h-3 w-3" />
                    {/if}
                    {$t("Script")}
                  </Button>
                </ButtonGroup.Root>
              </div>
            </div>
            <CopyButton
              variant="outline"
              class="rounded-btn"
              size="icon-sm"
              text={monitorEmbedCode()}
              onclick={() => handleEmbedCopy("monitor")}
            >
              <Copy />
            </CopyButton>
          </div>
        </div>
      </div>

      <!-- Latency Embed -->
      <div>
        <Label class="mb-2 block text-sm font-semibold">{$t("Latency Embed")}</Label>
        <div class="flex flex-col gap-3 rounded-3xl border p-4">
          <iframe title="latency embed preview" src={latencyPreviewUrl()} width="100%" height="200" frameborder="0"
          ></iframe>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-2">
                <ButtonGroup.Root class="rounded-btn-grp">
                  <Button variant="outline" size="sm" onclick={() => setLatencyTheme("light")}>
                    {#if latencyTheme === "light"}
                      <Check class="text-accent-foreground h-3 w-3" />
                    {/if}
                    {$t("Light")}
                  </Button>
                  <Button variant="outline" size="sm" onclick={() => setLatencyTheme("dark")}>
                    {#if latencyTheme === "dark"}
                      <Check class="text-accent-foreground h-3 w-3" />
                    {/if}
                    {$t("Dark")}
                  </Button>
                </ButtonGroup.Root>
              </div>
              <div class="flex items-center gap-2">
                <ButtonGroup.Root class="rounded-btn-grp">
                  <Button variant="outline" size="sm" onclick={() => setLatencyEmbedType("iframe")}>
                    {#if latencyEmbedType === "iframe"}
                      <Check class="text-accent-foreground h-3 w-3" />
                    {/if}
                    {$t("iFrame")}
                  </Button>
                  <Button variant="outline" size="sm" onclick={() => setLatencyEmbedType("script")}>
                    {#if latencyEmbedType === "script"}
                      <Check class="text-accent-foreground h-3 w-3" />
                    {/if}
                    {$t("Script")}
                  </Button>
                </ButtonGroup.Root>
              </div>
            </div>
            <CopyButton
              variant="outline"
              class="rounded-btn"
              size="icon-sm"
              text={latencyEmbedCode()}
              onclick={() => handleEmbedCopy("latency")}
            >
              <Copy />
            </CopyButton>
          </div>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import CopyButton from "$lib/components/CopyButton.svelte";
  import { resolve } from "$app/paths";

  import Code from "@lucide/svelte/icons/code";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import Copy from "@lucide/svelte/icons/copy";

  interface Props {
    open: boolean;
    monitorTag: string;
    protocol: string;
    domain: string;
  }

  const base = resolve("/");

  let { open = $bindable(false), monitorTag, protocol, domain }: Props = $props();

  let monitorTheme = $state<"light" | "dark">("light");
  let monitorEmbedType = $state<"script" | "iframe">("iframe");

  let latencyTheme = $state<"light" | "dark">("light");
  let latencyEmbedType = $state<"script" | "iframe">("iframe");

  // Monitor Embed URL
  const monitorEmbedUrl = $derived(() => {
    if (!protocol || !domain) return "";
    return `${protocol}//${domain}${base}embed/monitor-${monitorTag}`;
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
    return `${protocol}//${domain}${base}embed/latency-${monitorTag}`;
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
  <Dialog.Content class="min-w-157.5 rounded-3xl">
    <Dialog.Header>
      <Dialog.Title>Embed Monitor</Dialog.Title>
      <Dialog.Description>Embed this monitor in your website or app</Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-4">
      <!-- Status Embed -->
      <div>
        <Label class="mb-2 block text-sm font-semibold">Status Embed</Label>
        <div class="flex flex-col gap-4 rounded-3xl border p-4">
          <iframe title="status embed preview" src={monitorPreviewUrl()} width="100%" height="70" frameborder="0"
          ></iframe>
          <div class="flex items-center justify-between gap-4 p-2">
            <div>
              <Label class="mb-2 block text-xs">Theme</Label>
              <div class="flex gap-2">
                <Button
                  variant={monitorTheme === "light" ? "default" : "outline"}
                  size="sm"
                  onclick={() => (monitorTheme = "light")}
                >
                  Light
                </Button>
                <Button
                  variant={monitorTheme === "dark" ? "default" : "outline"}
                  size="sm"
                  onclick={() => (monitorTheme = "dark")}
                >
                  Dark
                </Button>
              </div>
            </div>
            <div>
              <Label class="mb-2 block text-xs">Format</Label>
              <div class="flex gap-2">
                <Button
                  variant={monitorEmbedType === "iframe" ? "default" : "outline"}
                  size="sm"
                  onclick={() => (monitorEmbedType = "iframe")}
                >
                  iFrame
                </Button>
                <Button
                  variant={monitorEmbedType === "script" ? "default" : "outline"}
                  size="sm"
                  onclick={() => (monitorEmbedType = "script")}
                >
                  Script
                </Button>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <CopyButton variant="ghost" size="icon-sm" text={monitorEmbedCode()} class="rounded-btn">
                <Copy class="h-3 w-3" />
              </CopyButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Latency Embed -->
      <div>
        <Label class="mb-2 block text-sm font-semibold">Latency Embed</Label>
        <div class="flex flex-col gap-4 rounded-3xl border p-4">
          <iframe title="latency embed preview" src={latencyPreviewUrl()} width="100%" height="200" frameborder="0"
          ></iframe>
          <div class="flex items-end justify-between gap-4 p-2">
            <div>
              <Label class="mb-2 block text-xs">Theme</Label>
              <div class="flex gap-2">
                <Button
                  variant={latencyTheme === "light" ? "default" : "outline"}
                  size="sm"
                  onclick={() => (latencyTheme = "light")}
                >
                  Light
                </Button>
                <Button
                  variant={latencyTheme === "dark" ? "default" : "outline"}
                  size="sm"
                  onclick={() => (latencyTheme = "dark")}
                >
                  Dark
                </Button>
              </div>
            </div>
            <div class="">
              <Label class="mb-2 block text-xs">Format</Label>
              <div class="flex gap-2">
                <Button
                  variant={latencyEmbedType === "iframe" ? "default" : "outline"}
                  size="sm"
                  onclick={() => (latencyEmbedType = "iframe")}
                >
                  iFrame
                </Button>
                <Button
                  variant={latencyEmbedType === "script" ? "default" : "outline"}
                  size="sm"
                  onclick={() => (latencyEmbedType = "script")}
                >
                  Script
                </Button>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <CopyButton variant="ghost" size="icon-sm" text={latencyEmbedCode()} class="rounded-btn">
                <Copy class="h-3 w-3" />
              </CopyButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

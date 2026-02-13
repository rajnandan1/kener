<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import CopyButton from "$lib/components/CopyButton.svelte";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  // Monitors state
  let monitors = $state<MonitorRecord[]>([]);
  let loading = $state(true);
  let domain = $state("");
  let protocol = $state("");

  // Embed configuration
  let embedConfig = $state({
    tag: "",
    embedType: "status" as "status" | "latency",
    theme: "light" as "light" | "dark",
    format: "iframe" as "iframe" | "script",
    days: 90,
    height: 200,
    metric: "average" as "average" | "maximum" | "minimum"
  });

  // Preview key for refreshing
  let previewKey = $state(0);

  // Days presets
  const daysPresets = [
    { label: "7 Days", value: 7 },
    { label: "30 Days", value: 30 },
    { label: "60 Days", value: 60 },
    { label: "90 Days", value: 90 }
  ];

  // Height presets
  const heightPresets = [
    { label: "100px", value: 100 },
    { label: "150px", value: 150 },
    { label: "200px", value: 200 },
    { label: "250px", value: 250 },
    { label: "300px", value: 300 }
  ];

  // Build the embed URL
  const embedUrl = $derived.by(() => {
    if (!embedConfig.tag || !protocol || !domain) return "";

    const embedPath =
      embedConfig.embedType === "status" ? `/embed/monitor-${embedConfig.tag}` : `/embed/latency-${embedConfig.tag}`;

    return `${protocol}//${domain}` + clientResolver(resolve, embedPath);
  });

  // Build the preview URL with parameters
  const previewUrl = $derived.by(() => {
    if (!embedUrl) return "";

    const params = new URLSearchParams();
    params.set("theme", embedConfig.theme);
    params.set("days", embedConfig.days.toString());

    if (embedConfig.embedType === "latency") {
      params.set("height", embedConfig.height.toString());
      if (embedConfig.metric !== "average") {
        params.set("metric", embedConfig.metric);
      }
    }

    return `${embedUrl}?${params.toString()}`;
  });

  // Build the embed code
  const embedCode = $derived.by(() => {
    if (!embedUrl) return "";

    const params = new URLSearchParams();
    params.set("theme", embedConfig.theme);
    params.set("days", embedConfig.days.toString());

    if (embedConfig.embedType === "latency") {
      params.set("height", embedConfig.height.toString());
      if (embedConfig.metric !== "average") {
        params.set("metric", embedConfig.metric);
      }
    }

    const fullUrl = `${embedUrl}?${params.toString()}`;
    const iframeHeight = embedConfig.embedType === "status" ? 70 : embedConfig.height + 50;

    if (embedConfig.format === "iframe") {
      return `<iframe src="${fullUrl}" width="100%" height="${iframeHeight}" frameborder="0" allowfullscreen="allowfullscreen"></iframe>`;
    }
    return (
      `<script src="${embedUrl}/js?theme=${embedConfig.theme}&days=${embedConfig.days}${embedConfig.embedType === "latency" ? `&height=${embedConfig.height}${embedConfig.metric !== "average" ? `&metric=${embedConfig.metric}` : ""}` : ""}"><` +
      "/script>"
    );
  });

  // HTML snippet
  const htmlSnippet = $derived.by(() => {
    return embedCode;
  });

  async function fetchMonitors() {
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getMonitors", data: { status: "ACTIVE" } })
      });
      const result = await response.json();
      if (!result.error) {
        monitors = result;
        // Set default tag to first monitor
        if (monitors.length > 0) {
          embedConfig.tag = monitors[0].tag;
        }
      }
    } catch {
      // Ignore errors
    }
  }

  function refreshPreview() {
    previewKey++;
  }

  onMount(async () => {
    protocol = window.location.protocol;
    domain = window.location.host;
    loading = true;
    await fetchMonitors();
    loading = false;
  });
</script>

<div class="flex w-full flex-col gap-4 p-4">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="size-8" />
    </div>
  {:else}
    <div class="flex flex-col gap-6">
      <Card.Root>
        <Card.Header>
          <Card.Title>Embed Generator</Card.Title>
          <Card.Description>
            Create customizable embeds to display the status or latency of your monitors on external websites
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-2 gap-4">
            <!-- Configuration Panel -->
            <div class="flex flex-col gap-4 border-r pr-4">
              <!-- Monitor Selection -->
              <div class="flex flex-col gap-2">
                <Label for="monitor-select">Monitor</Label>
                <Select.Root
                  type="single"
                  value={embedConfig.tag}
                  onValueChange={(v) => {
                    if (v) embedConfig.tag = v;
                  }}
                >
                  <Select.Trigger id="monitor-select" class="w-full">
                    {monitors.find((m) => m.tag === embedConfig.tag)?.name || "Select a monitor"}
                  </Select.Trigger>
                  <Select.Content>
                    {#each monitors as monitor (monitor.tag)}
                      <Select.Item value={monitor.tag}>{monitor.name}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Embed Type -->
              <div class="flex flex-col gap-2">
                <Label for="embed-type">Embed Type</Label>
                <Select.Root
                  type="single"
                  value={embedConfig.embedType}
                  onValueChange={(v) => {
                    if (v) embedConfig.embedType = v as "status" | "latency";
                  }}
                >
                  <Select.Trigger id="embed-type" class="w-full capitalize">
                    {embedConfig.embedType === "status" ? "Status Bar" : "Latency Chart"}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="status">Status Bar</Select.Item>
                    <Select.Item value="latency">Latency Chart</Select.Item>
                  </Select.Content>
                </Select.Root>
                <p class="text-muted-foreground text-xs">
                  {#if embedConfig.embedType === "status"}
                    Shows a status bar with uptime percentage and daily status indicators
                  {:else}
                    Shows a latency trend chart over time
                  {/if}
                </p>
              </div>

              <!-- Theme -->
              <div class="flex flex-col gap-2">
                <Label>Theme</Label>
                <div class="flex gap-2">
                  <Button
                    variant={embedConfig.theme === "light" ? "default" : "outline"}
                    size="sm"
                    onclick={() => (embedConfig.theme = "light")}
                  >
                    Light
                  </Button>
                  <Button
                    variant={embedConfig.theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onclick={() => (embedConfig.theme = "dark")}
                  >
                    Dark
                  </Button>
                </div>
              </div>

              <!-- Days -->
              <div class="flex flex-col gap-2">
                <Label for="days-select">Time Period</Label>
                <Select.Root
                  type="single"
                  value={embedConfig.days.toString()}
                  onValueChange={(v) => {
                    if (v) embedConfig.days = parseInt(v);
                  }}
                >
                  <Select.Trigger id="days-select" class="w-full">
                    {daysPresets.find((d) => d.value === embedConfig.days)?.label || `${embedConfig.days} Days`}
                  </Select.Trigger>
                  <Select.Content>
                    {#each daysPresets as preset (preset.value)}
                      <Select.Item value={preset.value.toString()}>{preset.label}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Height (only for latency) -->
              {#if embedConfig.embedType === "latency"}
                <div class="flex flex-col gap-2">
                  <Label for="height-select">Chart Height</Label>
                  <Select.Root
                    type="single"
                    value={embedConfig.height.toString()}
                    onValueChange={(v) => {
                      if (v) embedConfig.height = parseInt(v);
                    }}
                  >
                    <Select.Trigger id="height-select" class="w-full">
                      {heightPresets.find((h) => h.value === embedConfig.height)?.label || `${embedConfig.height}px`}
                    </Select.Trigger>
                    <Select.Content>
                      {#each heightPresets as preset (preset.value)}
                        <Select.Item value={preset.value.toString()}>{preset.label}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>

                <!-- Latency Metric -->
                <div class="flex flex-col gap-2">
                  <Label for="metric-select">Latency Metric</Label>
                  <Select.Root
                    type="single"
                    value={embedConfig.metric}
                    onValueChange={(v) => {
                      if (v) embedConfig.metric = v as "average" | "maximum" | "minimum";
                    }}
                  >
                    <Select.Trigger id="metric-select" class="w-full capitalize">
                      {embedConfig.metric === "average"
                        ? "Average"
                        : embedConfig.metric === "maximum"
                          ? "Maximum"
                          : "Minimum"}
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="average">Average</Select.Item>
                      <Select.Item value="maximum">Maximum</Select.Item>
                      <Select.Item value="minimum">Minimum</Select.Item>
                    </Select.Content>
                  </Select.Root>
                  <p class="text-muted-foreground text-xs">Select which latency metric to display in the chart</p>
                </div>
              {/if}

              <!-- Format -->
              <div class="flex flex-col gap-2">
                <Label>Embed Format</Label>
                <div class="flex gap-2">
                  <Button
                    variant={embedConfig.format === "iframe" ? "default" : "outline"}
                    size="sm"
                    onclick={() => (embedConfig.format = "iframe")}
                  >
                    iFrame
                  </Button>
                  <Button
                    variant={embedConfig.format === "script" ? "default" : "outline"}
                    size="sm"
                    onclick={() => (embedConfig.format = "script")}
                  >
                    Script
                  </Button>
                </div>
                <p class="text-muted-foreground text-xs">
                  {#if embedConfig.format === "iframe"}
                    Use an iframe to embed the widget. Works on most websites.
                  {:else}
                    Use a script tag for dynamic embedding. May require CSP configuration.
                  {/if}
                </p>
              </div>
            </div>

            <!-- Preview Panel -->
            <div class="flex flex-col gap-4">
              {#if embedConfig.tag}
                <div>
                  <p class="flex items-center justify-between">
                    <span class="text-sm font-semibold">Preview</span>
                    <Button variant="ghost" size="icon-sm" onclick={refreshPreview}>
                      <RefreshCwIcon class="h-4 w-4" />
                    </Button>
                  </p>
                  <p class="text-muted-foreground text-sm">See how your embed will look</p>
                </div>

                <!-- Embed Preview -->
                <div
                  class="bg-muted/50 flex items-center justify-center rounded-lg border p-4"
                  class:bg-zinc-900={embedConfig.theme === "dark"}
                >
                  {#key previewKey}
                    {#key embedConfig}
                      <iframe
                        title="Embed preview"
                        src={previewUrl}
                        width="100%"
                        height={embedConfig.embedType === "status" ? 70 : embedConfig.height + 50}
                        frameborder="0"
                        class="rounded"
                      ></iframe>
                    {/key}
                  {/key}
                </div>

                <!-- Embed URL -->
                <div class="space-y-2">
                  <Label>Embed URL</Label>
                  <div class="flex gap-2">
                    <Input readonly value={previewUrl} class="font-mono text-xs" />
                    <CopyButton variant="outline" size="icon" text={previewUrl}>
                      <CopyIcon class="h-4 w-4" />
                    </CopyButton>
                  </div>
                </div>

                <!-- Embed Code -->
                <div class="space-y-2">
                  <Label>Embed Code</Label>
                  <div class="flex gap-2">
                    <Input readonly value={htmlSnippet} class="font-mono text-xs" />
                    <CopyButton variant="outline" size="icon" text={htmlSnippet}>
                      <CopyIcon class="h-4 w-4" />
                    </CopyButton>
                  </div>
                </div>
              {:else}
                <div class="text-muted-foreground flex items-center justify-center py-12 text-center">
                  Select a monitor to preview the embed
                </div>
              {/if}
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  {/if}
</div>

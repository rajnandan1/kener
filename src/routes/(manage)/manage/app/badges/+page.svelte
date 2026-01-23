<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import CopyButton from "$lib/components/CopyButton.svelte";
  import ColorPicker from "svelte-awesome-color-picker";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import EyeIcon from "@lucide/svelte/icons/eye";
  import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import { BADGE_STYLES, type BadgeStyle } from "$lib/global-constants.js";
  import type { SiteDataTransformed } from "$lib/server/controllers/siteDataController";
  import { resolve } from "$app/paths";
  // Monitors state
  let monitors = $state<MonitorRecord[]>([]);
  let loading = $state(true);

  // Badge configuration
  let badgeConfig = $state({
    tag: "",
    badgeType: "status" as "status" | "uptime" | "latency",
    sinceLast: 7776000, // 90 days in seconds
    hideDuration: false,
    label: "",
    labelColor: "#555",
    color: "#0079FF",
    style: "flat" as BadgeStyle
  });

  // Preview state
  let previewKey = $state(0);
  let siteURL = $state("");

  // Duration presets in seconds
  const durationPresets = [
    { label: "1 Hour", value: 3600 },
    { label: "24 Hours", value: 86400 },
    { label: "7 Days", value: 604800 },
    { label: "30 Days", value: 2592000 },
    { label: "90 Days", value: 7776000 }
  ];

  // Build the badge URL
  const badgeUrl = $derived.by(() => {
    if (!badgeConfig.tag) return "";

    const baseUrl = `${siteURL}${resolve("/")}badge/${badgeConfig.tag}/${badgeConfig.badgeType}`;
    const params = new URLSearchParams();

    // sinceLast and hideDuration only apply to uptime/latency badges
    if (badgeConfig.badgeType !== "status") {
      if (badgeConfig.sinceLast !== 7776000) {
        params.set("sinceLast", badgeConfig.sinceLast.toString());
      }
      if (badgeConfig.hideDuration) {
        params.set("hideDuration", "true");
      }
    }
    if (badgeConfig.label) {
      params.set("label", badgeConfig.label);
    }
    if (badgeConfig.labelColor && badgeConfig.labelColor !== "#555") {
      params.set("labelColor", badgeConfig.labelColor.replace("#", ""));
    }
    if (badgeConfig.color && badgeConfig.color !== "#0079FF") {
      params.set("color", badgeConfig.color.replace("#", ""));
    }
    if (badgeConfig.style !== "flat") {
      params.set("style", badgeConfig.style);
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  });

  // Markdown snippet
  const markdownSnippet = $derived.by(() => {
    if (!badgeUrl) return "";
    const monitor = monitors.find((m) => m.tag === badgeConfig.tag);
    const altText = monitor ? `${monitor.name} ${badgeConfig.badgeType}` : badgeConfig.badgeType;
    return `![${altText}](${badgeUrl})`;
  });

  // HTML snippet
  const htmlSnippet = $derived.by(() => {
    if (!badgeUrl) return "";
    const monitor = monitors.find((m) => m.tag === badgeConfig.tag);
    const altText = monitor ? `${monitor.name} ${badgeConfig.badgeType}` : badgeConfig.badgeType;
    return `<img src="${badgeUrl}" alt="${altText}" />`;
  });

  async function fetchMonitors() {
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getMonitors", data: { status: "ACTIVE" } })
      });
      const result = await response.json();
      if (!result.error) {
        monitors = result;
        // Set default tag to first monitor or "_" for all
        if (monitors.length > 0) {
          badgeConfig.tag = "_";
        }
      }
    } catch {
      // Ignore errors
    }
  }
  async function fetchSiteData() {
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getAllSiteData" })
      });
      const result = (await response.json()) as SiteDataTransformed;
      siteURL = result.siteURL || window.location.origin;
    } catch {
      // Ignore errors
    }
  }

  //fetch site data
  onMount(() => {
    fetchSiteData();
  });

  function refreshPreview() {
    previewKey++;
  }

  onMount(async () => {
    loading = true;
    await fetchSiteData();
    await fetchMonitors();
    loading = false;
  });
</script>

<div class="flex w-full flex-col gap-4 p-4">
  <div class="mb-4">
    <h1 class="text-2xl font-bold">Badge Generator</h1>
    <p class="text-muted-foreground">Generate embeddable status badges for your monitors</p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="size-8" />
    </div>
  {:else}
    <div class="flex flex-col gap-6">
      <Card.Root>
        <Card.Header>
          <Card.Title>Badge Generator</Card.Title>
          <Card.Description>
            Create a customizable badge to display the status, uptime, or latency of your monitors
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-4 border-r pr-4">
              <div class="flex flex-col gap-2">
                <Label for="monitor-select">Monitor</Label>
                <Select.Root
                  type="single"
                  value={badgeConfig.tag}
                  onValueChange={(v) => {
                    if (v) badgeConfig.tag = v;
                  }}
                >
                  <Select.Trigger id="monitor-select" class="w-full">
                    {badgeConfig.tag === "_"
                      ? "All Monitors"
                      : monitors.find((m) => m.tag === badgeConfig.tag)?.name || "Select a monitor"}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="_">All Monitors</Select.Item>
                    {#each monitors as monitor (monitor.tag)}
                      <Select.Item value={monitor.tag}>{monitor.name}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Badge Type -->
              <div class="flex flex-col gap-2">
                <Label for="badge-type">Badge Type</Label>
                <Select.Root
                  type="single"
                  value={badgeConfig.badgeType}
                  onValueChange={(v) => {
                    if (v) badgeConfig.badgeType = v as "status" | "uptime" | "latency";
                  }}
                >
                  <Select.Trigger id="badge-type" class="w-full capitalize">
                    {badgeConfig.badgeType}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="status">Status</Select.Item>
                    <Select.Item value="uptime">Uptime</Select.Item>
                    <Select.Item value="latency">Latency</Select.Item>
                  </Select.Content>
                </Select.Root>
                <p class="text-muted-foreground text-xs">
                  {#if badgeConfig.badgeType === "status"}
                    Shows current real-time status (UP, DOWN, DEGRADED)
                  {:else if badgeConfig.badgeType === "uptime"}
                    Shows uptime percentage over a time period
                  {:else}
                    Shows average latency over a time period
                  {/if}
                </p>
              </div>

              <!-- Duration (only for uptime/latency) -->
              {#if badgeConfig.badgeType !== "status"}
                <div class="flex flex-col gap-2">
                  <Label for="duration">Time Period</Label>
                  <Select.Root
                    type="single"
                    value={badgeConfig.sinceLast.toString()}
                    onValueChange={(v) => {
                      if (v) badgeConfig.sinceLast = parseInt(v);
                    }}
                  >
                    <Select.Trigger id="duration" class="w-full">
                      {durationPresets.find((d) => d.value === badgeConfig.sinceLast)?.label || "Custom"}
                    </Select.Trigger>
                    <Select.Content>
                      {#each durationPresets as preset (preset.value)}
                        <Select.Item value={preset.value.toString()}>{preset.label}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>

                <!-- Hide Duration Toggle -->
                <div class="flex items-center justify-between">
                  <div class="space-y-0.5">
                    <Label for="hide-duration">Hide Duration</Label>
                    <p class="text-muted-foreground text-xs">Don't show the time period on the badge</p>
                  </div>
                  <Switch
                    id="hide-duration"
                    checked={badgeConfig.hideDuration}
                    onCheckedChange={(checked) => (badgeConfig.hideDuration = checked)}
                  />
                </div>
              {/if}

              <!-- Badge Style -->
              <div class="flex flex-col gap-2">
                <Label for="badge-style">Style</Label>
                <Select.Root
                  type="single"
                  value={badgeConfig.style}
                  onValueChange={(v) => {
                    if (v) badgeConfig.style = v as BadgeStyle;
                  }}
                >
                  <Select.Trigger id="badge-style" class="w-full capitalize">
                    {badgeConfig.style}
                  </Select.Trigger>
                  <Select.Content>
                    {#each BADGE_STYLES as style (style)}
                      <Select.Item value={style} class="capitalize">{style}</Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Custom Label -->
              <div class="flex flex-col gap-2">
                <Label for="custom-label">Custom Label</Label>
                <Input id="custom-label" bind:value={badgeConfig.label} placeholder="Leave empty to use monitor name" />
              </div>

              <!-- Colors -->
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <Label>Label Color</Label>
                  <div class="flex items-center gap-2">
                    <ColorPicker
                      bind:hex={badgeConfig.labelColor}
                      label=""
                      --picker-width="150px"
                      --picker-height="150px"
                    />
                    <Input bind:value={badgeConfig.labelColor} class="w-24 font-mono text-xs" />
                  </div>
                </div>
                <div class="flex flex-col gap-2">
                  <Label>Badge Color</Label>
                  <div class="flex items-center gap-2">
                    <ColorPicker bind:hex={badgeConfig.color} label="" --picker-width="150px" --picker-height="150px" />
                    <Input bind:value={badgeConfig.color} class="w-24 font-mono text-xs" />
                  </div>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-4">
              {#if badgeConfig.tag}
                <div>
                  <p class="flex items-center justify-between">
                    <span>Preview</span>
                    <Button variant="ghost" size="icon-sm" onclick={refreshPreview} disabled={!badgeConfig.tag}>
                      <RefreshCwIcon class="size-4" />
                    </Button>
                  </p>
                  <p class="text-muted-foreground text-sm">See how your badge will look</p>
                </div>
                <!-- Badge Preview -->
                <div class="bg-muted/50 flex items-center justify-center rounded-lg border p-8">
                  {#key previewKey}
                    <img src={badgeUrl} alt="Badge preview" class="max-w-full" />
                  {/key}
                </div>

                <!-- URL -->
                <div class="space-y-2">
                  <Label>Badge URL</Label>
                  <div class="flex gap-2">
                    <Input value={badgeUrl} readonly class="font-mono text-xs" />
                    <CopyButton text={badgeUrl}>
                      <CopyIcon class="size-4" />
                    </CopyButton>
                  </div>
                </div>

                <!-- Markdown -->
                <div class="space-y-2">
                  <Label>Markdown</Label>
                  <div class="flex gap-2">
                    <Input value={markdownSnippet} readonly class="font-mono text-xs" />
                    <CopyButton text={markdownSnippet}>
                      <CopyIcon class="size-4" />
                    </CopyButton>
                  </div>
                </div>

                <!-- HTML -->
                <div class="space-y-2">
                  <Label>HTML</Label>
                  <div class="flex gap-2">
                    <Input value={htmlSnippet} readonly class="font-mono text-xs" />
                    <CopyButton text={htmlSnippet}>
                      <CopyIcon class="size-4" />
                    </CopyButton>
                  </div>
                </div>
              {:else}
                <div class="text-muted-foreground flex items-center justify-center py-12 text-center">
                  Select a monitor to preview the badge
                </div>
              {/if}
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  {/if}
</div>

<script lang="ts">
  import { Label } from "$lib/components/ui/label/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import clientResolver from "$lib/client/resolver.js";
  import { resolve } from "$app/paths";
  const LATENCY_CALCULATION_OPTIONS = ["AVG", "MAX", "MIN"] as const;
  type LatencyCalculationOption = (typeof LATENCY_CALCULATION_OPTIONS)[number];
  const LATENCY_CALCULATION_LABELS: Record<LatencyCalculationOption, string> = {
    AVG: "Average (mean)",
    MAX: "Maximum (slowest)",
    MIN: "Minimum (fastest)"
  };

  type GroupMonitorFormData = {
    monitors: Array<{ tag: string }>;
    delay: number;
    latencyCalculation: LatencyCalculationOption;
  };

  let {
    data = $bindable({} as Record<string, unknown>),
    availableMonitors = [],
    tag = ""
  }: { data: Record<string, unknown>; availableMonitors: MonitorRecord[]; tag: string } = $props();
  console.log(">>>>>>----  monitor-group:27 ", data);
  const formData = data as GroupMonitorFormData;

  const MIN_SELECTED_MONITORS = 2;
  const MIN_DELAY_MS = 1000;

  // Initialize defaults if not set
  if (!Array.isArray(formData.monitors)) formData.monitors = [];
  if (typeof formData.delay !== "number" || !Number.isFinite(formData.delay) || formData.delay < MIN_DELAY_MS) {
    formData.delay = MIN_DELAY_MS;
  }
  if (!LATENCY_CALCULATION_OPTIONS.includes(formData.latencyCalculation)) {
    formData.latencyCalculation = "AVG";
  }

  let delayInput = $state(String(formData.delay));
  const parsedDelay = $derived.by(() => {
    const value = Number(delayInput);
    return Number.isFinite(value) ? value : MIN_DELAY_MS;
  });
  $effect(() => {
    formData.delay = parsedDelay;
  });

  // Filter out GROUP monitors - groups can't contain other groups
  let eligibleMonitors = $derived(availableMonitors.filter((m) => m.monitor_type !== "GROUP" && m.status === "ACTIVE"));

  function isSelected(tag: string): boolean {
    return formData.monitors.some((m: { tag: string }) => m.tag === tag);
  }

  function toggleMonitor(tag: string) {
    if (isSelected(tag)) {
      formData.monitors = formData.monitors.filter((m: { tag: string }) => m.tag !== tag);
    } else {
      formData.monitors = [...formData.monitors, { tag }];
    }
  }
</script>

<div class="space-y-4">
  <div>
    <div class="flex flex-col gap-1">
      <Label>Select Monitors to Group</Label>
      <p class="text-muted-foreground text-xs">
        Group monitors aggregate the status of multiple monitors. Only active non-group monitors can be added.
      </p>
      <p class="text-muted-foreground text-xs">
        Select at least {MIN_SELECTED_MONITORS} monitors to enable saving.
      </p>
    </div>

    {#if eligibleMonitors.length > 0}
      <div class="grid gap-2">
        {#each eligibleMonitors.filter((m) => m.tag !== tag) as monitor (monitor.id ?? monitor.tag)}
          <div
            class="flex items-center justify-between rounded-lg border p-3 transition-colors {isSelected(monitor.tag)
              ? 'bg-primary/5'
              : ''}"
          >
            <div class="flex items-center gap-3">
              {#if monitor.image}
                <img
                  src={clientResolver(resolve, monitor.image)}
                  alt={monitor.name}
                  class="size-8 rounded object-cover"
                />
              {:else}
                <div class="bg-muted flex size-8 items-center justify-center rounded text-xs font-medium">
                  {monitor.name.charAt(0).toUpperCase()}
                </div>
              {/if}
              <div>
                <p class="text-sm font-medium">{monitor.name}</p>
                <p class="text-muted-foreground text-xs">{monitor.tag}</p>
              </div>
            </div>
            <Switch checked={isSelected(monitor.tag)} onCheckedChange={() => toggleMonitor(monitor.tag)} />
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-muted-foreground text-sm">No eligible monitors available. Create some non-group monitors first.</p>
    {/if}
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label for="group-timeout">Timeout (ms)</Label>
        <span class="text-muted-foreground text-xs">Minimum {MIN_DELAY_MS}ms</span>
      </div>
      <Input id="group-timeout" type="number" min={MIN_DELAY_MS} step={100} bind:value={delayInput} />
      <p class="text-muted-foreground text-xs">
        Determines how long to wait for all child monitors before aggregating results.
      </p>
    </div>

    <div class="space-y-2">
      <Label for="group-latency-calculation">Latency calculation</Label>
      <Select.Root
        type="single"
        value={formData.latencyCalculation}
        onValueChange={(value) => {
          if (value && LATENCY_CALCULATION_OPTIONS.includes(value as LatencyCalculationOption)) {
            formData.latencyCalculation = value as LatencyCalculationOption;
          }
        }}
      >
        <Select.Trigger id="group-latency-calculation" class="w-full">
          {LATENCY_CALCULATION_LABELS[formData.latencyCalculation as LatencyCalculationOption]}
        </Select.Trigger>
        <Select.Content>
          {#each LATENCY_CALCULATION_OPTIONS as option (option)}
            <Select.Item value={option}>{LATENCY_CALCULATION_LABELS[option]}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
      <p class="text-muted-foreground text-xs">Choose how latency should be derived from the selected monitors.</p>
    </div>
  </div>

  {#if formData.monitors.length > 0}
    <div class="bg-muted/50 rounded-lg p-3">
      <p class="text-sm font-medium">Selected: {formData.monitors.length} monitor(s)</p>
      <p class="text-muted-foreground text-xs">
        {formData.monitors.map((m: { tag: string }) => m.tag).join(", ")}
      </p>
    </div>
  {/if}
</div>

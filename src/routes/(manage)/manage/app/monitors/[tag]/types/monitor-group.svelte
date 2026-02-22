<script lang="ts">
  import { Label } from "$lib/components/ui/label/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import type { GroupMonitorMember } from "$lib/server/types/monitor.js";
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
    monitors: GroupMonitorMember[];
    executionDelay: number;
    latencyCalculation: LatencyCalculationOption;
  };

  let {
    data = $bindable({} as Record<string, unknown>),
    availableMonitors = [],
    tag = ""
  }: { data: Record<string, unknown>; availableMonitors: MonitorRecord[]; tag: string } = $props();

  const formData = data as GroupMonitorFormData;

  const MIN_SELECTED_MONITORS = 2;
  const MIN_DELAY_MS = 1000;
  // Initialize defaults if not set
  if (!Array.isArray(formData.monitors)) formData.monitors = [];
  if (
    typeof formData.executionDelay !== "number" ||
    !Number.isFinite(formData.executionDelay) ||
    formData.executionDelay < MIN_DELAY_MS
  ) {
    formData.executionDelay = MIN_DELAY_MS;
  }
  if (!LATENCY_CALCULATION_OPTIONS.includes(formData.latencyCalculation)) {
    formData.latencyCalculation = "AVG";
  }

  let executionDelayInput = $state(String(formData.executionDelay));
  const parsedExecutionDelay = $derived.by(() => {
    const value = Number(executionDelayInput);
    return Number.isFinite(value) ? value : MIN_DELAY_MS;
  });
  $effect(() => {
    formData.executionDelay = parsedExecutionDelay;
  });

  // Filter out GROUP monitors - groups can't contain other groups
  let eligibleMonitors = $derived(availableMonitors.filter((m) => m.monitor_type !== "GROUP" && m.status === "ACTIVE"));

  let totalWeight = $derived(Math.round(formData.monitors.reduce((sum, m) => sum + m.weight, 0) * 1000) / 1000);
  let weightsValid = $derived(Math.abs(totalWeight - 1) < 0.001 || formData.monitors.length === 0);

  function findMember(monitorTag: string): GroupMonitorMember | undefined {
    return formData.monitors.find((m) => m.tag === monitorTag);
  }

  function isSelected(monitorTag: string): boolean {
    return formData.monitors.some((m) => m.tag === monitorTag);
  }

  /** Distribute weights equally across all selected monitors. */
  function distributeEqually() {
    const count = formData.monitors.length;
    if (count === 0) return;
    const weight = Math.round((1 / count) * 1000) / 1000;
    formData.monitors = formData.monitors.map((m, i) => ({
      ...m,
      // Give the last monitor the remainder to ensure sum = 1
      weight: i === count - 1 ? Math.round((1 - weight * (count - 1)) * 1000) / 1000 : weight
    }));
  }

  function toggleMonitor(monitorTag: string) {
    if (isSelected(monitorTag)) {
      formData.monitors = formData.monitors.filter((m) => m.tag !== monitorTag);
    } else {
      formData.monitors = [...formData.monitors, { tag: monitorTag, weight: 0 }];
    }
    distributeEqually();
  }

  function setWeight(monitorTag: string, weight: number) {
    formData.monitors = formData.monitors.map((m) => {
      if (m.tag !== monitorTag) return m;
      return { ...m, weight: Math.min(1, Math.max(0, Math.round(weight * 1000) / 1000)) };
    });
  }
</script>

<div class="space-y-4">
  <div>
    <div class="flex flex-col gap-1">
      <Label>Select Monitors to Group</Label>
      <p class="text-muted-foreground text-xs">
        Group monitors aggregate the status of multiple monitors using weighted scores. Each status has a score: UP=0,
        DEGRADED=1, DOWN=2, MAINTENANCE=3. The weighted sum determines the group status.
      </p>
      <p class="text-muted-foreground text-xs">
        Select at least {MIN_SELECTED_MONITORS} monitors. Weights must sum to 1.
      </p>
    </div>

    {#if eligibleMonitors.length > 0}
      <div class="grid gap-2">
        {#each eligibleMonitors.filter((m) => m.tag !== tag) as monitor (monitor.id ?? monitor.tag)}
          {@const member = findMember(monitor.tag)}
          {@const selected = !!member}
          <div class="rounded-lg border p-3 transition-colors {selected ? 'bg-primary/5' : ''}">
            <div class="flex items-center justify-between">
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
              <Switch checked={selected} onCheckedChange={() => toggleMonitor(monitor.tag)} />
            </div>

            {#if selected && member}
              <div class="mt-3 flex items-end gap-4 border-t pt-3">
                <div class="space-y-1">
                  <Label class="text-xs">Weight</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={String(member.weight)}
                    class="h-8 w-[100px] text-xs"
                    onchange={(e) => {
                      const target = e.currentTarget as HTMLInputElement;
                      setWeight(monitor.tag, Number(target.value));
                    }}
                  />
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-muted-foreground text-sm">No eligible monitors available. Create some non-group monitors first.</p>
    {/if}
  </div>

  {#if formData.monitors.length > 0}
    <div class="flex items-center gap-3">
      <div
        class="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm {weightsValid
          ? 'border-green-500/50 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
          : 'border-destructive/50 text-destructive bg-red-50 dark:bg-red-950'}"
      >
        Total weight: {totalWeight}
        {#if !weightsValid}
          <span class="text-xs">(must equal 1)</span>
        {/if}
      </div>
      <button
        type="button"
        class="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
        onclick={distributeEqually}
      >
        Distribute equally
      </button>
    </div>
  {/if}

  <div class="grid gap-4 md:grid-cols-2">
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label for="group-execution-delay">Execution Delay (ms)</Label>
        <span class="text-muted-foreground text-xs">Minimum {MIN_DELAY_MS}ms</span>
      </div>
      <Input id="group-execution-delay" type="number" min={MIN_DELAY_MS} step={100} bind:value={executionDelayInput} />
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
      <div class="mt-1 space-y-0.5">
        {#each formData.monitors as m (m.tag)}
          <p class="text-muted-foreground text-xs">
            {m.tag}
            <span class="ml-1 text-[10px]">weight {m.weight}</span>
          </p>
        {/each}
      </div>
    </div>
  {/if}
</div>

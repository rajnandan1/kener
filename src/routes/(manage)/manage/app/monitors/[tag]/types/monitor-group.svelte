<script lang="ts">
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import type { MonitorRecord } from "$lib/server/types/db.js";

  let {
    data = $bindable(),
    availableMonitors = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }: { data: any; availableMonitors: MonitorRecord[] } = $props();

  // Initialize defaults if not set
  if (!data.monitors) data.monitors = [];

  // Filter out GROUP monitors - groups can't contain other groups
  let eligibleMonitors = $derived(availableMonitors.filter((m) => m.monitor_type !== "GROUP" && m.status === "ACTIVE"));

  function isSelected(tag: string): boolean {
    return data.monitors.some((m: { tag: string }) => m.tag === tag);
  }

  function toggleMonitor(tag: string) {
    if (isSelected(tag)) {
      data.monitors = data.monitors.filter((m: { tag: string }) => m.tag !== tag);
    } else {
      data.monitors = [...data.monitors, { tag }];
    }
  }
</script>

<div class="space-y-4">
  <div>
    <Label>Select Monitors to Group</Label>
    <p class="text-muted-foreground mb-3 text-xs">
      Group monitors aggregate the status of multiple monitors. Only active non-group monitors can be added.
    </p>

    {#if eligibleMonitors.length > 0}
      <div class="grid gap-2">
        {#each eligibleMonitors as monitor}
          <div
            class="flex items-center justify-between rounded-lg border p-3 transition-colors {isSelected(monitor.tag)
              ? 'bg-primary/5'
              : ''}"
          >
            <div class="flex items-center gap-3">
              {#if monitor.image}
                <img src={monitor.image} alt={monitor.name} class="size-8 rounded object-cover" />
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

  {#if data.monitors.length > 0}
    <div class="bg-muted/50 rounded-lg p-3">
      <p class="text-sm font-medium">Selected: {data.monitors.length} monitor(s)</p>
      <p class="text-muted-foreground text-xs">
        {data.monitors.map((m: { tag: string }) => m.tag).join(", ")}
      </p>
    </div>
  {/if}
</div>

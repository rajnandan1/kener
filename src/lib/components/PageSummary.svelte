<script lang="ts">
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import type { NumberWithChange } from "$lib/types/monitor.js";

  interface Props {
    incidentNumber: NumberWithChange;
    maintenanceNumber: NumberWithChange;
    uptimeNumber: NumberWithChange;
  }

  let { incidentNumber, maintenanceNumber, uptimeNumber }: Props = $props();

  // Determine system status based on uptime
  let systemStatus = $derived(
    uptimeNumber.currentNumber >= 99.9
      ? "All Systems Operational"
      : uptimeNumber.currentNumber >= 99
        ? "Minor Issues Detected"
        : uptimeNumber.currentNumber >= 95
          ? "Some Systems Degraded"
          : "Systems Experiencing Issues"
  );

  // Helper to format change display
  function formatChange(
    change: number,
    isPercentage: boolean = false
  ): { text: string; isPositive: boolean; isZero: boolean } {
    if (change === 0) {
      return { text: "No change", isPositive: false, isZero: true };
    }
    const absChange = Math.abs(change);
    const formatted = isPercentage ? `${absChange.toFixed(2)}%` : `${absChange}`;
    return {
      text: change > 0 ? `▲ ${formatted}` : `▼ ${formatted}`,
      isPositive: change > 0,
      isZero: false
    };
  }

  // For incidents/maintenance, fewer is better (so negative change is good)
  function formatIncidentChange(change: number): { text: string; isGood: boolean; isZero: boolean } {
    if (change === 0) {
      return { text: "No change", isGood: false, isZero: true };
    }
    const absChange = Math.abs(change);
    return {
      text: change < 0 ? `▼ ${absChange} from previous period` : `▲ ${absChange} from previous period`,
      isGood: change < 0,
      isZero: false
    };
  }

  let uptimeChange = $derived(formatChange(uptimeNumber.changePercentage, true));
  let incidentChange = $derived(formatIncidentChange(incidentNumber.change));
  let maintenanceChange = $derived(formatIncidentChange(maintenanceNumber.change));
</script>

<div>
  <div class="flex gap-4">
    <!-- Summary Card -->
    <div class="bg-primary flex w-62.5 flex-col gap-y-3 rounded-3xl border p-4">
      <Badge variant="secondary">Summary</Badge>
      <p class="text-secondary text-2xl">{systemStatus}</p>
    </div>

    <!-- Uptime Card -->
    <div class="flex w-62.5 flex-col justify-start gap-y-3 rounded-3xl border p-4">
      <div class="relative flex justify-between">
        <Badge variant="secondary">Uptime</Badge>
        <Button variant="ghost" class="absolute top-0 -right-1 -translate-y-1 cursor-pointer" size="icon">
          <ArrowUpRight />
        </Button>
      </div>
      <p class="text-2xl">{uptimeNumber.currentNumber.toFixed(2)}%</p>
      <div class="flex flex-col justify-end gap-1">
        <p class="text-sm">Last 90 days</p>
        <p
          class="text-xs {uptimeChange.isZero
            ? 'text-muted-foreground'
            : uptimeChange.isPositive
              ? 'text-green-500'
              : 'text-red-500'}"
        >
          {uptimeChange.text}
        </p>
      </div>
    </div>

    <!-- Incidents Card -->
    <div class="flex w-62.5 flex-col justify-start gap-y-3 rounded-3xl border p-4">
      <div class="relative flex justify-between">
        <Badge variant="secondary">Incidents</Badge>
        <Button variant="ghost" class="absolute top-0 -right-1 -translate-y-1 cursor-pointer" size="icon">
          <ArrowUpRight />
        </Button>
      </div>
      <p class="text-2xl">{incidentNumber.currentNumber}</p>
      <div class="flex flex-col justify-end gap-1">
        <p class="text-sm">Incidents last 90 days</p>
        <p
          class="text-xs {incidentChange.isZero
            ? 'text-muted-foreground'
            : incidentChange.isGood
              ? 'text-green-500'
              : 'text-red-500'}"
        >
          {incidentChange.text}
        </p>
      </div>
    </div>

    <!-- Maintenances Card -->
    <div class="flex w-62.5 flex-col justify-start gap-y-3 rounded-3xl border p-4">
      <div class="relative flex justify-between">
        <Badge variant="secondary">Maintenances</Badge>
        <Button variant="ghost" class="absolute top-0 -right-1 -translate-y-1 cursor-pointer" size="icon">
          <ArrowUpRight />
        </Button>
      </div>
      <p class="text-2xl">{maintenanceNumber.currentNumber}</p>
      <div class="flex flex-col justify-end gap-1">
        <p class="text-sm">Last 90 days</p>
        <p
          class="text-xs {maintenanceChange.isZero
            ? 'text-muted-foreground'
            : maintenanceChange.isGood
              ? 'text-green-500'
              : 'text-red-500'}"
        >
          {maintenanceChange.text}
        </p>
      </div>
    </div>
  </div>
</div>

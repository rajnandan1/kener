<script lang="ts">
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import Minus from "@lucide/svelte/icons/minus";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import type { NumberWithChange } from "$lib/types/monitor";

  interface Props {
    summary: NumberWithChange;
  }

  let { summary }: Props = $props();
  // Compute change info (direction, color, and formatted value)
  let changeInfo = $derived.by(() => {
    const { change } = summary;
    if (change === 0) return { direction: "none", colorClass: "text-gray-500", formattedChange: "0" };
    const absChange = Math.abs(change);
    // Format with appropriate precision
    const formattedChange = absChange < 0.01 ? absChange.toFixed(4) : absChange.toFixed(2);
    if (change > 0) return { direction: "up", colorClass: "text-up", formattedChange };
    return { direction: "down", colorClass: "text-down", formattedChange };
  });
</script>

<div class="bg-secondary flex h-full flex-col justify-start gap-y-3 rounded-3xl border p-4">
  <div class="flex flex-col gap-2">
    <div class="relative flex justify-between">
      <Badge>Uptime</Badge>
      <Button variant="ghost" class="absolute -top-2 -right-2 cursor-pointer " size="icon">
        <ArrowUpRight />
      </Button>
    </div>
    <div class="flex flex-col items-start gap-2">
      <p class="text-2xl">{summary.currentNumber}%</p>
      <p class="flex items-center gap-0.5 {changeInfo.colorClass}">
        {#if changeInfo.direction === "up"}
          <ArrowUp class="size-4" />
        {:else if changeInfo.direction === "down"}
          <ArrowDown class="size-4" />
        {:else}
          <Minus class="size-4" />
        {/if}
        <span class="text-sm">{changeInfo.formattedChange}%</span>
      </p>
    </div>
  </div>
</div>

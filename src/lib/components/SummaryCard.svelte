<script lang="ts">
  import type { HourlyUptime } from "$lib/types/monitor.js";

  interface Props {
    status?: "UP" | "DEGRADED" | "DOWN";
    message?: string;
    hourlyUptime?: HourlyUptime[];
  }

  let { status = "UP", message = "All systems operational", hourlyUptime = [] }: Props = $props();
  const statusConfig = $derived.by(() => {
    switch (status) {
      case "UP":
        return { bgClass: "bg-up", textClass: "text-up" };
      case "DEGRADED":
        return { bgClass: "bg-degraded", textClass: "text-degraded" };
      case "DOWN":
        return { bgClass: "bg-down", textClass: "text-down" };
      default:
        return { bgClass: "bg-up", textClass: "text-up" };
    }
  });
</script>

<div class="flex flex-col justify-start gap-y-3 rounded-3xl p-4">
  <span class="relative flex size-4">
    <span class="{statusConfig.bgClass} absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
    <span class="{statusConfig.bgClass} relative inline-flex size-4 rounded-full"></span>
  </span>
  <p class="text-secondary text-2xl">{message}</p>
  <!-- Sparkbar placeholder -->
  <div class="h-8 w-full"></div>
</div>

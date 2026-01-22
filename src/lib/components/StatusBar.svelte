<script lang="ts">
  import { onMount } from "svelte";
  import { mode } from "mode-watcher";
  import type { TimestampStatusCount } from "$lib/server/types/db";
  import { GetStatusSummary } from "$lib/clientTools";
  import { page } from "$app/state";

  interface Props {
    data: TimestampStatusCount[];
    barHeight?: number;
    gap?: number;
    radius?: number;
    colorUp?: string;
    colorDown?: string;
    colorDegraded?: string;
    colorMaintenance?: string;
  }

  let {
    data,
    barHeight = 40,
    gap = 0,
    radius = 8,
    colorUp = page.data.siteStatusColors.UP,
    colorDown = page.data.siteStatusColors.DOWN,
    colorDegraded = page.data.siteStatusColors.DEGRADED,
    colorMaintenance = page.data.siteStatusColors.MAINTENANCE
  }: Props = $props();

  let canvas: HTMLCanvasElement;
  let container: HTMLDivElement;
  let canvasWidth = $state(0);
  let hoveredBar = $state<{ index: number; x: number; data: TimestampStatusCount } | null>(null);
  let mounted = $state(false);
  let dpr = $state(1);

  function calculateBarWidth(): number {
    if (data.length === 0) return 0;
    const totalGaps = (data.length - 1) * gap;
    return Math.max(1, (canvasWidth - totalGaps) / data.length);
  }

  function drawBars() {
    if (!canvas || canvasWidth === 0 || !mounted) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale canvas for high-DPI displays
    const scaledWidth = Math.floor(canvasWidth * dpr);
    const scaledHeight = Math.floor(barHeight * dpr);

    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    ctx.scale(dpr, dpr);

    const barWidth = calculateBarWidth();
    const noDataColor = mode.current === "dark" ? "#27272a" : "#e4e4e7";
    const roundedGap = Math.round(gap);

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, barHeight);

    // Draw each bar
    for (let i = 0; i < data.length; i++) {
      const x = Math.round(i * (barWidth + gap));
      const nextX = Math.round((i + 1) * (barWidth + gap));
      const roundedBarWidth = Math.max(0, nextX - x - roundedGap);
      const barItem = data[i];
      const total = barItem.countOfUp + barItem.countOfDown + barItem.countOfDegraded + barItem.countOfMaintenance;

      if (total === 0) {
        // No data - draw gray bar
        ctx.fillStyle = noDataColor;
        ctx.fillRect(x, 0, roundedBarWidth, barHeight);
        continue;
      }

      // Stacked bar: draw from bottom to top
      // Order: down (bottom) -> degraded -> maintenance -> up (top)
      let currentY = barHeight;

      // Draw down (red) at bottom
      if (barItem.countOfDown > 0) {
        const downHeight = Math.round((barItem.countOfDown / total) * barHeight);
        currentY -= downHeight;
        ctx.fillStyle = colorDown;
        ctx.fillRect(x, currentY, roundedBarWidth, downHeight);
      }

      // Draw degraded (yellow)
      if (barItem.countOfDegraded > 0) {
        const degradedHeight = Math.round((barItem.countOfDegraded / total) * barHeight);
        currentY -= degradedHeight;
        ctx.fillStyle = colorDegraded;
        ctx.fillRect(x, currentY, roundedBarWidth, degradedHeight);
      }

      // Draw maintenance (blue)
      if (barItem.countOfMaintenance > 0) {
        const maintenanceHeight = Math.round((barItem.countOfMaintenance / total) * barHeight);
        currentY -= maintenanceHeight;
        ctx.fillStyle = colorMaintenance;
        ctx.fillRect(x, currentY, roundedBarWidth, maintenanceHeight);
      }

      // Draw up (green) at top
      if (barItem.countOfUp > 0) {
        // Fill remaining height to avoid gaps from rounding
        ctx.fillStyle = colorUp;
        // Extend up to 0 to ensure full coverage due to rounding
        ctx.fillRect(x, 0, roundedBarWidth, currentY);
      }
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (!canvas || data.length === 0 || canvasWidth === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const barWidth = calculateBarWidth();
    const totalBarWidth = barWidth + gap;

    // Find which bar the mouse is over by checking each bar's actual rendered position
    let foundIndex = -1;
    for (let i = 0; i < data.length; i++) {
      const barStart = Math.round(i * totalBarWidth);
      const barEnd = Math.round((i + 1) * totalBarWidth) - Math.round(gap);
      if (mouseX >= barStart && mouseX < barEnd) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex >= 0) {
      const barX = Math.round(foundIndex * totalBarWidth) + Math.round(barWidth) / 2;
      hoveredBar = { index: foundIndex, x: barX, data: data[foundIndex] };
    } else {
      hoveredBar = null;
    }
  }

  function handleMouseLeave() {
    hoveredBar = null;
  }

  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: page.data.localTz
    });
  }

  function getStatusColor(item: TimestampStatusCount): string {
    const total = item.countOfUp + item.countOfDown + item.countOfDegraded + item.countOfMaintenance;
    if (total === 0) return "text-muted-foreground";

    const maintenancePercent = (item.countOfMaintenance / total) * 100;
    const downPercent = (item.countOfDown / total) * 100;

    if (maintenancePercent > 0) return "text-maintenance";
    if (downPercent > 0) return "text-down";
    if (item.countOfDegraded > 0) return "text-degraded";
    return "text-up";
  }

  onMount(() => {
    mounted = true;
    dpr = window.devicePixelRatio || 1;

    // Set initial width
    if (container) {
      canvasWidth = container.clientWidth;
    }

    // Observe resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvasWidth = entry.contentRect.width;
      }
    });

    if (container) {
      resizeObserver.observe(container);
    }

    // Initial draw after mount
    requestAnimationFrame(() => {
      drawBars();
    });

    return () => {
      resizeObserver.disconnect();
    };
  });

  // Redraw when data, width, or theme changes
  $effect(() => {
    // Access reactive dependencies
    const _width = canvasWidth;
    const _data = data;
    const _mode = mode.current;

    if (_width > 0 && _data.length > 0 && mounted) {
      drawBars();
    }
  });
</script>

<div class="relative w-full" bind:this={container}>
  <div class="overflow-hidden" style="border-radius: {radius}px;">
    <canvas
      bind:this={canvas}
      style="width: {canvasWidth}px; height: {barHeight}px;"
      class="cursor-pointer"
      onmousemove={handleMouseMove}
      onmouseleave={handleMouseLeave}
      aria-label="Status bar showing uptime data"
    ></canvas>
  </div>

  {#if hoveredBar}
    <div
      class="bg-foreground text-secondary pointer-events-none absolute z-20 w-max -translate-x-1/2 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap"
      style="left: {hoveredBar.x}px; bottom: {barHeight + 8}px;"
    >
      <span class={getStatusColor(hoveredBar.data)}>{GetStatusSummary(hoveredBar.data)}</span>
      <span class="text-muted">@</span>
      {formatTimestamp(hoveredBar.data.ts)}
    </div>
  {/if}
</div>

<style>
  canvas {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
  }
</style>

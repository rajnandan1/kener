<script lang="ts">
  import { onMount } from "svelte";
  import { mode } from "mode-watcher";
  import { page } from "$app/state";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import { t } from "$lib/stores/i18n";
  import { formatDate } from "$lib/stores/datetime";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  interface MinuteData {
    timestamp: number;
    status: string;
  }

  interface Props {
    minutes: MinuteData[];
    uptime: string;
  }

  let { minutes, uptime }: Props = $props();

  // Canvas state
  let canvas = $state<HTMLCanvasElement | null>(null);
  let container = $state<HTMLDivElement | null>(null);
  let tooltipEl = $state<HTMLDivElement | null>(null);
  let canvasWidth = $state(0);
  let mounted = $state(false);
  let dpr = $state(1);
  let resizeObserver: ResizeObserver | null = null;

  // Hover state
  let hoveredMinute = $state<{ x: number; y: number; data: MinuteData } | null>(null);

  // Layout constants
  const SQUARE_SIZE = 10;
  const SQUARE_GAP = 1;
  const HOUR_LABEL_WIDTH = 0;
  const SECTION_LABEL_HEIGHT = 20;
  const SECTION_GAP = 12;
  const MINUTES_PER_HOUR = 60;
  const HOURS_PER_SECTION = 6;
  const ROW_HEIGHT = SQUARE_SIZE + SQUARE_GAP;

  // Colors from page data
  const colorUp = $derived(page.data.siteStatusColors?.UP || "#22c55e");
  const colorDown = $derived(page.data.siteStatusColors?.DOWN || "#ef4444");
  const colorDegraded = $derived(page.data.siteStatusColors?.DEGRADED || "#eab308");
  const colorMaintenance = $derived(page.data.siteStatusColors?.MAINTENANCE || "#3b82f6");

  // Organize minutes into sections
  interface Section {
    label: string;
    startHour: number;
    hours: MinuteData[][];
  }

  let sections = $derived.by(() => {
    const result: Section[] = [
      { label: "00:00 - 05:59", startHour: 0, hours: [] },
      { label: "06:00 - 11:59", startHour: 6, hours: [] },
      { label: "12:00 - 17:59", startHour: 12, hours: [] },
      { label: "18:00 - 23:59", startHour: 18, hours: [] }
    ];

    // Group minutes by hour
    const minutesByHour: Map<number, MinuteData[]> = new Map();

    for (const minute of minutes) {
      const date = new Date(minute.timestamp * 1000);
      const hour = date.getHours();

      if (!minutesByHour.has(hour)) {
        minutesByHour.set(hour, []);
      }
      minutesByHour.get(hour)!.push(minute);
    }

    // Distribute hours to sections
    for (const section of result) {
      for (let h = 0; h < HOURS_PER_SECTION; h++) {
        const hour = section.startHour + h;
        const hourMinutes = minutesByHour.get(hour) || [];
        if (hourMinutes.length > 0) {
          hourMinutes.sort((a, b) => a.timestamp - b.timestamp);
          section.hours.push(hourMinutes);
        }
      }
    }

    return result.filter((s) => s.hours.length > 0);
  });

  // Calculate total canvas height
  let canvasHeight = $derived.by(() => {
    let height = 0;
    for (const section of sections) {
      height += SECTION_LABEL_HEIGHT;
      height += section.hours.length * ROW_HEIGHT;
      height += SECTION_GAP;
    }
    return Math.max(height, 50);
  });

  // Tooltip positioning
  let tooltipStyle = $derived.by(() => {
    if (!hoveredMinute || !tooltipEl || canvasWidth <= 0) {
      return `left: 0px; top: 0px; opacity: 0; pointer-events: none;`;
    }

    const tooltipWidth = tooltipEl.offsetWidth || 0;
    const halfTooltip = tooltipWidth / 2;
    const padding = 4;

    let left = hoveredMinute.x;
    const minLeft = halfTooltip + padding;
    const maxLeft = Math.max(canvasWidth - halfTooltip - padding, minLeft);

    if (left < minLeft) left = minLeft;
    else if (left > maxLeft) left = maxLeft;

    const top = Math.max(hoveredMinute.y - 28, 0);

    return `left: ${left}px; top: ${top}px;`;
  });

  function getStatusColor(status: string): string {
    const s = status.toUpperCase();
    if (s === "UP") return colorUp;
    if (s === "DOWN") return colorDown;
    if (s === "DEGRADED") return colorDegraded;
    if (s === "MAINTENANCE") return colorMaintenance;
    return mode.current === "dark" ? "#27272a" : "#e4e4e7";
  }

  // Build a lookup map for hit testing
  interface MinuteRect {
    x: number;
    y: number;
    width: number;
    height: number;
    data: MinuteData;
  }

  let minuteRects: MinuteRect[] = [];

  function drawCanvas() {
    if (!canvas || canvasWidth === 0 || !mounted || sections.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale for high-DPI
    const scaledWidth = Math.floor(canvasWidth * dpr);
    const scaledHeight = Math.floor(canvasHeight * dpr);

    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Reset minute rects for hit testing
    minuteRects = [];

    // Text styling
    const labelColor = mode.current === "dark" ? "#a1a1aa" : "#71717a";
    ctx.textBaseline = "middle";

    let currentY = 0;

    for (const section of sections) {
      // Draw section label
      ctx.fillStyle = labelColor;
      ctx.font = "600 10px system-ui, -apple-system, sans-serif";
      ctx.fillText(section.label, 0, currentY + SECTION_LABEL_HEIGHT / 2);
      currentY += SECTION_LABEL_HEIGHT;

      // Draw hours
      for (let hourIdx = 0; hourIdx < section.hours.length; hourIdx++) {
        const hourMinutes = section.hours[hourIdx];

        // Draw minute squares
        for (let minIdx = 0; minIdx < hourMinutes.length; minIdx++) {
          const minute = hourMinutes[minIdx];
          const x = HOUR_LABEL_WIDTH + minIdx * (SQUARE_SIZE + SQUARE_GAP);
          const y = currentY;

          ctx.fillStyle = getStatusColor(minute.status);
          ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);

          // Store rect for hit testing
          minuteRects.push({
            x,
            y,
            width: SQUARE_SIZE,
            height: SQUARE_SIZE,
            data: minute
          });
        }

        currentY += ROW_HEIGHT;
      }

      currentY += SECTION_GAP;
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Find which minute square the mouse is over
    let found: MinuteRect | null = null;
    for (const mr of minuteRects) {
      if (mouseX >= mr.x && mouseX < mr.x + mr.width && mouseY >= mr.y && mouseY < mr.y + mr.height) {
        found = mr;
        break;
      }
    }

    if (found) {
      hoveredMinute = {
        x: found.x + found.width / 2,
        y: found.y,
        data: found.data
      };
    } else {
      hoveredMinute = null;
    }
  }

  function handleMouseLeave() {
    hoveredMinute = null;
  }

  onMount(() => {
    mounted = true;
    dpr = window.devicePixelRatio || 1;

    return () => {
      resizeObserver?.disconnect();
    };
  });

  // Set up resize observer
  $effect(() => {
    if (container && !resizeObserver) {
      canvasWidth = container.clientWidth;

      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          canvasWidth = entry.contentRect.width;
        }
      });

      resizeObserver.observe(container);
    }
  });

  // Redraw when data, width, or theme changes
  $effect(() => {
    const _width = canvasWidth;
    const _sections = sections;
    const _mode = mode.current;
    const _height = canvasHeight;

    if (_width > 0 && _sections.length > 0 && mounted) {
      drawCanvas();
    }
  });
</script>

<div class="space-y-4">
  <div class="text-foreground mb-2 flex items-center justify-between text-sm font-medium">
    <p>{$t("Per-Minute Status")}</p>
    <div class="flex items-center gap-1">
      <Tooltip.Root>
        <Tooltip.Trigger class="flex items-center gap-1">
          <TrendingUp class="h-3 w-3" />
          {uptime}%
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{$t("Day Uptime")}</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  </div>

  <div class="relative w-full" bind:this={container}>
    {#if mounted && canvasHeight > 0}
      <canvas
        bind:this={canvas}
        style="width: 100%; height: {canvasHeight}px;"
        class="cursor-default"
        onmousemove={handleMouseMove}
        onmouseleave={handleMouseLeave}
        aria-label={$t("Per-Minute Status")}
      ></canvas>
    {:else}
      <div style="height: 50px;"></div>
    {/if}

    {#if hoveredMinute}
      <div
        bind:this={tooltipEl}
        class="bg-foreground text-secondary pointer-events-none absolute z-20 w-max -translate-x-1/2 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap"
        style={tooltipStyle}
      >
        {$formatDate(hoveredMinute.data.timestamp, "HH:mm")} -
        <span class="text-{hoveredMinute.data.status.toLowerCase()}">{$t(hoveredMinute.data.status)}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  canvas {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
  }
</style>

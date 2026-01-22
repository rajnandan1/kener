<script lang="ts">
  import { onMount } from "svelte";
  import { isToday } from "date-fns";
  import { fly } from "svelte/transition";
  import { resolve } from "$app/paths";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import ChevronRight from "lucide-svelte/icons/chevron-right";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import MonitorDayDetail from "$lib/components/MonitorDayDetail.svelte";
  import constants from "$lib/global-constants.js";
  import { page } from "$app/state";

  interface DayData {
    timestamp: number;
    cssClass: string;
    status: string;
    UP: number;
    DOWN: number;
    DEGRADED: number;
    MAINTENANCE: number;
    NO_DATA: number;
    total: number;
  }

  interface MonitorData {
    monitor: {
      tag: string;
      name: string;
      description: string;
      image: string;
      monitor_type: string;
    };
    days: DayData[];
  }

  interface Props {
    monitorTag: string;
    localTz: string;
    class?: string;
  }

  let { monitorTag, localTz, class: className = "" }: Props = $props();

  // State
  let loading = $state(true);
  let monitorData = $state<MonitorData | null>(null);

  // Daily detail dialog state
  let dialogOpen = $state(false);
  let selectedDay = $state<{
    timestamp: number;
    status: string;
  } | null>(null);

  // Calendar state
  let now = new Date();
  let selectedMonth = $state(now.getMonth());
  let selectedYear = $state(now.getFullYear());
  let slideDirection = $state(1);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const dayNames = ["M", "T", "W", "T", "F", "S", "S"];

  // Format duration from minutes to human-readable string (e.g., "2h 30min")
  function formatDurationFromMinutes(minutes: number): string {
    if (minutes <= 0) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}min`;
    if (hours > 0) return `${hours}h`;
    return `${mins}min`;
  }

  // Create a lookup map for day status by date string (YYYY-MM-DD)
  let dayStatusMap = $derived.by(() => {
    const map = new Map<string, DayData>();
    if (monitorData?.days) {
      for (const day of monitorData.days) {
        const date = new Date(day.timestamp * 1000);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        map.set(dateStr, day);
      }
    }
    return map;
  });

  // Navigation functions
  function goToPreviousMonth() {
    slideDirection = -1;
    if (selectedMonth === 0) {
      selectedMonth = 11;
      selectedYear--;
    } else {
      selectedMonth--;
    }
  }

  function goToNextMonth() {
    slideDirection = 1;
    if (selectedMonth === 11) {
      selectedMonth = 0;
      selectedYear++;
    } else {
      selectedMonth++;
    }
  }

  // Helper functions for calendar
  function daysInMonth(month: number, year: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  function getMonthData(month: number, year: number) {
    const days = daysInMonth(month, year);
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < offset; i++) {
      calendarDays.push(null);
    }
    for (let i = 1; i <= days; i++) {
      calendarDays.push(i);
    }

    const weeks: (number | null)[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }

    return {
      name: monthNames[month],
      year,
      month,
      weeks
    };
  }

  // Get three months: current selected month, and 2 previous months
  let months = $derived.by(() => {
    const result = [];
    let m = selectedMonth;
    let y = selectedYear;

    // Go back 2 months from selected
    for (let i = 0; i < 2; i++) {
      m--;
      if (m < 0) {
        m = 11;
        y--;
      }
    }

    // Now add 3 months starting from that point
    for (let i = 0; i < 3; i++) {
      result.push(getMonthData(m, y));
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }

    return result;
  });

  // Get day status for a specific date
  function getDayStatus(day: number, month: number, year: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dayStatusMap.get(dateStr);
  }

  // Get CSS class for a day
  function getDayCssClass(day: number | null, month: number, year: number): string {
    if (day === null) return "";
    const status = getDayStatus(day, month, year);
    if (!status) return "bg-muted/30";
    return mapCssClass(status.cssClass);
  }

  // Check if day is in the future
  function isFutureDay(day: number, month: number, year: number): boolean {
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  }

  // Fetch monitor uptime data
  async function fetchMonitorData() {
    loading = true;
    try {
      const response = await fetch(
        `${resolve("/dashboard-apis/monitor-uptime")}?tag=${monitorTag}&days=90&localTz=${encodeURIComponent(localTz)}`
      );

      if (response.ok) {
        monitorData = await response.json();
      }
    } catch (error) {
      console.error("Failed to fetch monitor data:", error);
    } finally {
      loading = false;
    }
  }

  // Handle day click
  function handleDayClick(day: number, month: number, year: number) {
    if (isFutureDay(day, month, year)) return;

    const status = getDayStatus(day, month, year);
    if (!status) return;

    selectedDay = { timestamp: status.timestamp, status: status.status };
    dialogOpen = true;
  }

  function handleDialogClose() {
    selectedDay = null;
  }

  // Map cssClass from API to Tailwind/CSS classes
  function mapCssClass(cssClass: string): string {
    const match = cssClass.match(/^api-(\w+)(?:-(\d+))?$/);
    if (!match) return "bg-muted";

    const status = match[1];
    const percentage = match[2];

    if (percentage) {
      return `bg-${status}-${percentage}`;
    }

    switch (status) {
      case constants.UP.toLowerCase():
        return "bg-up";
      case constants.DOWN.toLowerCase():
        return "bg-down";
      case constants.DEGRADED.toLowerCase():
        return "bg-degraded";
      case constants.MAINTENANCE.toLowerCase():
        return "bg-maintenance";
      case constants.NO_DATA.toLowerCase():
        return "bg-muted";
      default:
        return "bg-muted";
    }
  }

  onMount(() => {
    fetchMonitorData();
  });
</script>

{#if loading}
  <!-- Loading skeleton -->
  <Card.Root class="bg-background rounded-3xl {className}">
    <Card.Content class="p-6">
      <div class="flex justify-between gap-4">
        {#each [1, 2, 3] as i (i)}
          <div class="flex-1">
            <Skeleton class="mb-4 h-6 w-24" />
            <div class="grid grid-cols-7 gap-1">
              {#each Array(35) as _, j (j)}
                <Skeleton class="aspect-square w-full rounded" />
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>
{:else if monitorData}
  <!-- Calendar View -->
  <Card.Root class="bg-background overflow-hidden rounded-3xl shadow-none {className}">
    <Card.Content class="p-6">
      <!-- Navigation -->
      <div class="mb-4 flex items-center justify-between">
        <Button variant="outline" size="icon-sm" onclick={goToPreviousMonth} class="rounded-btn">
          <ChevronLeft />
        </Button>
        <span class="text-muted-foreground text-sm">
          {monthNames[selectedMonth]}
          {selectedYear}
        </span>
        <Button variant="outline" size="icon-sm" onclick={goToNextMonth} class="rounded-btn">
          <ChevronRight />
        </Button>
      </div>

      <!-- Three month calendar grid -->
      <div class="relative overflow-hidden px-2">
        {#key `${selectedMonth}-${selectedYear}`}
          <div
            class="flex justify-between gap-4"
            in:fly={{ x: slideDirection * 100, duration: 300 }}
            out:fly|local={{ x: slideDirection * -100, duration: 300 }}
            style="position: relative;"
            onoutrostart={(e) => (e.currentTarget.style.position = "absolute")}
          >
            {#each months as monthData, monthIndex (monthData.month + "-" + monthData.year)}
              <div class="flex-1">
                <!-- Month header -->
                <div class="mb-2 text-center text-sm font-semibold">
                  {monthData.name} '{String(monthData.year).slice(-2)}
                </div>

                <!-- Day names header -->
                <div class="mb-1 grid grid-cols-7 gap-1">
                  {#each dayNames as dayName, i (i)}
                    <div class="text-muted-foreground flex h-6 items-center justify-center text-xs font-medium">
                      {dayName}
                    </div>
                  {/each}
                </div>

                <!-- Calendar days -->
                <div class="grid grid-cols-7 gap-1 pb-1">
                  {#each monthData.weeks as week, weekIndex (weekIndex)}
                    {#each week as day, dayIndex (dayIndex)}
                      {#if day === null}
                        <div class="aspect-square w-full"></div>
                      {:else}
                        {@const isFuture = isFutureDay(day, monthData.month, monthData.year)}
                        {@const dayStatus = getDayStatus(day, monthData.month, monthData.year)}
                        {@const hasData = !!dayStatus}
                        {#if hasData && !isFuture}
                          <Tooltip.Root>
                            <Tooltip.Trigger class="tooltip-no-caret w-full">
                              <button
                                class="group relative flex aspect-square w-full cursor-pointer items-center justify-center rounded transition-all hover:scale-105 hover:ring-2 hover:ring-offset-1 {getDayCssClass(
                                  day,
                                  monthData.month,
                                  monthData.year
                                )}"
                                onclick={() => handleDayClick(day, monthData.month, monthData.year)}
                                aria-label={`${monthData.name} ${day} - ${dayStatus.status}`}
                              >
                                <span
                                  class="text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100 {dayStatus.status ===
                                    'DOWN' || dayStatus.status === 'MAINTENANCE'
                                    ? 'text-white'
                                    : ''}"
                                >
                                  {day}
                                </span>
                              </button>
                            </Tooltip.Trigger>
                            <Tooltip.Content class="" arrowClasses="bg-foreground">
                              <div class="space-y-1 font-medium">
                                {#if dayStatus.DOWN > 0}
                                  <div class="flex items-center gap-1.5">
                                    <span class="text-down">
                                      {dayStatus.status} for {formatDurationFromMinutes(dayStatus.DOWN)}
                                    </span>
                                  </div>
                                {:else if dayStatus.DEGRADED > 0}
                                  <div class="flex items-center gap-1.5">
                                    <span class="text-degraded">
                                      {dayStatus.status} for {formatDurationFromMinutes(dayStatus.DEGRADED)}
                                    </span>
                                  </div>
                                {:else if dayStatus.MAINTENANCE > 0}
                                  <div class="flex items-center gap-1.5">
                                    <span class="text-maintenance">
                                      {dayStatus.status} for {formatDurationFromMinutes(dayStatus.MAINTENANCE)}
                                    </span>
                                  </div>
                                {:else if dayStatus.UP > 0}
                                  <div class="flex items-center gap-1.5">
                                    <span class="text-up">Status OK</span>
                                  </div>
                                {:else}
                                  <div class="flex items-center gap-1.5">
                                    <span class="text-muted-foreground">No Data</span>
                                  </div>
                                {/if}
                              </div>
                            </Tooltip.Content>
                          </Tooltip.Root>
                        {:else}
                          <button
                            class="group relative flex aspect-square w-full items-center justify-center rounded transition-all
                              {isFuture ? 'cursor-not-allowed opacity-30' : 'cursor-default'}
                              {getDayCssClass(day, monthData.month, monthData.year)}"
                            disabled={true}
                            aria-label={`${monthData.name} ${day}`}
                          >
                            <span class="text-xs font-medium opacity-0">
                              {day}
                            </span>
                          </button>
                        {/if}
                      {/if}
                    {/each}
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/key}
      </div>

      <!-- Legend -->
      <div class="mt-6 flex flex-wrap items-center justify-center gap-4 border-t pt-4">
        <div class="flex items-center gap-2">
          <div class="bg-up h-4 w-4 rounded"></div>
          <span class="text-xs font-medium">{constants.UP}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="bg-degraded h-4 w-4 rounded"></div>
          <span class="text-xs font-medium">{constants.DEGRADED}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="bg-down h-4 w-4 rounded"></div>
          <span class="text-xs font-medium">{constants.DOWN}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="bg-maintenance h-4 w-4 rounded"></div>
          <span class="text-xs font-medium">{constants.MAINTENANCE}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="bg-muted h-4 w-4 rounded"></div>
          <span class="text-xs font-medium">{constants.NO_DATA}</span>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Day Detail Dialog -->
  <MonitorDayDetail bind:open={dialogOpen} {monitorTag} {localTz} {selectedDay} onClose={handleDialogClose} />
{:else}
  <!-- Error state -->
  <Card.Root class="rounded-3xl {className}">
    <Card.Content class="py-12 text-center">
      <p class="text-muted-foreground">Failed to load calendar data. Please try again.</p>
      <Button class="mt-4" onclick={fetchMonitorData}>Retry</Button>
    </Card.Content>
  </Card.Root>
{/if}

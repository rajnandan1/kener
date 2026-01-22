<script lang="ts">
  import { fly } from "svelte/transition";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { Button } from "$lib/components/ui/button/index.js";
  import type { DayWiseStatus } from "$lib/types/monitor";

  let { dayWiseStatus = [] }: { dayWiseStatus: DayWiseStatus[] } = $props();

  // Create a lookup map for day-wise status by date (YYYY-MM-DD)
  const dayStatusMap = $derived(() => {
    const map = new Map<string, { status: "up" | "degraded" | "down"; opacity: 1 | 2 | 3 | 4 }>();
    if (dayWiseStatus) {
      for (const day of dayWiseStatus) {
        map.set(day.date, { status: day.status, opacity: day.opacity });
      }
    }
    return map;
  });

  // Direction for slide animation: 1 = forward (right to left), -1 = backward (left to right)
  let slideDirection = $state(1);

  // Number of days in a month
  function daysInMonth(month: number, year: number) {
    return new Date(year, month, 0).getDate();
  }

  let now = new Date();

  // Month name and year for display
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

  // Reactive state for current month/year
  let selectedMonth = $state(now.getMonth());
  let selectedYear = $state(now.getFullYear());

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

  // Status types
  type Status = "up" | "degraded" | "down";
  type DayStatus = {
    status: Status;
    opacity: 1 | 2 | 3 | 4;
  };

  // Get day status from real data
  function getDayStatus(day: number, month: number, year: number): DayStatus {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const statusData = dayStatusMap().get(dateStr);

    if (statusData) {
      return statusData;
    }

    return { status: "up", opacity: 4 };
  }

  // Get CSS classes for a day based on its status
  function getDayStyle(day: number | null, month: number, year: number): string {
    if (day === null) return "";

    const { status, opacity } = getDayStatus(day, month, year);
    const darkColor = "64, 64, 64";

    if (status === "up") {
      return `border: 2px solid rgb(${darkColor}); background-color: transparent`;
    } else {
      const opacityValue = opacity * 0.25;
      return `border: 2px solid rgb(${darkColor}); background-color: rgba(${darkColor}, ${opacityValue})`;
    }
  }

  // Get text color based on background darkness
  function getDayTextColor(day: number | null, month: number, year: number): string {
    if (day === null) return "";

    const { status, opacity } = getDayStatus(day, month, year);

    if (status === "up" || opacity <= 2) {
      return "color: rgb(64, 64, 64)";
    } else {
      return "color: white";
    }
  }

  const dayNames = ["M", "T", "W", "T", "F", "S", "S"];

  // Helper to get month data for any month/year
  function getMonthData(month: number, year: number) {
    const days = daysInMonth(month + 1, year);
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

  // Get two months: selected and previous
  let months = $derived(() => {
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear--;
    }

    return [getMonthData(prevMonth, prevYear), getMonthData(selectedMonth, selectedYear)];
  });
</script>

<div class="inline-block overflow-hidden rounded-3xl border border-[#f6ed77] bg-[#fcf47f] font-sans">
  <div class="flex flex-col p-6">
    <div
      class="relative"
      style="width: calc(2 * (7 * 2rem + 6 * 0.5rem) + 1.5rem); height: calc(7 * 2rem + 6 * 0.5rem + 2.5rem)"
    >
      {#key `${selectedMonth}-${selectedYear}`}
        <div
          class="absolute inset-0 flex gap-6"
          in:fly={{ x: slideDirection * 100, duration: 300 }}
          out:fly={{ x: slideDirection * -100, duration: 300 }}
        >
          {#each months() as monthData, index}
            <div class="flex flex-col">
              <div class="flex items-center pb-2 text-center text-sm font-medium">
                {#if index === 0}
                  <Button
                    variant="ghost"
                    class="cursor-pointer rounded-full hover:bg-[#ede065]"
                    size="icon"
                    onclick={goToPreviousMonth}
                  >
                    <ChevronLeft class="" />
                  </Button>
                {/if}
                <span class="flex-1 text-center font-semibold">
                  {monthData.name}'{String(monthData.year).slice(-2)}
                </span>
                {#if index === 1}
                  <Button
                    variant="ghost"
                    class="cursor-pointer rounded-full hover:bg-[#ede065]"
                    size="icon"
                    onclick={goToNextMonth}
                  >
                    <ChevronRight />
                  </Button>
                {/if}
              </div>
              <div
                class="inline-flex flex-wrap gap-2"
                style="width: calc(7 * 2rem + 6 * 0.5rem); min-height: calc(7 * 2rem + 6 * 0.5rem)"
              >
                {#each dayNames as dayName}
                  <div class="flex h-8 w-8 items-center justify-center rounded-full text-center text-xs font-semibold">
                    {dayName}
                  </div>
                {/each}
                {#each monthData.weeks as week}
                  {#each week as day}
                    <div
                      class="group flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-center"
                      style={getDayStyle(day, monthData.month, monthData.year)}
                    >
                      {#if day}
                        <span
                          class="text-xs font-medium opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100"
                          style={getDayTextColor(day, monthData.month, monthData.year)}
                        >
                          {day}
                        </span>
                      {/if}
                    </div>
                  {/each}
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/key}
    </div>
  </div>
  <!-- Legend Block -->
  <div
    class="mx-auto mb-4 flex max-w-7/8 items-center justify-between gap-6 rounded-3xl border-2 px-6 py-4"
    style="border: 2px solid rgb(64, 64, 64); background-color: transparent"
  >
    <div class="items-left flex flex-col gap-2">
      <div
        class="flex h-6 w-6 items-center justify-center rounded-full"
        style="border: 2px solid rgb(64, 64, 64); background-color: transparent"
      ></div>
      <span class="text-xs font-medium">No issues</span>
    </div>
    <div class="items-left flex flex-col gap-2">
      <div
        class="flex h-6 w-6 items-center justify-center rounded-full"
        style="border: 2px solid rgb(64, 64, 64); background-color: rgba(64, 64, 64, 0.25)"
      ></div>
      <span class="text-xs font-medium">Minor</span>
    </div>
    <div class="items-left flex flex-col gap-2">
      <div
        class="flex h-6 w-6 items-center justify-center rounded-full"
        style="border: 2px solid rgb(64, 64, 64); background-color: rgba(64, 64, 64, 0.5)"
      ></div>
      <span class="text-xs font-medium">Partial</span>
    </div>
    <div class="items-left flex flex-col gap-2">
      <div
        class="flex h-6 w-6 items-center justify-center rounded-full"
        style="border: 2px solid rgb(64, 64, 64); background-color: rgba(64, 64, 64, 0.75)"
      ></div>
      <span class="text-xs font-medium">Major</span>
    </div>
    <div class="items-left flex flex-col gap-2">
      <div
        class="flex h-6 w-6 items-center justify-center rounded-full"
        style="border: 2px solid rgb(64, 64, 64); background-color: rgba(64, 64, 64, 1)"
      ></div>
      <span class="text-xs font-medium">Outage</span>
    </div>
  </div>
</div>

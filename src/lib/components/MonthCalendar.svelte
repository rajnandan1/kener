<script lang="ts">
  import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    getUnixTime,
    startOfDay,
    format,
  } from "date-fns";
  import { t } from "$lib/stores/i18n";

  interface DayCount {
    incidents: number;
    maintenances: number;
  }

  interface Props {
    monthDate: Date;
    counts: Record<number, DayCount>;
    onDaySelect?: (dayTs: number) => void;
  }

  let { monthDate, counts, onDaySelect }: Props = $props();

  const weekStartsOn = 0 as const; // Sunday — matches most en-US status pages

  const days = $derived.by(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  });

  const weekdayLabels = $derived.by(() => {
    // Build a 7-entry list of localized short weekday names starting at weekStartsOn.
    const ref = startOfWeek(new Date(), { weekStartsOn });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ref);
      d.setDate(ref.getDate() + i);
      return format(d, "EEEEEE");
    });
  });

  const today = new Date();

  function getDayCount(d: Date): DayCount {
    const ts = getUnixTime(startOfDay(d));
    return counts[ts] ?? { incidents: 0, maintenances: 0 };
  }

  function handleClick(d: Date) {
    const c = getDayCount(d);
    if (c.incidents === 0 && c.maintenances === 0) return;
    onDaySelect?.(getUnixTime(startOfDay(d)));
  }
</script>

<div class="mx-auto w-3/4 rounded-2xl border p-2">
  <div class="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted-foreground">
    {#each weekdayLabels as label}
      <div class="py-0.5">{label}</div>
    {/each}
  </div>
  <div class="grid grid-cols-7 gap-0.5">
    {#each days as day (day.toISOString())}
      {@const inMonth = isSameMonth(day, monthDate)}
      {@const isToday = isSameDay(day, today)}
      {@const c = getDayCount(day)}
      {@const hasEvents = c.incidents > 0 || c.maintenances > 0}
      <button
        type="button"
        onclick={() => handleClick(day)}
        disabled={!hasEvents}
        aria-label={hasEvents
          ? `${format(day, "EEEE, MMMM d")} – ${c.incidents} ${$t("Total Incidents")}, ${c.maintenances} ${$t("Total Maintenances")}`
          : format(day, "EEEE, MMMM d")}
        class="relative flex aspect-[10/3] flex-col items-center justify-start rounded-md border p-0.5 transition-colors
          {inMonth ? '' : 'opacity-40'}
          {isToday ? 'border-primary bg-green-50 dark:bg-green-950/40' : 'border-transparent'}
          {hasEvents ? 'hover:bg-muted cursor-pointer' : 'cursor-default'}"
      >
        <span class="text-[11px] font-medium leading-none {isToday ? 'text-primary' : ''}">
          {format(day, "d")}
        </span>
        {#if hasEvents}
          <div class="mt-auto flex items-center justify-center gap-0.5 pb-0.5">
            {#if c.maintenances > 0}
              <span
                title="{c.maintenances} {$t('Total Maintenances')}"
                class="bg-maintenance flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none text-white"
              >
                {c.maintenances}
              </span>
            {/if}
            {#if c.incidents > 0}
              <span
                title="{c.incidents} {$t('Total Incidents')}"
                class="bg-down flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none text-white"
              >
                {c.incidents}
              </span>
            {/if}
          </div>
        {/if}
      </button>
    {/each}
  </div>
  <div class="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
    <span class="flex items-center gap-1">
      <span class="bg-maintenance inline-block size-2 rounded-full"></span>
      {$t("Total Maintenances")}
    </span>
    <span class="flex items-center gap-1">
      <span class="bg-down inline-block size-2 rounded-full"></span>
      {$t("Total Incidents")}
    </span>
  </div>
</div>

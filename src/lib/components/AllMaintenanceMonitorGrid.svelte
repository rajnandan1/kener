<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import Clock from "@lucide/svelte/icons/clock";
  import CalendarClock from "@lucide/svelte/icons/calendar-clock";
  import Timer from "@lucide/svelte/icons/timer";
  import { t } from "$lib/stores/i18n";
  import { formatDate, formatDuration } from "$lib/stores/datetime";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  interface Maintenance {
    id: number;
    title: string;
    description?: string | null;
    start_date_time: number;
    end_date_time: number;
    monitor_tag?: string;
  }

  interface Props {
    ongoingMaintenances?: Maintenance[];
    upcomingMaintenances?: Maintenance[];
    pastMaintenances?: Maintenance[];
    class?: string;
  }

  let {
    ongoingMaintenances = [],
    upcomingMaintenances = [],
    pastMaintenances = [],
    class: className = ""
  }: Props = $props();

  // Deduplicate maintenances by id (can have duplicates due to multiple monitors)
  function deduplicateMaintenances(maintenances: Maintenance[]): Maintenance[] {
    const seen = new Set<number>();
    return maintenances.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }

  // Deduplicated arrays
  let uniqueOngoing = $derived(deduplicateMaintenances(ongoingMaintenances));
  let uniqueUpcoming = $derived(deduplicateMaintenances(upcomingMaintenances));
  let uniquePast = $derived(deduplicateMaintenances(pastMaintenances));

  // Check if there's any maintenance data
  let hasAnyData = $derived(uniqueOngoing.length > 0 || uniqueUpcoming.length > 0 || uniquePast.length > 0);
</script>

{#if hasAnyData}
  <div class="bg-background rounded-3xl border {className}">
    <div class=" flex items-center justify-between p-4">
      <Badge variant="secondary" class="gap-1">{$t("Maintenances")}</Badge>
    </div>

    <div class="grid grid-cols-1 gap-0 lg:grid-cols-3">
      <!-- Ongoing Maintenances -->
      <div class="flex flex-col border-t lg:border-r">
        <div class="text-muted-foreground flex items-center justify-between gap-2 border-b p-4 text-sm font-medium">
          <div class="flex items-center gap-2">
            <div class="bg-maintenance h-2 w-2 rounded-full"></div>
            {$t("Ongoing")}
          </div>
          <div class="text-maintenance">
            <span>{uniqueOngoing.length}</span>
          </div>
        </div>
        <div class="scrollbar-hidden max-h-64 overflow-y-auto">
          {#if uniqueOngoing.length === 0}
            <p class="text-muted-foreground py-4 text-center text-xs">{$t("No ongoing maintenances")}</p>
          {:else}
            {#each uniqueOngoing as maintenance (maintenance.id)}
              <a
                href={clientResolver(resolve, `/maintenances/${maintenance.id}`)}
                class="hover:bg-muted/50 block border-b p-3 transition-colors last:border-0"
              >
                <h4 class="line-clamp-2 text-sm leading-tight font-medium">{maintenance.title}</h4>
                {#if maintenance.description}
                  <p class="text-muted-foreground mt-1 line-clamp-3 text-xs leading-relaxed">
                    {maintenance.description}
                  </p>
                {/if}
                <div class="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span class="flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    {$formatDate(maintenance.start_date_time, "MMM d, HH:mm")}
                  </span>
                  <span class="flex items-center gap-1">
                    <Timer class="h-3 w-3" />
                    {$formatDuration(maintenance.start_date_time, maintenance.end_date_time)}
                  </span>
                </div>
              </a>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Upcoming Maintenances -->
      <div class="flex flex-col border-t lg:border-r">
        <div class="text-muted-foreground flex items-center justify-between gap-2 border-b p-4 text-sm font-medium">
          <div class="flex items-center gap-2">
            <div class="bg-primary h-2 w-2 rounded-full"></div>
            {$t("Upcoming")}
          </div>
          <div>
            {uniqueUpcoming.length}
          </div>
        </div>
        <div class="scrollbar-hidden max-h-64 overflow-y-auto">
          {#if uniqueUpcoming.length === 0}
            <p class="text-muted-foreground py-4 text-center text-xs">{$t("No upcoming maintenances")}</p>
          {:else}
            {#each uniqueUpcoming as maintenance (maintenance.id)}
              <a
                href={clientResolver(resolve, `/maintenances/${maintenance.id}`)}
                class="hover:bg-muted/50 block border-b p-3 transition-colors last:border-0"
              >
                <h4 class="line-clamp-2 text-sm leading-tight font-medium">{maintenance.title}</h4>
                {#if maintenance.description}
                  <p class="text-muted-foreground mt-1 line-clamp-3 text-xs leading-relaxed">
                    {maintenance.description}
                  </p>
                {/if}
                <div class="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span class="flex items-center gap-1">
                    <CalendarClock class="h-3 w-3" />
                    {$formatDate(maintenance.start_date_time, "MMM d, HH:mm")}
                  </span>
                  <span class="flex items-center gap-1">
                    <Timer class="h-3 w-3" />
                    {$formatDuration(maintenance.start_date_time, maintenance.end_date_time)}
                  </span>
                </div>
              </a>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Past Maintenances -->
      <div class="flex flex-col border-t">
        <div class="text-muted-foreground flex items-center justify-between gap-2 border-b p-4 text-sm font-medium">
          <div class="flex items-center gap-2">
            <div class="bg-muted-foreground h-2 w-2 rounded-full"></div>

            {$t("Past")}
          </div>
          <div>
            {uniquePast.length}
          </div>
        </div>
        <div class="scrollbar-hidden max-h-64 overflow-y-auto">
          {#if uniquePast.length === 0}
            <p class="text-muted-foreground py-4 text-center text-xs">{$t("No past maintenances")}</p>
          {:else}
            {#each uniquePast as maintenance (maintenance.id)}
              <a
                href={clientResolver(resolve, `/maintenances/${maintenance.id}`)}
                class="hover:bg-muted/50 block border-b p-3 transition-colors last:border-0"
              >
                <h4 class="line-clamp-2 text-sm leading-tight font-medium">{maintenance.title}</h4>
                {#if maintenance.description}
                  <p class="text-muted-foreground mt-1 line-clamp-3 text-xs leading-relaxed">
                    {maintenance.description}
                  </p>
                {/if}
                <div class="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span class="flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    {$formatDate(maintenance.start_date_time, "MMM d, HH:mm")}
                  </span>
                  <span class="flex items-center gap-1">
                    <Timer class="h-3 w-3" />
                    {$formatDuration(maintenance.start_date_time, maintenance.end_date_time)}
                  </span>
                </div>
              </a>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

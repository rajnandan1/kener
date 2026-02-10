<script lang="ts">
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import STATUS_ICON from "$lib/icons";
  import { t } from "$lib/stores/i18n";
  import { formatDate, formatDuration } from "$lib/stores/datetime";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { GetInitials } from "$lib/clientTools.js";

  interface IncidentMonitorImpact {
    monitor_tag: string;
    monitor_impact: string;
    monitor_name: string;
    monitor_image: string | null;
  }

  interface Incident {
    id: number;
    title: string;
    monitors: IncidentMonitorImpact[];
    start_date_time: number;
    end_date_time?: number | null;
  }

  interface Props {
    incident: Incident;
    class?: string;
    hideMonitors?: boolean;
  }

  let { incident, class: className = "", hideMonitors = false }: Props = $props();
  const STATUS_STROKE = {
    UP: "stroke-up",
    DOWN: "stroke-down",
    DEGRADED: "stroke-degraded",
    MAINTENANCE: "stroke-maintenance",
    NO_DATA: "stroke-muted-foreground"
  } as const;

  // Get the highest severity impact from monitors array
  function getHighestImpact(monitors: IncidentMonitorImpact[]): keyof typeof STATUS_ICON {
    const priority: (keyof typeof STATUS_ICON)[] = ["DOWN", "DEGRADED", "MAINTENANCE"];
    for (const impact of priority) {
      if (monitors.some((m) => m.monitor_impact === impact)) {
        return impact;
      }
    }
    return (monitors[0]?.monitor_impact as keyof typeof STATUS_ICON) || "NO_DATA";
  }

  const highestImpact = $derived(getHighestImpact(incident.monitors));
  const Icon = $derived(STATUS_ICON[highestImpact]);
  const strokeClass = $derived(STATUS_STROKE[highestImpact as keyof typeof STATUS_STROKE] || "stroke-down");

  // Calculate duration between start and end (or now if ongoing)
  // If ongoing, use current timestamp for duration calculation
  const endTimeForDuration = $derived(incident.end_date_time ?? Math.floor(Date.now() / 1000));
</script>

<Item.Root class="items-start p-0 {className} sm:items-center">
  <Item.Media class="pt-0.5 sm:pt-0">
    <Icon class="size-6 {strokeClass}" />
  </Item.Media>
  <Item.Content class="min-w-0 flex-1">
    <div class="flex items-center gap-2">
      <Item.Title class="min-w-0 wrap-break-word">{incident.title}</Item.Title>
    </div>

    {#if incident.monitors && incident.monitors.length > 0 && !hideMonitors}
      <div class="my-1 overflow-x-auto p-1">
        <div class="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2">
          {#each incident.monitors as monitor}
            <Popover.Root>
              <Popover.Trigger>
                <Avatar.Root
                  class="bg-background size-8 shrink-0 cursor-pointer border-2 border-{monitor.monitor_impact.toLowerCase()} transition-transform duration-100 ease-in-out hover:scale-[1.1] hover:border"
                >
                  {#if monitor.monitor_image}
                    <Avatar.Image
                      src={clientResolver(resolve, monitor.monitor_image)}
                      alt={monitor.monitor_name}
                      class="object-cover"
                    />
                  {/if}
                  <Avatar.Fallback class="text-xs">{GetInitials(monitor.monitor_name)}</Avatar.Fallback>
                </Avatar.Root>
              </Popover.Trigger>
              <Popover.Content class="w-64">
                <div class="flex flex-col gap-3">
                  <div class="flex items-center gap-3">
                    <Avatar.Root>
                      {#if monitor.monitor_image}
                        <Avatar.Image src={clientResolver(resolve, monitor.monitor_image)} alt={monitor.monitor_name} />
                      {/if}
                      <Avatar.Fallback>{GetInitials(monitor.monitor_name)}</Avatar.Fallback>
                    </Avatar.Root>
                    <div class="flex flex-col">
                      <span class="font-medium">{monitor.monitor_name}</span>
                      <span class="text-muted-foreground text-xs">{monitor.monitor_tag}</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <Badge variant="outline" class="text-{monitor.monitor_impact.toLowerCase()}">
                      {$t(monitor.monitor_impact)}
                    </Badge>
                    <Button
                      variant="outline"
                      class="rounded-btn"
                      size="icon-sm"
                      href={clientResolver(resolve, `/monitors/${monitor.monitor_tag}`)}
                    >
                      <ArrowRight class="size-3" />
                    </Button>
                  </div>
                </div>
              </Popover.Content>
            </Popover.Root>
          {/each}
        </div>
      </div>
    {/if}

    <Item.Description
      class="mt-2 flex w-full flex-col gap-2 text-xs font-medium sm:flex-row sm:items-center sm:justify-between"
    >
      <span class="max-w-full rounded-full border px-3 py-2 wrap-break-word">
        {$formatDate(incident.start_date_time, "PPp")}
      </span>
      <span class="relative w-full text-center sm:flex-1">
        <span
          class="absolute top-0 bottom-0 left-1/2 border-l sm:top-1/2 sm:right-0 sm:bottom-auto sm:left-0 sm:border-t sm:border-l-0"
        ></span>
        <span class="bg-background relative z-10 px-0 py-1 sm:px-2">
          {$formatDuration(incident.start_date_time, endTimeForDuration)}
        </span>
      </span>
      {#if incident.end_date_time}
        <span class="max-w-full rounded-full border px-3 py-2 wrap-break-word">
          {$formatDate(incident.end_date_time, "PPp")}
        </span>
      {:else}
        <span class="max-w-full rounded-full border px-3 py-2 wrap-break-word">
          {$t("Ongoing")}
        </span>
      {/if}
    </Item.Description>
  </Item.Content>
  <Item.Actions class="ml-auto self-start sm:ml-0 sm:self-auto">
    <Button
      variant="outline"
      class="cursor-pointer rounded-full shadow-none"
      href={clientResolver(resolve, `/incidents/${incident.id}`)}
      size="icon"
    >
      <ArrowRight />
    </Button>
  </Item.Actions>
</Item.Root>

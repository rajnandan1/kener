<script lang="ts">
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import STATUS_ICON from "$lib/icons";
  import { t } from "$lib/stores/i18n";
  import { formatDate, formatDuration } from "$lib/stores/datetime";

  interface MaintenanceMonitorImpact {
    monitor_tag: string;
    monitor_impact: string;
    monitor_name: string;
    monitor_image: string | null;
  }

  interface Maintenance {
    id: number;
    title: string;
    description: string | null;
    monitors: MaintenanceMonitorImpact[];
    start_date_time: number;
    end_date_time: number;
  }

  interface Props {
    maintenance: Maintenance;
    class?: string;
    hideMonitors?: boolean;
  }

  let { maintenance, class: className = "", hideMonitors = false }: Props = $props();

  const STATUS_STROKE = {
    UP: "stroke-up",
    DOWN: "stroke-down",
    DEGRADED: "stroke-degraded",
    MAINTENANCE: "stroke-maintenance",
    NO_DATA: "stroke-muted-foreground"
  } as const;

  const STATUS_BORDER = {
    UP: "border-up",
    DOWN: "border-down",
    DEGRADED: "border-degraded",
    MAINTENANCE: "border-maintenance",
    NO_DATA: "border-muted-foreground"
  } as const;

  // Get the highest severity impact from monitors array
  function getHighestImpact(monitors: MaintenanceMonitorImpact[]): keyof typeof STATUS_ICON {
    const priority: (keyof typeof STATUS_ICON)[] = ["DOWN", "DEGRADED", "MAINTENANCE"];
    for (const impact of priority) {
      if (monitors.some((m) => m.monitor_impact === impact)) {
        return impact;
      }
    }
    return (monitors[0]?.monitor_impact as keyof typeof STATUS_ICON) || "MAINTENANCE";
  }

  // Get initials from monitor name for avatar fallback
  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  const highestImpact = $derived(getHighestImpact(maintenance.monitors));
  const Icon = $derived(STATUS_ICON[highestImpact]);
  const strokeClass = $derived(STATUS_STROKE[highestImpact as keyof typeof STATUS_STROKE] || "stroke-maintenance");
  const borderClass = $derived(STATUS_BORDER[highestImpact as keyof typeof STATUS_BORDER] || "border-maintenance");
  const textClass = $derived("text-" + highestImpact.toLowerCase());

  // Check if maintenance is ongoing (current time is between start and end)
  const isOngoing = $derived(() => {
    const now = Date.now() / 1000;
    return now >= maintenance.start_date_time && now <= maintenance.end_date_time;
  });

  // Truncate description to approximately 2-3 lines
  function truncateDescription(text: string | null, maxLength: number = 150): string {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
  }
</script>

<Item.Root class="p-0 {className}">
  <Item.Media>
    <Icon class="size-6 {strokeClass}" />
  </Item.Media>
  <Item.Content>
    <div class="flex items-center gap-2">
      <Item.Title>{maintenance.title}</Item.Title>
      {#if isOngoing()}
        <Badge variant="outline" class="text-maintenance border-maintenance text-xs">{$t("In Progress")}</Badge>
      {/if}
    </div>

    {#if maintenance.description}
      <p class="text-muted-foreground mt-1 text-sm">
        {truncateDescription(maintenance.description)}
      </p>
    {/if}

    {#if maintenance.monitors && maintenance.monitors.length > 0 && !hideMonitors}
      <div class="*:data-[slot=avatar]:ring-background my-2 flex -space-x-2 *:data-[slot=avatar]:ring-2">
        {#each maintenance.monitors as monitor}
          <Popover.Root>
            <Popover.Trigger>
              <Avatar.Root
                class="bg-background border-{monitor.monitor_impact.toLowerCase()} size-8 cursor-pointer border-2 transition-transform duration-100 ease-in-out hover:scale-[1.1] hover:border"
              >
                {#if monitor.monitor_image}
                  <Avatar.Image src={monitor.monitor_image} alt={monitor.monitor_name} class="object-cover" />
                {/if}
                <Avatar.Fallback class="text-xs">{getInitials(monitor.monitor_name)}</Avatar.Fallback>
              </Avatar.Root>
            </Popover.Trigger>
            <Popover.Content class="w-64">
              <div class="flex flex-col gap-3">
                <div class="flex items-center gap-3">
                  <Avatar.Root>
                    {#if monitor.monitor_image}
                      <Avatar.Image src={monitor.monitor_image} alt={monitor.monitor_name} />
                    {/if}
                    <Avatar.Fallback>{getInitials(monitor.monitor_name)}</Avatar.Fallback>
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
                  <Button variant="outline" class="rounded-btn" size="icon-sm" href="/monitors/{monitor.monitor_tag}">
                    <ArrowRight class="size-3" />
                  </Button>
                </div>
              </div>
            </Popover.Content>
          </Popover.Root>
        {/each}
      </div>
    {/if}

    <Item.Description>
      <div class="mt-2 flex items-center justify-between text-xs font-medium">
        <div class="rounded-full border px-3 py-2">
          {$formatDate(maintenance.start_date_time, "PPp")}
        </div>
        <div class="relative flex-1 text-center">
          <div class="absolute top-1/2 right-0 left-0 border-t border-solid"></div>
          <span class="bg-background relative z-10 px-2 py-1 font-medium"
            >{$formatDuration(maintenance.start_date_time, maintenance.end_date_time)}</span
          >
        </div>
        <div class="rounded-full border px-3 py-2">
          {$formatDate(maintenance.end_date_time, "PPp")}
        </div>
      </div>
    </Item.Description>
  </Item.Content>
  <Item.Actions>
    <Button
      variant="outline"
      class="cursor-pointer rounded-full shadow-none"
      href="/maintenances/{maintenance.id}"
      size="icon"
    >
      <ArrowRight />
    </Button>
  </Item.Actions>
</Item.Root>

<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import MonitorIcon from "@lucide/svelte/icons/monitor";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import ZapIcon from "@lucide/svelte/icons/zap";
  import WrenchIcon from "@lucide/svelte/icons/wrench";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import ActivityIcon from "@lucide/svelte/icons/activity";
  import { format } from "date-fns";

  interface MaintenanceEvent {
    id: number;
    maintenance_id: number;
    start_date_time: number;
    end_date_time: number;
    status: string;
    created_at: string;
    updated_at: string;
  }

  interface MonitorWithStatus {
    id: number;
    tag: string;
    name: string;
    monitorStatus: string;
    currentStatus: string | null;
  }

  interface PageData {
    monitorsCount: number;
    monitorsWithStatus: MonitorWithStatus[];
    pagesCount: number;
    triggersCount: number;
    ongoingMaintenances: MaintenanceEvent[];
    upcomingMaintenances: MaintenanceEvent[];
  }

  let { data }: { data: PageData } = $props();

  function formatDateTime(timestamp: number): string {
    return format(new Date(timestamp * 1000), "MMM dd, yyyy HH:mm");
  }

  function getMaintenanceStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "IN_PROGRESS":
        return "destructive";
      case "SCHEDULED":
        return "secondary";
      case "COMPLETED":
        return "default";
      default:
        return "outline";
    }
  }

  function getMonitorStatusColor(status: string | null): string {
    switch (status) {
      case "UP":
        return "bg-up";
      case "DOWN":
        return "bg-down";
      case "DEGRADED":
        return "bg-degraded";
      default:
        return "bg-muted-foreground";
    }
  }

  function getMonitorStatusBadgeVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "UP":
        return "default";
      case "DOWN":
        return "destructive";
      case "DEGRADED":
        return "outline";
      default:
        return "secondary";
    }
  }
</script>

<div class="flex flex-1 flex-col gap-6 p-6">
  <div>
    <h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
    <p class="text-muted-foreground">Overview of your status page</p>
  </div>

  <!-- Stats Cards -->
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Monitors</Card.Title>
        <MonitorIcon class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{data.monitorsCount}</div>
        <p class="text-muted-foreground text-xs">Total monitors configured</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Pages</Card.Title>
        <FileTextIcon class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{data.pagesCount}</div>
        <p class="text-muted-foreground text-xs">Status pages created</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Triggers</Card.Title>
        <ZapIcon class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{data.triggersCount}</div>
        <p class="text-muted-foreground text-xs">Alert triggers configured</p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Monitors Status Section -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center gap-2">
        <ActivityIcon class="h-5 w-5 text-blue-500" />
        <Card.Title>Monitor Status</Card.Title>
      </div>
      <Card.Description>Current status of all monitors</Card.Description>
    </Card.Header>
    <Card.Content>
      {#if data.monitorsWithStatus.length === 0}
        <p class="text-muted-foreground text-sm">No monitors configured</p>
      {:else}
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {#each data.monitorsWithStatus as monitor}
            <div class="flex items-center gap-3 rounded-lg border p-3">
              <div class="h-3 w-3 rounded-full {getMonitorStatusColor(monitor.currentStatus)}"></div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium" title={monitor.name}>{monitor.name}</p>
                <p class="text-muted-foreground truncate text-xs" title={monitor.tag}>{monitor.tag}</p>
              </div>
              {#if monitor.monitorStatus === "INACTIVE"}
                <Badge>Inactive</Badge>
              {:else}
                <Badge
                  class="bg-{monitor.currentStatus?.toLowerCase() || 'muted-foreground'}"
                  variant={getMonitorStatusBadgeVariant(monitor.currentStatus)}
                >
                  {monitor.currentStatus || "NO DATA"}
                </Badge>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Maintenance Section -->
  <div class="grid gap-4 md:grid-cols-2">
    <!-- Ongoing Maintenances -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-2">
          <WrenchIcon class="h-5 w-5 text-orange-500" />
          <Card.Title>Ongoing Maintenances</Card.Title>
        </div>
        <Card.Description>Currently active maintenance windows</Card.Description>
      </Card.Header>
      <Card.Content>
        {#if data.ongoingMaintenances.length === 0}
          <p class="text-muted-foreground text-sm">No ongoing maintenances</p>
        {:else}
          <div class="space-y-3">
            {#each data.ongoingMaintenances as event}
              <div class="flex items-center justify-between rounded-lg border p-3">
                <div class="space-y-1">
                  <p class="text-sm font-medium">Maintenance #{event.maintenance_id}</p>
                  <p class="text-muted-foreground text-xs">
                    {formatDateTime(event.start_date_time)} - {formatDateTime(event.end_date_time)}
                  </p>
                </div>
                <Badge variant={getMaintenanceStatusBadgeVariant(event.status)}>
                  {event.status.replace("_", " ")}
                </Badge>
              </div>
            {/each}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- Upcoming Maintenances -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-2">
          <CalendarIcon class="h-5 w-5 text-blue-500" />
          <Card.Title>Upcoming Maintenances</Card.Title>
        </div>
        <Card.Description>Scheduled maintenance windows</Card.Description>
      </Card.Header>
      <Card.Content>
        {#if data.upcomingMaintenances.length === 0}
          <p class="text-muted-foreground text-sm">No upcoming maintenances</p>
        {:else}
          <div class="space-y-3">
            {#each data.upcomingMaintenances.slice(0, 5) as event}
              <div class="flex items-center justify-between rounded-lg border p-3">
                <div class="space-y-1">
                  <p class="text-sm font-medium">Maintenance #{event.maintenance_id}</p>
                  <p class="text-muted-foreground text-xs">
                    Starts {formatDateTime(event.start_date_time)}
                  </p>
                </div>
                <Badge variant={getMaintenanceStatusBadgeVariant(event.status)}>
                  {event.status}
                </Badge>
              </div>
            {/each}
            {#if data.upcomingMaintenances.length > 5}
              <p class="text-muted-foreground text-center text-xs">
                +{data.upcomingMaintenances.length - 5} more scheduled
              </p>
            {/if}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>
</div>

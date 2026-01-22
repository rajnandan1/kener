<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import RepeatIcon from "@lucide/svelte/icons/repeat";
  import InfoIcon from "@lucide/svelte/icons/info";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
  import PlayCircleIcon from "@lucide/svelte/icons/play-circle";
  import type { PageProps } from "./$types";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { format, formatDistanceToNow, isPast, isFuture, isWithinInterval } from "date-fns";

  let { params }: PageProps = $props();
  const isNew = $derived(params.id === "new");

  // Types
  interface MaintenanceEvent {
    id: number;
    maintenance_id: number;
    start_date_time: number;
    end_date_time: number;
    status: string;
  }

  // Form state
  let loading = $state(true);
  let saving = $state(false);
  let error = $state<string | null>(null);

  // Schedule type for UI switching
  type ScheduleType = "ONE_TIME" | "RECURRING";
  let scheduleType = $state<ScheduleType>("ONE_TIME");

  // Maintenance data
  let maintenance = $state<{
    id: number;
    title: string;
    description: string;
    start_date_time: number;
    rrule: string;
    duration_seconds: number;
    status: "ACTIVE" | "INACTIVE";
  }>({
    id: 0,
    title: "",
    description: "",
    start_date_time: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    rrule: "FREQ=MINUTELY;COUNT=1",
    duration_seconds: 3600, // 1 hour default
    status: "ACTIVE"
  });

  // For datetime input
  let startDateTimeLocal = $state("");

  // Duration inputs (for easier UI)
  let durationHours = $state(1);
  let durationMinutes = $state(0);

  // RRULE builder for recurring
  let rruleFreq = $state("WEEKLY");
  let rruleByDay = $state<string[]>(["SU"]);
  let rruleInterval = $state(1);

  // Monitor selection
  let availableMonitors = $state<MonitorRecord[]>([]);
  let selectedMonitorTags = $state<string[]>([]);

  // Events for existing maintenance
  let events = $state<MaintenanceEvent[]>([]);
  let loadingEvents = $state(false);

  // Convert timestamp to local datetime string for input
  function timestampToLocalDatetime(ts: number): string {
    const date = new Date(ts * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Convert local datetime string to timestamp
  function localDatetimeToTimestamp(datetime: string): number {
    if (!datetime) return Math.floor(Date.now() / 1000);
    const date = new Date(datetime);
    return Math.floor(date.getTime() / 1000);
  }

  // Build RRULE string from UI inputs
  function buildRrule(): string {
    if (scheduleType === "ONE_TIME") {
      return "FREQ=MINUTELY;COUNT=1";
    }

    let rrule = `FREQ=${rruleFreq}`;

    if (rruleInterval > 1) {
      rrule += `;INTERVAL=${rruleInterval}`;
    }

    if (rruleFreq === "WEEKLY" && rruleByDay.length > 0) {
      rrule += `;BYDAY=${rruleByDay.join(",")}`;
    }

    return rrule;
  }

  // Parse RRULE string for UI
  function parseRrule(rrule: string) {
    // Check if one-time
    if (rrule.includes("COUNT=1")) {
      scheduleType = "ONE_TIME";
      return;
    }

    scheduleType = "RECURRING";

    // Parse FREQ
    const freqMatch = rrule.match(/FREQ=(\w+)/);
    if (freqMatch) rruleFreq = freqMatch[1];

    // Parse INTERVAL
    const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
    if (intervalMatch) rruleInterval = parseInt(intervalMatch[1]);

    // Parse BYDAY
    const bydayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
    if (bydayMatch) rruleByDay = bydayMatch[1].split(",");
  }

  // Calculate duration_seconds from hours and minutes
  const calculatedDurationSeconds = $derived(durationHours * 3600 + durationMinutes * 60);

  // Update duration inputs when duration_seconds changes
  function updateDurationInputs(seconds: number) {
    durationHours = Math.floor(seconds / 3600);
    durationMinutes = Math.floor((seconds % 3600) / 60);
  }

  // Validation
  const isValid = $derived.by(() => {
    if (!maintenance.title.trim()) return false;
    if (!startDateTimeLocal) return false;
    if (calculatedDurationSeconds <= 0) return false;
    if (scheduleType === "RECURRING" && rruleByDay.length === 0 && rruleFreq === "WEEKLY") return false;
    return true;
  });

  // Fetch maintenance data
  async function fetchMaintenance() {
    if (isNew) {
      // Set default start time
      const now = new Date();
      now.setMinutes(now.getMinutes() + 60);
      startDateTimeLocal = timestampToLocalDatetime(Math.floor(now.getTime() / 1000));
      loading = false;
      return;
    }

    loading = true;
    error = null;
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getMaintenance", data: { id: parseInt(params.id) } })
      });
      const result = await response.json();
      if (result.error) {
        error = result.error;
      } else if (result) {
        maintenance = {
          id: result.id,
          title: result.title,
          description: result.description || "",
          start_date_time: result.start_date_time,
          rrule: result.rrule,
          duration_seconds: result.duration_seconds,
          status: result.status
        };

        // Parse RRULE for UI
        parseRrule(result.rrule);

        // Set UI values
        startDateTimeLocal = timestampToLocalDatetime(result.start_date_time);
        updateDurationInputs(result.duration_seconds);

        // Set monitors
        if (result.monitors) {
          selectedMonitorTags = result.monitors.map((m: { monitor_tag: string }) => m.monitor_tag);
        }

        events = result.events || [];
      } else {
        error = "Maintenance not found";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to fetch maintenance";
    } finally {
      loading = false;
    }
  }

  // Fetch events
  async function fetchEvents() {
    loadingEvents = true;
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getMaintenanceEvents", data: { maintenance_id: parseInt(params.id) } })
      });
      const result = await response.json();
      if (!result.error) {
        events = result;
      }
    } catch {
      // Ignore errors
    } finally {
      loadingEvents = false;
    }
  }

  // Fetch available monitors
  async function fetchAvailableMonitors() {
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getMonitors", data: { status: "ACTIVE" } })
      });
      const result = await response.json();
      if (!result.error) {
        availableMonitors = result;
      }
    } catch {
      // Ignore errors
    }
  }

  // Save maintenance
  async function saveMaintenance() {
    if (!isValid) return;
    saving = true;
    error = null;

    try {
      const rrule = buildRrule();
      const startTime = localDatetimeToTimestamp(startDateTimeLocal);

      if (isNew) {
        const createData = {
          title: maintenance.title,
          description: maintenance.description || null,
          start_date_time: startTime,
          rrule,
          duration_seconds: calculatedDurationSeconds,
          monitor_tags: selectedMonitorTags
        };

        const response = await fetch("/manage/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "createMaintenance", data: createData })
        });
        const result = await response.json();
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Maintenance created successfully");
          goto(`/manage/app/maintenances/${result.maintenance_id}`);
        }
      } else {
        const updateData = {
          id: maintenance.id,
          title: maintenance.title,
          description: maintenance.description || null,
          start_date_time: startTime,
          rrule,
          duration_seconds: calculatedDurationSeconds,
          status: maintenance.status,
          monitor_tags: selectedMonitorTags
        };

        const response = await fetch("/manage/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "updateMaintenance", data: updateData })
        });
        const result = await response.json();
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Maintenance updated successfully");
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      saving = false;
    }
  }

  // Delete maintenance
  async function deleteMaintenance() {
    if (!confirm("Are you sure you want to delete this maintenance? All events will also be deleted.")) return;

    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteMaintenance", data: { id: maintenance.id } })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Maintenance deleted");
        goto("/manage/app/maintenances");
      }
    } catch {
      toast.error("Failed to delete maintenance");
    }
  }

  // Delete event
  async function deleteEvent(eventId: number) {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteMaintenanceEvent", data: { id: eventId } })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Event deleted");
        await fetchEvents();
      }
    } catch {
      toast.error("Failed to delete event");
    }
  }

  // Compute event display status based on current time
  interface EventDisplayStatus {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: "clock" | "play" | "check";
  }

  function getEventDisplayStatus(event: MaintenanceEvent): EventDisplayStatus {
    const now = new Date();
    const startDate = new Date(event.start_date_time * 1000);
    const endDate = new Date(event.end_date_time * 1000);

    // Check if currently ongoing
    if (isWithinInterval(now, { start: startDate, end: endDate })) {
      return {
        label: "Ongoing",
        variant: "default",
        icon: "play"
      };
    }

    // Check if in the future (upcoming)
    if (isFuture(startDate)) {
      const distance = formatDistanceToNow(startDate, { addSuffix: false });
      return {
        label: `Upcoming • starts in ${distance}`,
        variant: "outline",
        icon: "clock"
      };
    }

    // If in the past (completed)
    if (isPast(endDate)) {
      return {
        label: "Completed",
        variant: "secondary",
        icon: "check"
      };
    }

    // Fallback
    return {
      label: "Scheduled",
      variant: "outline",
      icon: "clock"
    };
  }

  // Toggle monitor selection
  function toggleMonitor(tag: string) {
    if (selectedMonitorTags.includes(tag)) {
      selectedMonitorTags = selectedMonitorTags.filter((t) => t !== tag);
    } else {
      selectedMonitorTags = [...selectedMonitorTags, tag];
    }
  }

  // Toggle day selection for RRULE
  function toggleDay(day: string) {
    if (rruleByDay.includes(day)) {
      rruleByDay = rruleByDay.filter((d) => d !== day);
    } else {
      rruleByDay = [...rruleByDay, day];
    }
  }

  // Days of week for RRULE
  const daysOfWeek = [
    { value: "MO", label: "Mon" },
    { value: "TU", label: "Tue" },
    { value: "WE", label: "Wed" },
    { value: "TH", label: "Thu" },
    { value: "FR", label: "Fri" },
    { value: "SA", label: "Sat" },
    { value: "SU", label: "Sun" }
  ];

  $effect(() => {
    fetchMaintenance();
    fetchAvailableMonitors();
  });
</script>

<div class="container space-y-6 py-6">
  <!-- Breadcrumb -->
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Link href="/manage/app">Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Link href="/manage/app/maintenances">Maintenances</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>{isNew ? "New Maintenance" : `Edit #${params.id}`}</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="size-8" />
    </div>
  {:else if error}
    <Card.Root class="border-destructive">
      <Card.Content class="pt-6">
        <div class="flex items-center gap-2">
          <AlertTriangleIcon class="text-destructive size-5" />
          <p class="text-destructive">{error}</p>
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Main Details Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>{isNew ? "Create New Maintenance" : "Maintenance Details"}</Card.Title>
        <Card.Description>
          {#if isNew}
            Schedule a new maintenance window using iCalendar RRULE format
          {:else}
            Edit maintenance details
          {/if}
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Schedule Type Selection -->
        <div class="flex flex-col gap-3">
          <Label>Schedule Type <span class="text-destructive">*</span></Label>
          <RadioGroup.Root bind:value={scheduleType} class="flex gap-6">
            <div class="flex items-center gap-2">
              <RadioGroup.Item value="ONE_TIME" id="type-onetime" />
              <Label for="type-onetime" class="flex cursor-pointer items-center gap-2 font-normal">
                <CalendarIcon class="size-4" />
                One-Time
              </Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroup.Item value="RECURRING" id="type-recurring" />
              <Label for="type-recurring" class="flex cursor-pointer items-center gap-2 font-normal">
                <RepeatIcon class="size-4" />
                Recurring
              </Label>
            </div>
          </RadioGroup.Root>
        </div>

        <!-- Title -->
        <div class="flex flex-col gap-2">
          <Label for="title">Title <span class="text-destructive">*</span></Label>
          <Input id="title" bind:value={maintenance.title} placeholder="Scheduled maintenance window" />
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-2">
          <Label for="description">Description</Label>
          <Textarea
            id="description"
            bind:value={maintenance.description}
            placeholder="Details about the maintenance..."
            rows={3}
          />
        </div>

        <!-- Start Date/Time -->
        <div class="flex flex-col gap-2">
          <Label for="start-time">
            {scheduleType === "ONE_TIME" ? "Start Date/Time" : "First Occurrence Date/Time"}
            <span class="text-destructive">*</span>
          </Label>
          <Input id="start-time" type="datetime-local" bind:value={startDateTimeLocal} />
          {#if scheduleType === "RECURRING"}
            <p class="text-muted-foreground text-xs">
              Recurring maintenances will occur at this same time of day. The date pattern is configured below.
            </p>
          {/if}
        </div>

        <!-- Duration -->
        <div class="flex flex-col gap-2">
          <Label>Duration <span class="text-destructive">*</span></Label>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1">
              <Input type="number" min={0} max={72} class="w-20" bind:value={durationHours} />
              <span class="text-muted-foreground text-sm">hours</span>
            </div>
            <div class="flex items-center gap-1">
              <Input type="number" min={0} max={59} class="w-20" bind:value={durationMinutes} />
              <span class="text-muted-foreground text-sm">minutes</span>
            </div>
          </div>
          <p class="text-muted-foreground text-xs">
            Total: {calculatedDurationSeconds} seconds ({Math.floor(calculatedDurationSeconds / 60)} minutes)
          </p>
        </div>

        <!-- RRULE Configuration for Recurring -->
        {#if scheduleType === "RECURRING"}
          <Card.Root class="bg-muted/50">
            <Card.Header class="pb-3">
              <Card.Title class="flex items-center gap-2 text-base">
                <InfoIcon class="size-4" />
                Recurrence Pattern (RRULE)
              </Card.Title>
            </Card.Header>
            <Card.Content class="space-y-4">
              <!-- Frequency -->
              <div class="flex flex-col gap-2">
                <Label>Frequency</Label>
                <Select.Root type="single" bind:value={rruleFreq}>
                  <Select.Trigger class="w-48">
                    {rruleFreq === "DAILY" ? "Daily" : rruleFreq === "WEEKLY" ? "Weekly" : "Monthly"}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="DAILY">Daily</Select.Item>
                    <Select.Item value="WEEKLY">Weekly</Select.Item>
                    <Select.Item value="MONTHLY">Monthly</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Interval -->
              <div class="flex flex-col gap-2">
                <Label>Every</Label>
                <div class="flex items-center gap-2">
                  <Input type="number" min={1} max={12} class="w-20" bind:value={rruleInterval} />
                  <span class="text-muted-foreground text-sm">
                    {rruleFreq === "DAILY" ? "day(s)" : rruleFreq === "WEEKLY" ? "week(s)" : "month(s)"}
                  </span>
                </div>
              </div>

              <!-- Days of Week (for WEEKLY) -->
              {#if rruleFreq === "WEEKLY"}
                <div class="flex flex-col gap-2">
                  <Label>On Days <span class="text-destructive">*</span></Label>
                  <div class="flex flex-wrap gap-2">
                    {#each daysOfWeek as day}
                      <Button
                        variant={rruleByDay.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onclick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </Button>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Preview -->
              <div class="bg-background rounded-md border p-3">
                <Label class="text-muted-foreground text-xs">Generated RRULE:</Label>
                <code class="mt-1 block text-sm">{buildRrule()}</code>
              </div>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Monitor Selection -->
        <div class="flex flex-col gap-2">
          <Label>Affected Monitors</Label>
          <div class="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-3">
            {#each availableMonitors as monitor}
              <div class="flex items-center gap-2">
                <Checkbox
                  id="monitor-{monitor.tag}"
                  checked={selectedMonitorTags.includes(monitor.tag)}
                  onCheckedChange={() => toggleMonitor(monitor.tag)}
                />
                <Label for="monitor-{monitor.tag}" class="cursor-pointer text-sm font-normal">
                  {monitor.name}
                </Label>
              </div>
            {/each}
            {#if availableMonitors.length === 0}
              <p class="text-muted-foreground col-span-2 text-sm">No monitors available</p>
            {/if}
          </div>
          <p class="text-muted-foreground text-xs">Select monitors that will be affected by this maintenance</p>
        </div>

        <!-- Status Toggle (only for existing) -->
        {#if !isNew}
          <div class="flex flex-col gap-2">
            <Label>Status</Label>
            <div class="flex gap-2">
              <Button
                variant={maintenance.status === "ACTIVE" ? "default" : "outline"}
                size="sm"
                onclick={() => (maintenance.status = "ACTIVE")}
              >
                Active
              </Button>
              <Button
                variant={maintenance.status === "INACTIVE" ? "default" : "outline"}
                size="sm"
                onclick={() => (maintenance.status = "INACTIVE")}
              >
                Inactive
              </Button>
            </div>
          </div>
        {/if}
      </Card.Content>
      <Card.Footer class="flex justify-end gap-2">
        {#if !isNew}
          <Button variant="destructive" onclick={deleteMaintenance}>
            <TrashIcon class="mr-2 size-4" />
            Delete
          </Button>
        {/if}
        <Button onclick={saveMaintenance} disabled={saving || !isValid}>
          {#if saving}
            <Loader class="mr-2 size-4 animate-spin" />
          {:else}
            <SaveIcon class="mr-2 size-4" />
          {/if}
          {isNew ? "Create Maintenance" : "Save Changes"}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Events Section (only for existing) -->
    {#if !isNew}
      <Card.Root>
        <Card.Header>
          <div>
            <Card.Title>Maintenance Events</Card.Title>
            <Card.Description>Pre-generated maintenance windows for the next 7 days</Card.Description>
          </div>
        </Card.Header>
        <Card.Content>
          {#if loadingEvents}
            <div class="flex justify-center py-4">
              <Spinner class="size-6" />
            </div>
          {:else if events.length === 0}
            <p class="text-muted-foreground py-4 text-center text-sm">
              No events scheduled. Events are generated automatically when maintenance is created or updated.
            </p>
          {:else}
            <div class="space-y-3">
              {#each events as event}
                {@const displayStatus = getEventDisplayStatus(event)}
                <div class="flex items-center justify-between rounded-md border p-4">
                  <div class="flex items-center gap-3">
                    <div class="bg-muted flex size-8 items-center justify-center rounded-full">
                      {#if displayStatus.icon === "play"}
                        <PlayCircleIcon class="text-primary size-4" />
                      {:else if displayStatus.icon === "check"}
                        <CheckCircleIcon class="text-muted-foreground size-4" />
                      {:else}
                        <ClockIcon class="text-muted-foreground size-4" />
                      {/if}
                    </div>
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <Badge variant={displayStatus.variant}>{displayStatus.label}</Badge>
                      </div>
                      <p class="text-muted-foreground text-sm">
                        {format(new Date(event.start_date_time * 1000), "MMM d, yyyy HH:mm")}
                        →
                        {format(new Date(event.end_date_time * 1000), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onclick={() => deleteEvent(event.id)}>
                    <TrashIcon class="size-4" />
                  </Button>
                </div>
              {/each}
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}
  {/if}
</div>

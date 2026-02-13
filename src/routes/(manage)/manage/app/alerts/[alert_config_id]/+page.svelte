<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import GC from "$lib/global-constants";
  import type {
    TriggerRecord,
    MonitorAlertConfigWithTriggers,
    AlertForType,
    AlertSeverityType,
    YesNoType
  } from "$lib/server/types/db";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  let { data } = $props();
  const alertConfigId = $derived(data.alert_config_id);
  const isNew = $derived(alertConfigId === "new");

  // State
  let loading = $state(true);
  let saving = $state(false);
  let triggers = $state<TriggerRecord[]>([]);
  let monitors = $state<{ tag: string; name: string }[]>([]);
  let deleteDialogOpen = $state(false);

  // Form state
  const defaultForm = {
    monitor_tag: "",
    alert_for: "STATUS" as AlertForType,
    alert_value: "DOWN",
    failure_threshold: 3,
    success_threshold: 1,
    alert_description: "",
    create_incident: "NO" as YesNoType,
    is_active: "YES" as YesNoType,
    severity: "WARNING" as AlertSeverityType,
    trigger_ids: [] as number[]
  };

  let form = $state({ ...defaultForm });

  // Options
  const alertForOptions: { value: AlertForType; label: string }[] = [
    { value: GC.STATUS, label: GC.STATUS },
    { value: GC.LATENCY, label: GC.LATENCY },
    { value: GC.UPTIME, label: GC.UPTIME }
  ];

  const statusValueOptions = [
    { value: GC.DOWN, label: GC.DOWN },
    { value: GC.DEGRADED, label: GC.DEGRADED }
  ];

  const severityOptions: { value: AlertSeverityType; label: string }[] = [
    { value: GC.CRITICAL, label: GC.CRITICAL },
    { value: GC.WARNING, label: GC.WARNING }
  ];

  const yesNoOptions: { value: YesNoType; label: string }[] = [
    { value: GC.YES, label: GC.YES },
    { value: GC.NO, label: GC.NO }
  ];

  // Computed labels
  const alertValueLabel = $derived(() => {
    switch (form.alert_for) {
      case GC.STATUS:
        return "Status Value";
      case GC.LATENCY:
        return "Latency Threshold (ms)";
      case GC.UPTIME:
        return "Uptime Threshold (%)";
      default:
        return "Value";
    }
  });

  const alertValueHelp = $derived(() => {
    switch (form.alert_for) {
      case GC.STATUS:
        return `Alert when monitor status equals this value`;
      case GC.LATENCY:
        return `Alert when latency exceeds this value (in milliseconds)`;
      case GC.UPTIME:
        return `Alert when uptime falls below this percentage`;
      default:
        return "";
    }
  });

  // Handlers
  function handleAlertForChange(newValue: AlertForType) {
    form.alert_for = newValue;
    if (newValue === GC.STATUS) {
      form.alert_value = GC.DOWN;
    } else if (newValue === GC.LATENCY) {
      form.alert_value = "1000";
    } else if (newValue === GC.UPTIME) {
      form.alert_value = "99";
    }
  }

  function toggleTrigger(triggerId: number) {
    if (form.trigger_ids.includes(triggerId)) {
      form.trigger_ids = form.trigger_ids.filter((id) => id !== triggerId);
    } else {
      form.trigger_ids = [...form.trigger_ids, triggerId];
    }
  }

  // API calls
  async function loadTriggers() {
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getTriggers",
          data: { status: GC.ACTIVE }
        })
      });
      triggers = await response.json();
    } catch (error) {
      console.error("Failed to load triggers", error);
    }
  }

  async function loadMonitors() {
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getMonitors",
          data: {}
        })
      });
      const result = await response.json();
      if (!result.error && Array.isArray(result)) {
        monitors = result.map((m: { tag: string; name: string }) => ({ tag: m.tag, name: m.name }));
      }
    } catch (error) {
      console.error("Failed to load monitors", error);
    }
  }

  async function loadAlertConfig() {
    if (isNew) return;

    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getMonitorAlertConfigById",
          data: { id: parseInt(alertConfigId) }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
        goto(clientResolver(resolve, "/manage/app/alerts"));
      } else {
        const config = result as MonitorAlertConfigWithTriggers;
        form = {
          monitor_tag: config.monitor_tag,
          alert_for: config.alert_for,
          alert_value: config.alert_value,
          failure_threshold: config.failure_threshold,
          success_threshold: config.success_threshold,
          alert_description: config.alert_description || "",
          create_incident: config.create_incident,
          is_active: config.is_active,
          severity: config.severity,
          trigger_ids: config.triggers.map((t) => t.id)
        };
      }
    } catch (error) {
      console.error("Failed to load alert config", error);
      toast.error("Failed to load alert configuration");
      goto(clientResolver(resolve, "/manage/app/alerts"));
    }
  }

  async function saveAlertConfig() {
    if (!form.monitor_tag) {
      toast.error("Please select a monitor");
      return;
    }

    saving = true;
    try {
      const action = isNew ? "createMonitorAlertConfig" : "updateMonitorAlertConfig";
      const data: Record<string, unknown> = {
        monitor_tag: form.monitor_tag,
        alert_for: form.alert_for,
        alert_value: form.alert_value,
        failure_threshold: form.failure_threshold,
        success_threshold: form.success_threshold,
        alert_description: form.alert_description || null,
        create_incident: form.create_incident,
        severity: form.severity,
        trigger_ids: form.trigger_ids
      };

      if (!isNew) {
        data.id = parseInt(alertConfigId);
        data.is_active = form.is_active;
      }

      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isNew ? "Alert created successfully" : "Alert updated successfully");
        if (isNew) {
          goto(clientResolver(resolve, `/manage/app/alerts/${result.id}`));
        }
      }
    } catch (error) {
      toast.error("Failed to save alert");
    } finally {
      saving = false;
    }
  }

  async function deleteAlertConfig() {
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteMonitorAlertConfig",
          data: { id: parseInt(alertConfigId) }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Alert deleted successfully");
        goto(clientResolver(resolve, "/manage/app/alerts"));
      }
    } catch (error) {
      toast.error("Failed to delete alert");
    } finally {
      deleteDialogOpen = false;
    }
  }

  onMount(async () => {
    loading = true;
    await Promise.all([loadTriggers(), loadMonitors(), loadAlertConfig()]);
    loading = false;
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Breadcrumb -->
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Link href={clientResolver(resolve, "/manage/app/alerts")}>Alerts</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>{isNew ? "New Alert" : `Edit Alert #${alertConfigId}`}</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>

  {#if loading}
    <div class="flex flex-col items-center gap-4 py-16">
      <Spinner class="size-8" />
      <p class="text-muted-foreground">Loading...</p>
    </div>
  {:else}
    <Card.Root>
      <Card.Content class="space-y-6 pt-6">
        <!-- Monitor Selection -->
        <div class="flex flex-col gap-2">
          <Label for="monitor">Monitor</Label>
          <Select.Root
            type="single"
            value={form.monitor_tag}
            onValueChange={(v) => v && (form.monitor_tag = v)}
            disabled={!isNew}
          >
            <Select.Trigger id="monitor" class="w-full">
              {form.monitor_tag
                ? monitors.find((m) => m.tag === form.monitor_tag)?.name || form.monitor_tag
                : "Select monitor"}
            </Select.Trigger>
            <Select.Content>
              {#each monitors as monitor}
                <Select.Item value={monitor.tag}>{monitor.name}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
          {#if !isNew}
            <p class="text-muted-foreground text-xs">Monitor cannot be changed after creation</p>
          {/if}
        </div>

        <!-- Alert For -->
        <div class="flex flex-col gap-2">
          <Label for="alert-for">Alert Type</Label>
          <Select.Root
            type="single"
            value={form.alert_for}
            onValueChange={(v) => v && handleAlertForChange(v as AlertForType)}
          >
            <Select.Trigger id="alert-for" class="w-full">
              {alertForOptions.find((o) => o.value === form.alert_for)?.label || "Select type"}
            </Select.Trigger>
            <Select.Content>
              {#each alertForOptions as option}
                <Select.Item value={option.value}>{option.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Alert Value -->
        <div class="flex flex-col gap-2">
          <Label for="alert-value">{alertValueLabel()}</Label>
          {#if form.alert_for === "STATUS"}
            <Select.Root type="single" value={form.alert_value} onValueChange={(v) => v && (form.alert_value = v)}>
              <Select.Trigger id="alert-value" class="w-full">
                {form.alert_value}
              </Select.Trigger>
              <Select.Content>
                {#each statusValueOptions as option}
                  <Select.Item value={option.value}>{option.label}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          {:else}
            <Input
              id="alert-value"
              type="number"
              min={form.alert_for === GC.UPTIME ? "0" : "1"}
              max={form.alert_for === GC.UPTIME ? "100" : undefined}
              bind:value={form.alert_value}
            />
          {/if}
          <p class="text-muted-foreground text-xs">{alertValueHelp()}</p>
        </div>

        <!-- Thresholds -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <Label for="failure-threshold">Failure Threshold</Label>
            <Input id="failure-threshold" type="number" min="1" bind:value={form.failure_threshold} />
            <p class="text-muted-foreground text-xs">Consecutive failures before alert</p>
          </div>

          <div class="flex flex-col gap-2">
            <Label for="success-threshold">Success Threshold</Label>
            <Input id="success-threshold" type="number" min="1" bind:value={form.success_threshold} />
            <p class="text-muted-foreground text-xs">Consecutive successes to resolve</p>
          </div>
        </div>

        <!-- Severity -->
        <div class="flex flex-col gap-2">
          <Label for="severity">Severity</Label>
          <Select.Root
            type="single"
            value={form.severity}
            onValueChange={(v) => v && (form.severity = v as AlertSeverityType)}
          >
            <Select.Trigger id="severity" class="w-full">
              {severityOptions.find((o) => o.value === form.severity)?.label || "Select severity"}
            </Select.Trigger>
            <Select.Content>
              {#each severityOptions as option}
                <Select.Item value={option.value}>{option.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Create Incident -->
        <div class="flex flex-col gap-2">
          <Label for="create-incident">Create Incident</Label>
          <Select.Root
            type="single"
            value={form.create_incident}
            onValueChange={(v) => v && (form.create_incident = v as YesNoType)}
          >
            <Select.Trigger id="create-incident" class="w-full">
              {form.create_incident}
            </Select.Trigger>
            <Select.Content>
              {#each yesNoOptions as option}
                <Select.Item value={option.value}>{option.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
          <p class="text-muted-foreground text-xs">Automatically create an incident when this alert triggers</p>
        </div>

        <!-- Is Active (only when editing) -->
        {#if !isNew}
          <div class="flex items-center justify-between">
            <div>
              <Label>Active</Label>
              <p class="text-muted-foreground text-xs">Enable or disable this alert</p>
            </div>
            <Switch
              checked={form.is_active === GC.YES}
              onCheckedChange={(checked) => (form.is_active = checked ? GC.YES : GC.NO)}
            />
          </div>
        {/if}

        <!-- Description -->
        <div class="flex flex-col gap-2">
          <Label for="alert-description">Description (optional)</Label>
          <Textarea
            id="alert-description"
            placeholder="Add a description for this alert..."
            bind:value={form.alert_description}
            rows={2}
          />
        </div>

        <!-- Triggers -->
        {#if triggers.length > 0}
          <div class="flex flex-col gap-2">
            <Label>Notification Triggers</Label>
            <p class="text-muted-foreground text-xs">Select which triggers to notify when this alert fires</p>
            <div class="mt-2 grid gap-2">
              {#each triggers as trigger (trigger.id)}
                <label
                  class="bg-muted/30 hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md border p-3"
                >
                  <Checkbox
                    checked={form.trigger_ids.includes(trigger.id)}
                    onCheckedChange={() => toggleTrigger(trigger.id)}
                  />
                  <div class="flex-1">
                    <p class="text-sm font-medium">{trigger.name}</p>
                    {#if trigger.trigger_desc}
                      <p class="text-muted-foreground text-xs">{trigger.trigger_desc}</p>
                    {/if}
                  </div>
                  <Badge variant="outline" class="text-xs capitalize">{trigger.trigger_type}</Badge>
                </label>
              {/each}
            </div>
          </div>
        {:else}
          <p class="text-muted-foreground text-sm">
            No notification triggers available. <a
              href={clientResolver(resolve, "/manage/app/triggers")}
              class="text-primary underline">Create a trigger</a
            > to receive notifications.
          </p>
        {/if}
      </Card.Content>

      <Card.Footer class="flex justify-between">
        <Button variant="outline" onclick={() => goto(clientResolver(resolve, "/manage/app/alerts"))}>Cancel</Button>
        <Button onclick={saveAlertConfig} disabled={saving}>
          {#if saving}
            <Spinner class="mr-2 size-4" />
          {/if}
          {isNew ? "Create Alert" : "Save Changes"}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Danger Zone (only when editing) -->
    {#if !isNew}
      <Card.Root class="border-destructive">
        <Card.Header>
          <Card.Title class="text-destructive">Danger Zone</Card.Title>
          <Card.Description>Irreversible actions for this alert configuration.</Card.Description>
        </Card.Header>
        <Card.Content>
          <Button variant="destructive" onclick={() => (deleteDialogOpen = true)}>
            <TrashIcon class="mr-2 size-4" />
            Delete Alert
          </Button>
        </Card.Content>
      </Card.Root>
    {/if}
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Alert</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this alert? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={deleteAlertConfig}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

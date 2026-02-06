<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Item from "$lib/components/ui/item/index.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import EditIcon from "@lucide/svelte/icons/pencil";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import BellIcon from "@lucide/svelte/icons/bell";
  import BellOffIcon from "@lucide/svelte/icons/bell-off";
  import GC from "$lib/global-constants";
  import { onMount } from "svelte";
  import type { TriggerRecord } from "$lib/server/types/db";
  import clientResolver from "$lib/client/resolver.js";
  import type {
    MonitorAlertConfigWithTriggers,
    AlertForType,
    AlertSeverityType,
    YesNoType
  } from "$lib/server/types/db";
  import { resolve } from "$app/paths";
  import { toast } from "svelte-sonner";

  let { monitor_tag }: { monitor_tag: string } = $props();

  // State
  let triggers: TriggerRecord[] = $state([]);
  let alertConfigs: MonitorAlertConfigWithTriggers[] = $state([]);
  let loading = $state(false);
  let saving = $state(false);
  let dialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let alertToDelete: MonitorAlertConfigWithTriggers | null = $state(null);

  const base = resolve("/");

  // Form state
  let isEditing = $state(false);
  let editingId: number | null = $state(null);

  // Default form values
  const defaultForm = {
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

  // Alert type options
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

  // Computed - value label based on alert type
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

  // Reset alert value when alert_for changes
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

  // API calls
  async function loadTriggersData() {
    try {
      const response = await fetch(clientResolver(resolve, "manage/api"), {
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

  async function loadAlertConfigs() {
    try {
      const response = await fetch(clientResolver(resolve, "manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getMonitorAlertConfigsByMonitorTag",
          data: { monitor_tag }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        alertConfigs = result;
      }
    } catch (error) {
      console.error("Failed to load alert configs", error);
    }
  }

  async function saveAlertConfig() {
    saving = true;
    try {
      const action = isEditing ? "updateMonitorAlertConfig" : "createMonitorAlertConfig";
      const data: Record<string, unknown> = {
        monitor_tag,
        alert_for: form.alert_for,
        alert_value: form.alert_value,
        failure_threshold: form.failure_threshold,
        success_threshold: form.success_threshold,
        alert_description: form.alert_description || null,
        create_incident: form.create_incident,
        severity: form.severity,
        trigger_ids: form.trigger_ids
      };

      if (isEditing && editingId) {
        data.id = editingId;
        data.is_active = form.is_active;
      }

      const response = await fetch(clientResolver(resolve, "manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isEditing ? "Alert updated successfully" : "Alert created successfully");
        dialogOpen = false;
        resetForm();
        await loadAlertConfigs();
      }
    } catch (error) {
      toast.error("Failed to save alert");
    } finally {
      saving = false;
    }
  }

  async function deleteAlertConfig() {
    if (!alertToDelete) return;

    try {
      const response = await fetch(clientResolver(resolve, "manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteMonitorAlertConfig",
          data: { id: alertToDelete.id }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Alert deleted successfully");
        await loadAlertConfigs();
      }
    } catch (error) {
      toast.error("Failed to delete alert");
    } finally {
      deleteDialogOpen = false;
      alertToDelete = null;
    }
  }

  async function toggleAlertStatus(alert: MonitorAlertConfigWithTriggers) {
    try {
      const response = await fetch(clientResolver(resolve, "manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleMonitorAlertConfigStatus",
          data: { id: alert.id }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.is_active === "YES" ? "Alert activated" : "Alert deactivated");
        await loadAlertConfigs();
      }
    } catch (error) {
      toast.error("Failed to toggle alert status");
    }
  }

  // Form handlers
  function resetForm() {
    form = { ...defaultForm };
    isEditing = false;
    editingId = null;
  }

  function openCreateDialog() {
    resetForm();
    dialogOpen = true;
  }

  function openEditDialog(alert: MonitorAlertConfigWithTriggers) {
    isEditing = true;
    editingId = alert.id;
    form = {
      alert_for: alert.alert_for,
      alert_value: alert.alert_value,
      failure_threshold: alert.failure_threshold,
      success_threshold: alert.success_threshold,
      alert_description: alert.alert_description || "",
      create_incident: alert.create_incident,
      is_active: alert.is_active,
      severity: alert.severity,
      trigger_ids: alert.triggers.map((t) => t.id)
    };
    dialogOpen = true;
  }

  function openDeleteDialog(alert: MonitorAlertConfigWithTriggers) {
    alertToDelete = alert;
    deleteDialogOpen = true;
  }

  function toggleTrigger(triggerId: number) {
    if (form.trigger_ids.includes(triggerId)) {
      form.trigger_ids = form.trigger_ids.filter((id) => id !== triggerId);
    } else {
      form.trigger_ids = [...form.trigger_ids, triggerId];
    }
  }

  // Helper functions
  function getAlertDescription(alert: MonitorAlertConfigWithTriggers): string {
    const { alert_for, alert_value, failure_threshold, success_threshold } = alert;

    if (alert_for === GC.STATUS) {
      return `Alert when ${failure_threshold} consecutive checks result in ${alert_value}. Resolve after ${success_threshold} successful check(s).`;
    } else if (alert_for === GC.LATENCY) {
      return `Alert when latency exceeds ${alert_value}ms for ${failure_threshold} consecutive checks. Resolve after ${success_threshold} check(s) below threshold.`;
    } else if (alert_for === GC.UPTIME) {
      return `Alert when uptime falls below ${alert_value}% for ${failure_threshold} checks. Resolve after ${success_threshold} check(s) above threshold.`;
    }
    return "";
  }

  onMount(async () => {
    loading = true;
    await Promise.all([loadTriggersData(), loadAlertConfigs()]);
    loading = false;
  });
</script>

<div>
  <Card.Root>
    <Card.Header class="relative">
      <Card.Title>Alerting</Card.Title>
      <Card.Description
        >Alert configurations define when and how you get notified about monitor issues.</Card.Description
      >

      <Button
        variant="outline"
        class="absolute top-4 right-4 cursor-pointer"
        disabled={loading}
        size="sm"
        onclick={openCreateDialog}
      >
        <PlusIcon class="size-4" /> Alert
      </Button>
    </Card.Header>
    <Card.Content>
      {#if loading}
        <div class="flex w-full flex-col items-center gap-4 py-8">
          <Spinner class="size-6" />
          <p class="text-muted-foreground text-sm">Loading alerts...</p>
        </div>
      {:else if alertConfigs.length === 0}
        <div class="flex flex-col items-center gap-2 py-8 text-center">
          <BellOffIcon class="text-muted-foreground size-12" />
          <p class="text-muted-foreground text-sm">No alerts configured yet</p>
          <p class="text-muted-foreground text-xs">Create an alert to get notified when your monitor has issues</p>
        </div>
      {:else}
        <div class="flex flex-col gap-3">
          {#each alertConfigs as alert (alert.id)}
            <div
              class="bg-muted/50 flex items-start justify-between gap-4 rounded-lg border p-4 {alert.is_active === GC.NO
                ? 'opacity-60'
                : ''}"
            >
              <div class="flex-1 space-y-2">
                <div class="flex items-center gap-2">
                  <Badge variant={alert.severity === "CRITICAL" ? "destructive" : "secondary"}>
                    {alert.severity}
                  </Badge>
                  <Badge variant="outline">{alert.alert_for}</Badge>
                  {#if alert.is_active === GC.NO}
                    <Badge variant="outline" class="text-muted-foreground">Inactive</Badge>
                  {/if}
                  {#if alert.create_incident === GC.YES}
                    <Badge variant="outline">Creates Incident</Badge>
                  {/if}
                </div>

                <p class="text-sm">{getAlertDescription(alert)}</p>

                {#if alert.alert_description}
                  <p class="text-muted-foreground text-xs">{alert.alert_description}</p>
                {/if}

                {#if alert.triggers.length > 0}
                  <div class="flex flex-wrap gap-1">
                    {#each alert.triggers as trigger (trigger.id)}
                      <Badge variant="outline" class="text-xs">
                        {trigger.name}
                      </Badge>
                    {/each}
                  </div>
                {/if}
              </div>

              <div class="flex items-center gap-2">
                <Switch checked={alert.is_active === GC.YES} onCheckedChange={() => toggleAlertStatus(alert)} />
                <Button variant="ghost" size="icon" onclick={() => openEditDialog(alert)}>
                  <EditIcon class="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onclick={() => openDeleteDialog(alert)}>
                  <TrashIcon class="size-4" />
                </Button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Create/Edit Dialog -->
  <Dialog.Root bind:open={dialogOpen} onOpenChange={(o) => !o && resetForm()}>
    <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <Dialog.Header>
        <Dialog.Title>{isEditing ? "Edit Alert" : "Create New Alert"}</Dialog.Title>
        <Dialog.Description>
          Configure when to trigger an alert and which notification channels to use.
        </Dialog.Description>
      </Dialog.Header>

      <div class="flex flex-col gap-4 py-4">
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
        {#if isEditing}
          <div class="flex flex-col gap-2">
            <Label for="is-active">Active</Label>
            <Select.Root
              type="single"
              value={form.is_active}
              onValueChange={(v) => v && (form.is_active = v as YesNoType)}
            >
              <Select.Trigger id="is-active" class="w-full">
                {form.is_active}
              </Select.Trigger>
              <Select.Content>
                {#each yesNoOptions as option}
                  <Select.Item value={option.value}>{option.label}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
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
            <Label>Notification Triggers (optional)</Label>
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
              class="underline">Create a trigger</a
            > to receive notifications.
          </p>
        {/if}
      </div>

      <Dialog.Footer>
        <Button variant="outline" onclick={() => (dialogOpen = false)} disabled={saving}>Cancel</Button>
        <Button onclick={saveAlertConfig} disabled={saving}>
          {#if saving}
            <Spinner class="mr-2 size-4" />
          {/if}
          {isEditing ? "Update Alert" : "Create Alert"}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

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
</div>

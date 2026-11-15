<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT } = getAdminI18n();

  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import Loader from "@lucide/svelte/icons/loader";
  import { toast } from "svelte-sonner";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import type { MonitorRecord } from "$lib/server/types/db.js";

  interface Props {
    monitor: MonitorRecord;
    status: string;
  }

  let { monitor, status }: Props = $props();

  const monitorTag = $derived(monitor.tag);

  let deleting = $state(false);
  let deletingData = $state(false);
  let updatingStatus = $state(false);
  let deleteConfirmText = $state("");
  let deleteDataConfirmText = $state("");
  let deleteDataStart = $state("");
  let deleteDataEnd = $state("");

  async function updateStatus() {
    if (!monitor.id || !monitor.tag) return;

    updatingStatus = true;
    try {
      const normalizedStatus = status || "INACTIVE";

      const payload: Record<string, unknown> = {
        ...monitor,
        status: normalizedStatus
      };

      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "storeMonitorData", data: payload })
      });

      const result = await response.json();
      if (result.error) {
        toast.error($adminT(result.error));
      } else {
        monitor.status = normalizedStatus;
        status = normalizedStatus;
        toast.success($adminT("Monitor status updated successfully"));
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update monitor status";
      toast.error($adminT(message));
    } finally {
      updatingStatus = false;
    }
  }

  async function deleteMonitorData() {
    if (!monitorTag) return;
    if (deleteDataConfirmText !== `delete ${monitorTag} data`) {
      toast.error($adminT("Please type the correct confirmation text"));
      return;
    }
    if (!deleteDataStart || !deleteDataEnd) {
      toast.error($adminT("Start and end dates are required"));
      return;
    }

    const startTimestamp = Math.floor(new Date(deleteDataStart).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(deleteDataEnd).getTime() / 1000);

    if (startTimestamp >= endTimestamp) {
      toast.error($adminT("Start date must be before end date"));
      return;
    }

    deletingData = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteMonitorData",
          data: { tag: monitorTag, start: startTimestamp, end: endTimestamp }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT("Monitoring data deleted successfully"));
        deleteDataConfirmText = "";
        deleteDataStart = "";
        deleteDataEnd = "";
      }
    } catch (e) {
      toast.error($adminT("Failed to delete monitoring data"));
    } finally {
      deletingData = false;
    }
  }

  async function deleteMonitor() {
    if (!monitorTag) return;
    if (deleteConfirmText !== `delete ${monitorTag}`) {
      toast.error($adminT("Please type the correct confirmation text"));
      return;
    }

    deleting = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteMonitor",
          data: { tag: monitorTag }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT("Monitor deleted successfully"));
        goto(clientResolver(resolve, "/manage/app/monitors"));
      }
    } catch (e) {
      toast.error($adminT("Failed to delete monitor"));
    } finally {
      deleting = false;
    }
  }
</script>

<Card.Root class="border-destructive">
  <Card.Header>
    <Card.Title class="text-destructive flex items-center gap-2">
      <TrashIcon class="size-5" />
      {$adminT("Danger Zone")}
    </Card.Title>
  </Card.Header>
  <Card.Content class="">
    <h2 class="text-lg font-semibold">{$adminT("Update Status")}</h2>
    <div class="mb-5 flex items-center justify-between border-b pb-5">
      <div>{$adminT("Set Status of the monitor")}</div>
      <div class="flex gap-2">
        <Select.Root
          type="single"
          value={status}
          onValueChange={(v) => {
            if (v) {
              status = v;
            }
          }}
        >
          <Select.Trigger class="w-[180px]">{$adminT(String(status ?? ""))}</Select.Trigger>
          <Select.Content>
            <Select.Item value="ACTIVE">{$adminT("ACTIVE")}</Select.Item>
            <Select.Item value="INACTIVE">{$adminT("INACTIVE")}</Select.Item>
          </Select.Content>
        </Select.Root>
        <Button onclick={updateStatus} disabled={updatingStatus || status === (monitor.status || "INACTIVE")}>
          {#if updatingStatus}
            <Loader class="size-4 animate-spin" />
            {$adminT("Updating...")}
          {:else}
            {$adminT("Update Status")}
          {/if}
        </Button>
      </div>
    </div>
    <div class="mb-5 space-y-4 border-b pb-5">
      <h2 class="text-lg font-semibold">{$adminT("Delete Monitoring Data")}</h2>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="deleteDataStart">{$adminT("Start Date & Time")} <span class="text-destructive">*</span></Label>
          <Input id="deleteDataStart" type="datetime-local" bind:value={deleteDataStart} />
        </div>
        <div class="space-y-2">
          <Label for="deleteDataEnd">{$adminT("End Date & Time")} <span class="text-destructive">*</span></Label>
          <Input id="deleteDataEnd" type="datetime-local" bind:value={deleteDataEnd} min={deleteDataStart} />
        </div>
      </div>
      <div class="flex items-end gap-4">
        <div class="flex-1 space-y-2">
          <Label for="deleteDataConfirm">
            {$adminT("Type")}
            <span class="text-destructive font-mono"
              >{$adminT("delete {monitorTag} data", { monitorTag: monitorTag })}</span
            >
            {$adminT("to confirm")}
          </Label>
          <p class="text-muted-foreground">
            {$adminT(
              "This will delete monitoring data for the selected time range. The monitor itself will not be deleted."
            )}
          </p>
          <Input id="deleteDataConfirm" bind:value={deleteDataConfirmText} placeholder="delete {monitorTag} data" />
        </div>
        <Button
          variant="destructive"
          onclick={deleteMonitorData}
          disabled={deletingData || deleteDataConfirmText !== `delete ${monitorTag} data`}
        >
          {#if deletingData}
            <Loader class="size-4 animate-spin" />
            {$adminT("Deleting...")}
          {:else}
            <TrashIcon class="size-4" />
            {$adminT("Delete Data")}
          {/if}
        </Button>
      </div>
    </div>
    <div>
      <h2 class="text-lg font-semibold">{$adminT("Delete Monitor")}</h2>
      <div class="flex items-end gap-4">
        <div class="flex-1 space-y-2">
          <Label for="deleteConfirm">
            {$adminT("Type")}
            <span class="text-destructive font-mono">{$adminT("delete {monitorTag}", { monitorTag: monitorTag })}</span>
            {$adminT("to confirm")}
          </Label>
          <p class="text-muted-foreground">
            {$adminT("Deleting monitor is irreversible. Please be sure before deleting.")}
          </p>
          <Input id="deleteConfirm" bind:value={deleteConfirmText} placeholder="delete {monitorTag}" />
        </div>
        <Button
          variant="destructive"
          onclick={deleteMonitor}
          disabled={deleting || deleteConfirmText !== `delete ${monitorTag}`}
        >
          {#if deleting}
            <Loader class="size-4 animate-spin" />
            {$adminT("Deleting...")}
          {:else}
            <TrashIcon class="size-4" />
            {$adminT("Delete Monitor")}
          {/if}
        </Button>
      </div>
    </div>
  </Card.Content>
</Card.Root>

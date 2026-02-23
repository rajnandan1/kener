<script lang="ts">
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
  let updatingStatus = $state(false);
  let deleteConfirmText = $state("");

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
        toast.error(result.error);
      } else {
        monitor.status = normalizedStatus;
        status = normalizedStatus;
        toast.success("Monitor status updated successfully");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update monitor status";
      toast.error(message);
    } finally {
      updatingStatus = false;
    }
  }

  async function deleteMonitor() {
    if (!monitorTag) return;
    if (deleteConfirmText !== `delete ${monitorTag}`) {
      toast.error("Please type the correct confirmation text");
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
        toast.error(result.error);
      } else {
        toast.success("Monitor deleted successfully");
        goto(clientResolver(resolve, "/manage/app/monitors"));
      }
    } catch (e) {
      toast.error("Failed to delete monitor");
    } finally {
      deleting = false;
    }
  }
</script>

<Card.Root class="border-destructive">
  <Card.Header>
    <Card.Title class="text-destructive flex items-center gap-2">
      <TrashIcon class="size-5" />
      Danger Zone
    </Card.Title>
  </Card.Header>
  <Card.Content class="">
    <div class="mb-5 flex items-center justify-between border-b pb-5">
      <div>Set Status of the monitor</div>
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
          <Select.Trigger class="w-[180px]">{status}</Select.Trigger>
          <Select.Content>
            <Select.Item value="ACTIVE">ACTIVE</Select.Item>
            <Select.Item value="INACTIVE">INACTIVE</Select.Item>
          </Select.Content>
        </Select.Root>
        <Button onclick={updateStatus} disabled={updatingStatus || status === (monitor.status || "INACTIVE")}>
          {#if updatingStatus}
            <Loader class="size-4 animate-spin" />
            Updating...
          {:else}
            Update Status
          {/if}
        </Button>
      </div>
    </div>
    <div class="flex items-end gap-4">
      <div class="flex-1 space-y-2">
        <Label for="deleteConfirm">
          Type <span class="text-destructive font-mono">delete {monitorTag}</span> to confirm
        </Label>
        <p class="text-muted-foreground">Deleting monitor is irreversible. Please be sure before deleting.</p>
        <Input id="deleteConfirm" bind:value={deleteConfirmText} placeholder="delete {monitorTag}" />
      </div>
      <Button
        variant="destructive"
        onclick={deleteMonitor}
        disabled={deleting || deleteConfirmText !== `delete ${monitorTag}`}
      >
        {#if deleting}
          <Loader class="size-4 animate-spin" />
          Deleting...
        {:else}
          <TrashIcon class="size-4" />
          Delete Monitor
        {/if}
      </Button>
    </div>
  </Card.Content>
</Card.Root>

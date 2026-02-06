<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import DatabaseIcon from "@lucide/svelte/icons/database";
  import { toast } from "svelte-sonner";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  interface Props {
    monitorTag: string;
  }

  let { monitorTag }: Props = $props();

  let modifyingData = $state(false);
  let modifyDataError = $state<string | null>(null);
  let modifyDataForm = $state({
    start: "",
    end: "",
    newStatus: "UP" as "UP" | "DEGRADED" | "DOWN",
    latency: 0,
    deviation: 0
  });

  async function modifyMonitoringData() {
    modifyDataError = null;

    if (!modifyDataForm.start) {
      modifyDataError = "Start date is required";
      return;
    }
    if (!modifyDataForm.end) {
      modifyDataError = "End date is required";
      return;
    }

    const startTimestamp = Math.floor(new Date(modifyDataForm.start).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(modifyDataForm.end).getTime() / 1000);

    if (startTimestamp >= endTimestamp) {
      modifyDataError = "Start date must be before end date";
      return;
    }

    if (modifyDataForm.latency < 0) {
      modifyDataError = "Latency must be non-negative";
      return;
    }
    if (modifyDataForm.deviation < 0) {
      modifyDataError = "Deviation must be non-negative";
      return;
    }

    modifyingData = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateMonitoringData",
          data: {
            monitor_tag: monitorTag,
            start: startTimestamp,
            end: endTimestamp,
            newStatus: modifyDataForm.newStatus,
            latency: modifyDataForm.latency,
            deviation: modifyDataForm.deviation
          }
        })
      });

      const result = await response.json();
      if (result.error) {
        modifyDataError = result.error;
      } else {
        toast.success("Monitoring data updated successfully");
        modifyDataForm = { start: "", end: "", newStatus: "UP", latency: 0, deviation: 0 };
      }
    } catch (e) {
      modifyDataError = "Failed to update monitoring data";
    } finally {
      modifyingData = false;
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title class="flex items-center gap-2">
      <DatabaseIcon class="size-5" />
      Modify Monitoring Data
    </Card.Title>
    <Card.Description>Change the status of monitoring data for a given time range</Card.Description>
  </Card.Header>
  <Card.Content>
    <div class="grid gap-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="start_date">Start Date & Time <span class="text-destructive">*</span></Label>
          <Input id="start_date" type="datetime-local" bind:value={modifyDataForm.start} />
        </div>
        <div class="space-y-2">
          <Label for="end_date">End Date & Time <span class="text-destructive">*</span></Label>
          <Input id="end_date" type="datetime-local" bind:value={modifyDataForm.end} min={modifyDataForm.start} />
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div class="space-y-2">
          <Label for="new_status">New Status</Label>
          <Select.Root
            type="single"
            value={modifyDataForm.newStatus}
            onValueChange={(value) => {
              if (value) modifyDataForm.newStatus = value as "UP" | "DEGRADED" | "DOWN";
            }}
          >
            <Select.Trigger id="new_status" class="w-full">
              {modifyDataForm.newStatus}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="UP">UP</Select.Item>
              <Select.Item value="DEGRADED">DEGRADED</Select.Item>
              <Select.Item value="DOWN">DOWN</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
        <div class="space-y-2">
          <Label for="latency">Latency (ms)</Label>
          <Input id="latency" type="number" min="0" bind:value={modifyDataForm.latency} placeholder="100" />
        </div>
        <div class="space-y-2">
          <Label for="deviation">Deviation (ms)</Label>
          <Input id="deviation" type="number" min="0" bind:value={modifyDataForm.deviation} placeholder="0" />
        </div>
      </div>
      <p class="text-muted-foreground text-xs">
        Latency will be randomly generated as latency ± deviation for each data point. Set deviation to 0 for a fixed
        latency value.
      </p>
      {#if modifyDataError}
        <p class="text-destructive text-sm">{modifyDataError}</p>
      {/if}
    </div>
  </Card.Content>
  <Card.Footer class="flex justify-end">
    <Button onclick={modifyMonitoringData} disabled={modifyingData}>
      {#if modifyingData}
        <Loader class="mr-2 size-4 animate-spin" />
        Saving...
      {:else}
        <SaveIcon class="mr-2 size-4" />
        Save Changes
      {/if}
    </Button>
  </Card.Footer>
</Card.Root>

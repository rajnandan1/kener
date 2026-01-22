<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import { allRecordTypes } from "$lib/clientTools";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data = $bindable() }: { data: any } = $props();

  // Initialize defaults if not set
  if (!data.host) data.host = "";
  if (!data.nameServer) data.nameServer = "8.8.8.8";
  if (!data.lookupRecord) data.lookupRecord = "A";
  if (!data.matchType) data.matchType = "ANY";
  if (!data.values) data.values = [];

  const recordTypes = Object.keys(allRecordTypes);

  function addValue() {
    data.values = [...data.values, ""];
  }

  function removeValue(index: number) {
    data.values = data.values.filter((_: unknown, i: number) => i !== index);
  }
</script>

<div class="space-y-4">
  <div class="grid grid-cols-2 gap-4">
    <div class="flex flex-col gap-2">
      <Label for="dns-host">Host <span class="text-destructive">*</span></Label>
      <Input id="dns-host" bind:value={data.host} placeholder="example.com" />
    </div>
    <div class="flex flex-col gap-2">
      <Label for="dns-nameserver">Name Server</Label>
      <Input id="dns-nameserver" bind:value={data.nameServer} placeholder="8.8.8.8" />
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div class="flex flex-col gap-2">
      <Label for="dns-record">Lookup Record</Label>
      <Select.Root
        type="single"
        value={data.lookupRecord}
        onValueChange={(v) => {
          if (v) data.lookupRecord = v;
        }}
      >
        <Select.Trigger id="dns-record" class="w-full">
          {data.lookupRecord}
        </Select.Trigger>
        <Select.Content>
          {#each recordTypes as recordType}
            <Select.Item value={recordType}>{recordType}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
    <div class="flex flex-col gap-2">
      <Label for="dns-matchtype">Match Type</Label>
      <Select.Root
        type="single"
        value={data.matchType}
        onValueChange={(v) => {
          if (v) data.matchType = v as "ALL" | "ANY";
        }}
      >
        <Select.Trigger id="dns-matchtype" class="w-full">
          {data.matchType}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="ANY">ANY - At least one value matches</Select.Item>
          <Select.Item value="ALL">ALL - All values must match</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <div>
    <div class="mb-2 flex items-center justify-between">
      <Label>Expected Values <span class="text-destructive">*</span></Label>
      <Button variant="outline" size="sm" onclick={addValue}>
        <Plus class="mr-1 size-4" />
        Add Value
      </Button>
    </div>
    {#if data.values.length > 0}
      <div class="space-y-2">
        {#each data.values as value, index}
          <InputGroup.Root>
            <InputGroup.Addon class="">
              <InputGroup.Text class="border-r-2 pr-2">Value {index + 1}</InputGroup.Text>
            </InputGroup.Addon>
            <InputGroup.Input bind:value={data.values[index]} placeholder="Expected DNS value" />
            <InputGroup.Addon align="inline-end">
              <InputGroup.Button variant="ghost" size="icon-xs" onclick={() => removeValue(index)}>
                <X class="size-4" />
              </InputGroup.Button>
            </InputGroup.Addon>
          </InputGroup.Root>
        {/each}
      </div>
    {:else}
      <p class="text-muted-foreground text-sm">
        No values added. Click "Add Value" to add expected DNS response values.
      </p>
    {/if}
  </div>
</div>

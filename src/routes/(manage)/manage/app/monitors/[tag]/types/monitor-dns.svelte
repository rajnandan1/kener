<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import { AllRecordTypes } from "$lib/clientTools";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data = $bindable() }: { data: any } = $props();

  // Initialize defaults if not set
  if (!data.host) data.host = "";
  if (!data.nameServer) data.nameServer = "";
  if (!data.lookupRecord) data.lookupRecord = "A";
  if (!data.matchType) data.matchType = "ANY";
  if (!data.transport) data.transport = "UDP";
  if (!data.tlsPort) data.tlsPort = 853;
  if (!data.tlsServername) data.tlsServername = "";
  if (data.allowSelfSignedCert === undefined) data.allowSelfSignedCert = false;
  if (!data.values) data.values = [""];

  const recordTypes = Object.keys(AllRecordTypes);
  const usesTls = $derived(data.transport === "TLS");

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
      <Label for="dns-transport">Transport</Label>
      <Select.Root
        type="single"
        value={data.transport}
        onValueChange={(v) => {
          if (v) data.transport = v;
        }}
      >
        <Select.Trigger id="dns-transport" class="w-full">
          {data.transport === "TLS" ? "DNS-over-TLS" : "UDP"}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="UDP">UDP - Standard DNS (port 53)</Select.Item>
          <Select.Item value="TLS">TLS - DNS-over-TLS (port 853)</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
    <div class="flex flex-col gap-2">
      <Label for="dns-host">Host <span class="text-destructive">*</span></Label>
      <Input id="dns-host" bind:value={data.host} placeholder="example.com" />
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div class="flex flex-col gap-2">
      <Label for="dns-nameserver">
        Name Server
        {#if usesTls}
          <span class="text-destructive">*</span>
        {:else}
          (optional)
        {/if}
      </Label>
      <Input
        id="dns-nameserver"
        bind:value={data.nameServer}
        placeholder={usesTls ? "1.1.1.1 or dns.example.com" : "Leave empty for authoritative lookup"}
      />
      {#if usesTls}
        <p class="text-muted-foreground text-xs">
          DoT resolver address. For IP resolvers, set TLS Server Name when required (e.g. 8.8.8.8 → dns.google).
        </p>
      {:else}
        <p class="text-muted-foreground text-xs">Leave blank to use authoritative DNS nameservers automatically.</p>
      {/if}
    </div>
    {#if usesTls}
      <div class="flex flex-col gap-2">
        <Label for="dns-tls-port">TLS Port</Label>
        <Input id="dns-tls-port" type="number" min="1" max="65535" bind:value={data.tlsPort} placeholder="853" />
      </div>
    {/if}
  </div>

  {#if usesTls}
    <div class="grid grid-cols-2 gap-4">
      <div class="flex flex-col gap-2">
        <Label for="dns-tls-servername">TLS Server Name (optional)</Label>
        <Input id="dns-tls-servername" bind:value={data.tlsServername} placeholder="dns.google" />
        <p class="text-muted-foreground text-xs">SNI hostname for TLS. Required for many public resolvers when using an IP address.</p>
      </div>
      <div class="flex items-center gap-3 pt-6">
        <Switch id="dns-self-signed" bind:checked={data.allowSelfSignedCert} />
        <Label for="dns-self-signed">Allow self-signed TLS certificates</Label>
      </div>
    </div>
  {/if}

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
        {data.values.length > 0 ? "Add More Values" : "Add Value"}
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

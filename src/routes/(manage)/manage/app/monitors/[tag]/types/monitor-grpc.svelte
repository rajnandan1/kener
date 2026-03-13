<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data = $bindable() }: { data: any } = $props();

  // Initialize defaults if not set
  if (!data.host) data.host = "";
  if (!data.port) data.port = 50051;
  if (!data.service) data.service = "";
  if (!data.timeout) data.timeout = 10000;
  if (data.tls === undefined) data.tls = false;
</script>

<div class="space-y-4">
  <div class="grid grid-cols-3 gap-4">
    <div class="col-span-2 flex flex-col gap-2">
      <Label for="grpc-host">Host <span class="text-destructive">*</span></Label>
      <Input id="grpc-host" bind:value={data.host} placeholder="localhost" />
    </div>
    <div class="col-span-1 flex flex-col gap-2">
      <Label for="grpc-port">Port <span class="text-destructive">*</span></Label>
      <Input id="grpc-port" type="number" bind:value={data.port} placeholder="50051" />
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <Label for="grpc-service">Service Name</Label>
    <Input id="grpc-service" bind:value={data.service} placeholder="my.package.ServiceName" />
    <p class="text-muted-foreground mt-1 text-xs">
      The fully qualified gRPC service name to health check. Leave empty to check overall server health.
    </p>
  </div>

  <div class="flex flex-col gap-2">
    <Label for="grpc-timeout">Timeout (ms)</Label>
    <Input id="grpc-timeout" type="number" bind:value={data.timeout} placeholder="10000" />
  </div>

  <div class="flex items-center space-x-2">
    <Switch id="grpc-tls" bind:checked={data.tls} />
    <Label for="grpc-tls">Use TLS</Label>
  </div>
</div>

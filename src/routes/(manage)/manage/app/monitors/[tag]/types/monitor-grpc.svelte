<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT } = getAdminI18n();

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
  if (data.insecure === undefined) data.insecure = false;

  $effect(() => {
    if (!data.tls) data.insecure = false;
  });
</script>

<div class="space-y-4">
  <div class="grid grid-cols-3 gap-4">
    <div class="col-span-2 flex flex-col gap-2">
      <Label for="grpc-host">{$adminT("Host")} <span class="text-destructive">*</span></Label>
      <Input id="grpc-host" bind:value={data.host} placeholder={$adminT("localhost")} />
    </div>
    <div class="col-span-1 flex flex-col gap-2">
      <Label for="grpc-port">{$adminT("Port")} <span class="text-destructive">*</span></Label>
      <Input id="grpc-port" type="number" bind:value={data.port} placeholder="50051" />
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <Label for="grpc-service">{$adminT("Service Name")}</Label>
    <Input id="grpc-service" bind:value={data.service} placeholder={$adminT("my.package.ServiceName")} />
    <p class="text-muted-foreground mt-1 text-xs">
      {$adminT("The fully qualified gRPC service name to health check. Leave empty to check overall server health.")}
    </p>
  </div>

  <div class="flex flex-col gap-2">
    <Label for="grpc-timeout">{$adminT("Timeout (ms)")}</Label>
    <Input id="grpc-timeout" type="number" bind:value={data.timeout} placeholder="10000" />
  </div>

  <div class="flex items-center space-x-2">
    <Switch id="grpc-tls" bind:checked={data.tls} />
    <Label for="grpc-tls">{$adminT("Use TLS")}</Label>
  </div>

  {#if data.tls}
    <div class="flex items-center space-x-2">
      <Switch id="grpc-insecure" bind:checked={data.insecure} />
      <Label for="grpc-insecure">{$adminT("Allow Insecure TLS (skip certificate verification)")}</Label>
    </div>
  {/if}
</div>

<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT } = getAdminI18n();

  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data = $bindable() }: { data: any } = $props();

  // Initialize defaults if not set
  if (!data.host) data.host = "";
  if (!data.port) data.port = "443";
  if (!data.degradedRemainingHours) data.degradedRemainingHours = 168; // 7 days
  if (data.downRemainingHours == null) data.downRemainingHours = 24; // 1 day
  if (!data.timeout) data.timeout = 10000;
  if (!data.tlsServername) data.tlsServername = "";
  if (data.allowSelfSignedCert === undefined) data.allowSelfSignedCert = false;
</script>

<div class="space-y-4">
  <div class="grid grid-cols-2 gap-4">
    <div class="flex flex-col gap-2">
      <Label for="ssl-host">{$adminT("Host")} <span class="text-destructive">*</span></Label>
      <Input id="ssl-host" bind:value={data.host} placeholder={$adminT("example.com")} />
    </div>
    <div class="flex flex-col gap-2">
      <Label for="ssl-port">{$adminT("Port")}</Label>
      <Input id="ssl-port" bind:value={data.port} placeholder="443" />
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div class="flex flex-col gap-2">
      <Label for="ssl-timeout">{$adminT("Timeout (ms)")}</Label>
      <Input id="ssl-timeout" type="number" bind:value={data.timeout} placeholder="10000" />
    </div>
    <div class="flex flex-col gap-2">
      <Label for="ssl-tls-servername">{$adminT("TLS Server Name (SNI)")}</Label>
      <Input id="ssl-tls-servername" bind:value={data.tlsServername} placeholder={$adminT("optional, for IP hosts")} />
    </div>
  </div>

  <div class="flex items-center space-x-2">
    <Switch id="ssl-self-signed" bind:checked={data.allowSelfSignedCert} />
    <Label for="ssl-self-signed">{$adminT("Allow Self-Signed / Untrusted Certificates")}</Label>
  </div>
  <p class="text-muted-foreground -mt-2 text-xs">
    {$adminT(
      "When off, a certificate that fails verification (self-signed, unknown CA, or wrong host name) makes the check DOWN. When on, only the expiry thresholds decide the status, and the status page still shows INSECURE."
    )}
  </p>

  <div class="grid grid-cols-2 gap-4">
    <div class="flex flex-col gap-2">
      <div>
        <InputGroup.Root>
          <InputGroup.Addon>
            <InputGroup.Text>
              <span class="text-degraded">{$adminT("Degraded")}</span>
              {$adminT("when hours remaining ≤")}</InputGroup.Text
            >
          </InputGroup.Addon>
          <InputGroup.Input
            id="ssl-degraded"
            type="number"
            class="text-right"
            bind:value={data.degradedRemainingHours}
            placeholder="168"
          />
          <InputGroup.Addon align="inline-end">
            <InputGroup.Text>{$adminT("hours")}</InputGroup.Text>
          </InputGroup.Addon>
        </InputGroup.Root>
        <p class="text-muted-foreground mt-1 text-xs">
          {$adminT("Certificate expiring within this many hours will be marked as DEGRADED")}
        </p>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <div>
        <InputGroup.Root>
          <InputGroup.Addon>
            <InputGroup.Text
              ><span class="text-down">{$adminT("Down")}</span> {$adminT("when hours remaining ≤")}</InputGroup.Text
            >
          </InputGroup.Addon>
          <InputGroup.Input
            id="ssl-down"
            class="text-right"
            type="number"
            bind:value={data.downRemainingHours}
            placeholder="24"
          />
          <InputGroup.Addon align="inline-end">
            <InputGroup.Text>{$adminT("hours")}</InputGroup.Text>
          </InputGroup.Addon>
        </InputGroup.Root>
        <p class="text-muted-foreground mt-1 text-xs">
          {$adminT("Certificate expiring within this many hours will be marked as DOWN")}
        </p>
      </div>
    </div>
  </div>
</div>

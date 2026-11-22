<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT } = getAdminI18n();

  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
  import { toast } from "svelte-sonner";
  import { untrack } from "svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { DOCKER_DEFAULT_SOCKET_PATH, DOCKER_DEFAULT_TIMEOUT } from "$lib/anywhere.js";
  import type { DockerConnectionDefaults, DockerMonitorTypeData } from "$lib/types/docker.js";

  let {
    data = $bindable({} as Record<string, unknown>),
    defaults = { connectionType: "socket", daemon: DOCKER_DEFAULT_SOCKET_PATH },
    monitorId
  }: { data: Record<string, unknown>; defaults?: DockerConnectionDefaults; monitorId?: number } = $props();

  const formData = data as unknown as DockerMonitorTypeData;

  const CONNECTION_TYPES = {
    socket: { label: "Unix socket", addressLabel: "Socket path", placeholder: DOCKER_DEFAULT_SOCKET_PATH },
    tcp: { label: "TCP (no encryption)", addressLabel: "Daemon address", placeholder: "10.0.0.5:2375" },
    tls: { label: "TCP with TLS", addressLabel: "Daemon address", placeholder: "docker.example.com:2376" }
  } as const;

  const CHECK_TYPE_LABELS: Record<string, string> = {
    container: "Container",
    daemon: "Docker daemon (ping only)"
  };

  function defaultDaemon(connectionType: string) {
    if (connectionType === defaults.connectionType) return defaults.daemon;
    return connectionType === "socket" ? DOCKER_DEFAULT_SOCKET_PATH : "";
  }

  // Initialize defaults if not set
  if (!(formData.connectionType in CONNECTION_TYPES)) formData.connectionType = untrack(() => defaults.connectionType);
  if (typeof formData.daemon !== "string") formData.daemon = defaultDaemon(formData.connectionType);
  if (formData.checkType !== "daemon") formData.checkType = "container";
  if (typeof formData.containerName !== "string") formData.containerName = "";
  if (!formData.timeout) formData.timeout = DOCKER_DEFAULT_TIMEOUT;

  interface DockerContainerOption {
    id: string;
    name: string;
    image: string;
    state: string;
    status: string;
  }

  let containers = $state<DockerContainerOption[]>([]);
  let loadingContainers = $state(false);

  function selectConnectionType(value: string | undefined) {
    if (!value || !(value in CONNECTION_TYPES)) return;
    formData.connectionType = value as DockerMonitorTypeData["connectionType"];
    formData.daemon = defaultDaemon(value);
    if (value !== "tls") {
      // Otherwise a now-hidden private key would ride along on the next save.
      formData.tlsCa = undefined;
      formData.tlsCert = undefined;
      formData.tlsKey = undefined;
    }
    containers = [];
  }

  // Sends the unsaved connection fields, so browsing works before the monitor is saved. The server puts back a masked saved key.
  async function loadContainers() {
    loadingContainers = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "listDockerContainers", data: { monitor_id: monitorId, type_data: formData } })
      });
      const result = await response.json();
      if (result?.error) throw new Error(result.error);
      containers = result;
      if (containers.length === 0) toast.info($adminT("No containers found on this daemon"));
    } catch (e) {
      containers = [];
      toast.error($adminT(e instanceof Error ? e.message : "Failed to list containers"));
    } finally {
      loadingContainers = false;
    }
  }
</script>

<div class="space-y-4">
  <div class="grid grid-cols-3 gap-4">
    <div class="flex flex-col gap-2">
      <Label for="docker-connection-type">{$adminT("Connection")}</Label>
      <Select.Root type="single" value={formData.connectionType} onValueChange={selectConnectionType}>
        <Select.Trigger id="docker-connection-type" class="w-full">
          {$adminT(String(CONNECTION_TYPES[formData.connectionType].label ?? ""))}
        </Select.Trigger>
        <Select.Content>
          {#each Object.entries(CONNECTION_TYPES) as [value, option] (value)}
            <Select.Item {value}>{$adminT(String(option.label ?? ""))}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
    <div class="col-span-2 flex flex-col gap-2">
      <Label for="docker-daemon">
        {$adminT(String(CONNECTION_TYPES[formData.connectionType].addressLabel ?? ""))}
        <span class="text-destructive">*</span>
      </Label>
      <Input
        id="docker-daemon"
        bind:value={formData.daemon}
        placeholder={$adminT(String(CONNECTION_TYPES[formData.connectionType].placeholder ?? ""))}
      />
    </div>
  </div>
  <p class="text-muted-foreground text-xs">
    {$adminT(
      "Whoever can reach the Docker socket is root on that host. Prefer a read-only socket proxy over mounting the socket directly, and never expose"
    )} <code>tcp</code>
    {$adminT("without TLS outside a trusted network.")}
  </p>

  {#if formData.connectionType === "tls"}
    <div class="flex flex-col gap-2">
      <Label for="docker-tls-ca">{$adminT("CA certificate")}</Label>
      <Textarea
        id="docker-tls-ca"
        bind:value={formData.tlsCa}
        rows={3}
        class="font-mono text-xs"
        placeholder={$adminT("-----BEGIN CERTIFICATE----- or $DOCKER_TLS_CA")}
      />
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="flex flex-col gap-2">
        <Label for="docker-tls-cert">{$adminT("Client certificate")}</Label>
        <Textarea
          id="docker-tls-cert"
          bind:value={formData.tlsCert}
          rows={4}
          class="font-mono text-xs"
          placeholder={$adminT("-----BEGIN CERTIFICATE----- or $DOCKER_TLS_CERT")}
        />
      </div>
      <div class="flex flex-col gap-2">
        <Label for="docker-tls-key">{$adminT("Client key")}</Label>
        <Textarea
          id="docker-tls-key"
          bind:value={formData.tlsKey}
          rows={4}
          class="font-mono text-xs"
          placeholder={$adminT("-----BEGIN PRIVATE KEY----- or $DOCKER_TLS_KEY")}
        />
      </div>
    </div>
    <p class="text-muted-foreground text-xs">
      {$adminT("Paste PEM, or reference an environment variable such as")} <code>$DOCKER_TLS_KEY</code>
      {$adminT(
        "to keep the key out of the database. Leave all three empty for a daemon behind a TLS proxy that does not ask for a client certificate. The certificate and key go together."
      )}
    </p>
  {/if}

  <div class="flex flex-col gap-2">
    <Label for="docker-check-type">{$adminT("What to check")}</Label>
    <Select.Root
      type="single"
      value={formData.checkType}
      onValueChange={(v) => {
        if (v) formData.checkType = v as DockerMonitorTypeData["checkType"];
      }}
    >
      <Select.Trigger id="docker-check-type" class="w-full">
        {$adminT(String(CHECK_TYPE_LABELS[formData.checkType] ?? ""))}
      </Select.Trigger>
      <Select.Content>
        {#each Object.entries(CHECK_TYPE_LABELS) as [value, label] (value)}
          <Select.Item {value}>{$adminT(String(label ?? ""))}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
    <p class="text-muted-foreground text-xs">
      {$adminT(
        "Daemon checks only verify that the Docker Engine API answers. Use this as a parent monitor for a host."
      )}
    </p>
  </div>

  {#if formData.checkType === "container"}
    <div class="flex flex-col gap-2">
      <Label for="docker-container">{$adminT("Container Name or ID")} <span class="text-destructive">*</span></Label>
      <div class="flex gap-2">
        <Input id="docker-container" bind:value={formData.containerName} placeholder={$adminT("my-app")} />
        <Button variant="secondary" disabled={!formData.daemon?.trim() || loadingContainers} onclick={loadContainers}>
          {#if loadingContainers}
            <Spinner class="size-4" />
          {:else}
            <RefreshCwIcon class="size-4" />
          {/if}
          {$adminT("Browse")}
        </Button>
      </div>
      {#if containers.length > 0}
        <div class="flex flex-wrap gap-2 pt-1">
          {#each containers as container (container.id)}
            <button type="button" onclick={() => (formData.containerName = container.name)}>
              <Badge variant={container.state === "running" ? "default" : "secondary"} class="cursor-pointer">
                {container.name}
              </Badge>
            </button>
          {/each}
        </div>
      {/if}
      <p class="text-muted-foreground text-xs">
        {$adminT(
          "The container is resolved on every check, so it survives recreation as long as the name stays the same. A running container is UP unless its"
        )} <code>HEALTHCHECK</code>
        {$adminT("says otherwise; restarting or starting is DEGRADED; paused, stopped, unhealthy, or missing is DOWN.")}
      </p>
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    <Label for="docker-timeout">{$adminT("Timeout (ms)")}</Label>
    <Input
      id="docker-timeout"
      type="number"
      bind:value={formData.timeout}
      placeholder={$adminT(String(String(DOCKER_DEFAULT_TIMEOUT)))}
    />
  </div>
</div>

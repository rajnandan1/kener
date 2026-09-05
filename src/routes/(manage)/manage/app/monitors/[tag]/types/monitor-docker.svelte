<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { DOCKER_DEFAULT_TIMEOUT } from "$lib/anywhere.js";
  import type { DockerMonitorTypeData } from "$lib/server/types/monitor.js";

  let { data = $bindable({} as Record<string, unknown>) }: { data: Record<string, unknown> } = $props();

  const formData = data as unknown as DockerMonitorTypeData;

  const CHECK_TYPE_LABELS: Record<string, string> = {
    container: "Container",
    daemon: "Docker daemon (ping only)"
  };

  const STATUS_LABELS: Record<string, string> = {
    DOWN: "Down",
    DEGRADED: "Degraded"
  };

  // Initialize defaults if not set
  if (formData.checkType !== "daemon") formData.checkType = "container";
  if (typeof formData.containerName !== "string") formData.containerName = "";
  if (!formData.unhealthyStatus) formData.unhealthyStatus = "DOWN";
  if (!formData.restartingStatus) formData.restartingStatus = "DEGRADED";
  if (!formData.pausedStatus) formData.pausedStatus = "DOWN";
  if (!formData.timeout) formData.timeout = DOCKER_DEFAULT_TIMEOUT;

  interface DockerHostOption {
    id: number;
    name: string;
    connection_type: string;
    daemon: string;
  }

  interface DockerContainerOption {
    id: string;
    name: string;
    image: string;
    state: string;
    status: string;
  }

  let hosts = $state<DockerHostOption[]>([]);
  let loadingHosts = $state(true);
  let containers = $state<DockerContainerOption[]>([]);
  let loadingContainers = $state(false);

  const selectedHost = $derived(hosts.find((host) => host.id === Number(formData.dockerHostId)));

  async function callApi(action: string, payload: Record<string, unknown> = {}) {
    const response = await fetch(clientResolver(resolve, "/manage/api"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data: payload })
    });
    const result = await response.json();
    if (result?.error) throw new Error(result.error);
    return result;
  }

  async function loadHosts() {
    loadingHosts = true;
    try {
      hosts = await callApi("getDockerHosts");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load Docker hosts");
    } finally {
      loadingHosts = false;
    }
  }

  async function loadContainers() {
    if (!formData.dockerHostId) return;
    loadingContainers = true;
    try {
      containers = await callApi("listDockerContainers", { id: formData.dockerHostId });
      if (containers.length === 0) toast.info("No containers found on this host");
    } catch (e) {
      containers = [];
      toast.error(e instanceof Error ? e.message : "Failed to list containers");
    } finally {
      loadingContainers = false;
    }
  }

  function selectHost(value: string | undefined) {
    if (!value) return;
    formData.dockerHostId = Number(value);
    containers = [];
  }

  onMount(loadHosts);
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-2">
    <Label for="docker-host">Docker Host <span class="text-destructive">*</span></Label>
    {#if loadingHosts}
      <div class="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner class="size-4" />
        Loading Docker hosts...
      </div>
    {:else if hosts.length === 0}
      <div class="text-muted-foreground flex items-center gap-1 text-sm">
        No Docker hosts configured yet.
        <Button variant="link" class="h-auto p-0" href={clientResolver(resolve, "/manage/app/docker-hosts")}>
          Add one
        </Button>
        to connect Kener to a Docker Engine.
      </div>
    {:else}
      <Select.Root
        type="single"
        value={formData.dockerHostId ? String(formData.dockerHostId) : ""}
        onValueChange={selectHost}
      >
        <Select.Trigger id="docker-host" class="w-full">
          {selectedHost ? `${selectedHost.name} (${selectedHost.daemon})` : "Select a Docker host"}
        </Select.Trigger>
        <Select.Content>
          {#each hosts as host (host.id)}
            <Select.Item value={String(host.id)}>{host.name} ({host.daemon})</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    {/if}
  </div>

  <div class="flex flex-col gap-2">
    <Label for="docker-check-type">What to check</Label>
    <Select.Root
      type="single"
      value={formData.checkType}
      onValueChange={(v) => {
        if (v) formData.checkType = v as DockerMonitorTypeData["checkType"];
      }}
    >
      <Select.Trigger id="docker-check-type" class="w-full">
        {CHECK_TYPE_LABELS[formData.checkType]}
      </Select.Trigger>
      <Select.Content>
        {#each Object.entries(CHECK_TYPE_LABELS) as [value, label] (value)}
          <Select.Item {value}>{label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
    <p class="text-muted-foreground text-xs">
      Daemon checks only verify that the Docker Engine API answers. Use this as a parent monitor for a host.
    </p>
  </div>

  {#if formData.checkType === "container"}
    <div class="flex flex-col gap-2">
      <Label for="docker-container">Container Name or ID <span class="text-destructive">*</span></Label>
      <div class="flex gap-2">
        <Input id="docker-container" bind:value={formData.containerName} placeholder="my-app" />
        <Button variant="secondary" disabled={!formData.dockerHostId || loadingContainers} onclick={loadContainers}>
          {#if loadingContainers}
            <Spinner class="size-4" />
          {:else}
            <RefreshCwIcon class="size-4" />
          {/if}
          Browse
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
        The container is resolved on every check, so it survives recreation as long as the name stays the same.
      </p>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div class="flex flex-col gap-2">
        <Label for="docker-unhealthy">When unhealthy</Label>
        <Select.Root
          type="single"
          value={formData.unhealthyStatus}
          onValueChange={(v) => {
            if (v) formData.unhealthyStatus = v as DockerMonitorTypeData["unhealthyStatus"];
          }}
        >
          <Select.Trigger id="docker-unhealthy" class="w-full">
            {STATUS_LABELS[formData.unhealthyStatus ?? "DOWN"]}
          </Select.Trigger>
          <Select.Content>
            {#each Object.entries(STATUS_LABELS) as [value, label] (value)}
              <Select.Item {value}>{label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="docker-restarting">When restarting</Label>
        <Select.Root
          type="single"
          value={formData.restartingStatus}
          onValueChange={(v) => {
            if (v) formData.restartingStatus = v as DockerMonitorTypeData["restartingStatus"];
          }}
        >
          <Select.Trigger id="docker-restarting" class="w-full">
            {STATUS_LABELS[formData.restartingStatus ?? "DEGRADED"]}
          </Select.Trigger>
          <Select.Content>
            {#each Object.entries(STATUS_LABELS) as [value, label] (value)}
              <Select.Item {value}>{label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="docker-paused">When paused</Label>
        <Select.Root
          type="single"
          value={formData.pausedStatus}
          onValueChange={(v) => {
            if (v) formData.pausedStatus = v as DockerMonitorTypeData["pausedStatus"];
          }}
        >
          <Select.Trigger id="docker-paused" class="w-full">
            {STATUS_LABELS[formData.pausedStatus ?? "DOWN"]}
          </Select.Trigger>
          <Select.Content>
            {#each Object.entries(STATUS_LABELS) as [value, label] (value)}
              <Select.Item {value}>{label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>
    <p class="text-muted-foreground text-xs">
      A container with no <code>HEALTHCHECK</code> is UP whenever it is running. Stopped, exited, and dead containers are
      always DOWN.
    </p>
  {/if}

  <div class="flex flex-col gap-2">
    <Label for="docker-timeout">Timeout (ms)</Label>
    <Input
      id="docker-timeout"
      type="number"
      bind:value={formData.timeout}
      placeholder={String(DOCKER_DEFAULT_TIMEOUT)}
    />
  </div>
</div>

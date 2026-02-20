<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import PlayIcon from "@lucide/svelte/icons/play";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import type { GroupMonitorTypeData, MonitoringResult } from "$lib/server/types/monitor.js";
  import { MONITOR_TYPES, type MonitorType } from "$lib/types/monitor.js";
  import { toast } from "svelte-sonner";
  import { ValidateIpAddress, IsValidHost, IsValidNameServer, IsValidURL, IsValidPort } from "$lib/clientTools";
  import { GAMEDIG_SOCKET_TIMEOUT } from "$lib/anywhere";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  // Type-specific components
  import {
    MonitorApi,
    MonitorPing,
    MonitorTcp,
    MonitorDns,
    MonitorSsl,
    MonitorSql,
    MonitorHeartbeat,
    MonitorGroup,
    MonitorGamedig,
    MonitorNone
  } from "../types/index.js";

  interface Props {
    monitor: MonitorRecord;
    // Dynamic per-monitor-type payload (parsed JSON). Keep as any so it can be bound into
    // the various strongly-typed type editors (API/PING/HEARTBEAT/etc.) without TS errors.
    typeData: any;
    availableMonitors: MonitorRecord[];
  }

  let { monitor = $bindable(), typeData = $bindable(), availableMonitors }: Props = $props();

  const GROUP_MIN_MONITORS = 2;
  const GROUP_MIN_TIMEOUT_MS = 1000;
  const GROUP_LATENCY_CALCULATION_OPTIONS = ["AVG", "MAX", "MIN"] as const;
  type GroupLatencyCalculation = (typeof GROUP_LATENCY_CALCULATION_OPTIONS)[number];

  function isGroupLatencyCalculation(value: unknown): value is GroupLatencyCalculation {
    return typeof value === "string" && GROUP_LATENCY_CALCULATION_OPTIONS.includes(value as GroupLatencyCalculation);
  }

  function createDefaultGroupTypeData(): GroupMonitorTypeData {
    return {
      monitors: [],
      executionDelay: GROUP_MIN_TIMEOUT_MS,
      latencyCalculation: "AVG"
    };
  }

  function normalizeGroupTypeData(raw: unknown): GroupMonitorTypeData {
    const candidate = (raw ?? {}) as Record<string, unknown>;
    const monitors = Array.isArray(candidate.monitors)
      ? (candidate.monitors as Array<{ tag?: string; weight?: number }>).reduce<Array<{ tag: string; weight: number }>>(
          (acc, monitor) => {
            if (monitor && typeof monitor.tag === "string" && monitor.tag.trim().length > 0) {
              const weight = typeof monitor.weight === "number" && Number.isFinite(monitor.weight) ? monitor.weight : 0;
              acc.push({ tag: monitor.tag, weight });
            }
            return acc;
          },
          []
        )
      : [];

    const latencyCalculation = isGroupLatencyCalculation(candidate.latencyCalculation)
      ? candidate.latencyCalculation
      : "AVG";

    const executionDelay =
      typeof candidate.executionDelay === "number" &&
      Number.isFinite(candidate.executionDelay) &&
      candidate.executionDelay >= GROUP_MIN_TIMEOUT_MS
        ? candidate.executionDelay
        : GROUP_MIN_TIMEOUT_MS;

    return {
      monitors,
      latencyCalculation,
      executionDelay
    };
  }

  if (monitor.monitor_type === "GROUP") {
    typeData = normalizeGroupTypeData(typeData);
  }

  let savingType = $state(false);
  let testingMonitor = $state(false);
  let testResult = $state<MonitoringResult | null>(null);

  const monitorTypeLabels: Record<MonitorType, string> = {
    API: "HTTP/API",
    PING: "Ping",
    TCP: "TCP Port",
    DNS: "DNS",
    NONE: "Manual",
    GROUP: "Group",
    SSL: "SSL Certificate",
    SQL: "Database",
    HEARTBEAT: "Heartbeat",
    GAMEDIG: "Game Server"
  };

  // Validation for each monitor type
  const isTypeSettingsValid = $derived.by(() => {
    if (!monitor.monitor_type || monitor.monitor_type === "NONE") return true;

    switch (monitor.monitor_type) {
      case "API": {
        const data = typeData as any;
        if (!data.url) return false;
        if (!IsValidURL(data.url)) return false;
        if (!data.timeout || data.timeout < 1) return false;
        return true;
      }

      case "PING": {
        const data = typeData as any;
        if (!data.hosts || !Array.isArray(data.hosts) || data.hosts.length === 0) return false;
        for (const host of data.hosts) {
          if (!host.host) return false;
          if (ValidateIpAddress(host.host) !== host.type) return false;
          if (!host.timeout || host.timeout < 1) return false;
          if (!host.count || host.count < 1) return false;
        }
        return true;
      }

      case "TCP": {
        const data = typeData as any;
        if (!data.hosts || !Array.isArray(data.hosts) || data.hosts.length === 0) return false;
        for (const host of data.hosts) {
          if (!host.host) return false;
          if (ValidateIpAddress(host.host) !== host.type) return false;
          if (!host.timeout || host.timeout < 1) return false;
          if (!IsValidPort(host.port)) return false;
        }
        return true;
      }

      case "DNS": {
        const data = typeData as any;
        if (!data.host || !IsValidHost(data.host)) return false;
        const nameServer = (data.nameServer || "").trim();
        if (nameServer && !IsValidNameServer(nameServer)) return false;
        if (!data.lookupRecord) return false;
        if (!data.values || !Array.isArray(data.values) || data.values.length === 0) return false;
        const hasNonEmptyValue = data.values.some((val: string) => val && val.trim() !== "");
        if (!hasNonEmptyValue) return false;
        return true;
      }

      case "GROUP": {
        const data = typeData as Partial<GroupMonitorTypeData>;
        if (!data.monitors || !Array.isArray(data.monitors) || data.monitors.length < GROUP_MIN_MONITORS) return false;
        if (typeof data.executionDelay !== "number" || data.executionDelay < GROUP_MIN_TIMEOUT_MS) return false;
        if (!isGroupLatencyCalculation((data as GroupMonitorTypeData).latencyCalculation)) return false;
        // Weights must sum to 1
        const totalWeight = data.monitors.reduce((sum, m) => sum + (m.weight ?? 0), 0);
        if (Math.abs(totalWeight - 1) >= 0.01) return false;
        return true;
      }

      case "SSL": {
        const data = typeData as any;
        if (!data.host || !IsValidHost(data.host)) return false;
        if (!IsValidPort(data.port)) return false;
        if (!data.degradedRemainingHours || data.degradedRemainingHours < 0) return false;
        if (!data.downRemainingHours || data.downRemainingHours < 0) return false;
        if (data.degradedRemainingHours <= data.downRemainingHours) return false;
        return true;
      }

      case "SQL": {
        const data = typeData as any;
        if (!data.connectionString) return false;
        if (!data.connectionString.startsWith("postgresql://") && !data.connectionString.startsWith("mysql://"))
          return false;
        if (!data.timeout || data.timeout < 1) return false;
        if (!data.query) return false;
        return true;
      }

      case "HEARTBEAT": {
        const data = typeData as any;
        if (!data.degradedRemainingMinutes || data.degradedRemainingMinutes < 1) return false;
        if (!data.downRemainingMinutes || data.downRemainingMinutes <= data.degradedRemainingMinutes) return false;
        return true;
      }

      case "GAMEDIG": {
        const data = typeData as any;
        if (!data.host || ValidateIpAddress(data.host) === "Invalid") return false;
        if (!IsValidPort(data.port)) return false;
        if (!data.gameId) return false;
        if (!data.timeout || data.timeout < GAMEDIG_SOCKET_TIMEOUT) return false;
        return true;
      }

      default:
        return true;
    }
  });

  async function saveTypeSettings() {
    savingType = true;

    try {
      const payload = {
        ...monitor,
        type_data: JSON.stringify(typeData)
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
        toast.success("Monitor type settings saved successfully");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save monitor type settings";
      toast.error(message);
    } finally {
      savingType = false;
    }
  }

  async function testMonitor() {
    if (!monitor.id || monitor.monitor_type === "NONE") return;

    testingMonitor = true;
    testResult = null;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "testMonitor",
          data: { monitor_id: monitor.id }
        })
      });

      const result = await response.json();
      testResult = result;
    } catch (e) {
      testResult = { error_message: "Failed to test monitor", status: "NO_DATA", latency: 0, type: "error" };
    } finally {
      testingMonitor = false;
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Monitor Type Configuration</Card.Title>
    <Card.Description>Configure how this monitor checks your service</Card.Description>
  </Card.Header>
  <Card.Content class="space-y-4">
    <div class="flex flex-col gap-2">
      <Label for="monitor-type">Monitor Type</Label>
      <Select.Root
        type="single"
        value={monitor.monitor_type}
        onValueChange={(v) => {
          if (v) {
            monitor.monitor_type = v as MonitorType;
            typeData = v === "GROUP" ? createDefaultGroupTypeData() : {};
          }
        }}
      >
        <Select.Trigger id="monitor-type" class="w-full">
          {monitorTypeLabels[monitor.monitor_type as MonitorType]}
        </Select.Trigger>
        <Select.Content>
          {#each MONITOR_TYPES as type (type)}
            <Select.Item value={type}>{monitorTypeLabels[type]}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>

    <div class="border-t pt-4">
      {#if monitor.monitor_type === "API"}
        <MonitorApi bind:data={typeData} />
      {:else if monitor.monitor_type === "PING"}
        <MonitorPing bind:data={typeData} />
      {:else if monitor.monitor_type === "TCP"}
        <MonitorTcp bind:data={typeData} />
      {:else if monitor.monitor_type === "DNS"}
        <MonitorDns bind:data={typeData} />
      {:else if monitor.monitor_type === "SSL"}
        <MonitorSsl bind:data={typeData} />
      {:else if monitor.monitor_type === "SQL"}
        <MonitorSql bind:data={typeData} />
      {:else if monitor.monitor_type === "HEARTBEAT"}
        <MonitorHeartbeat bind:data={typeData} tag={monitor.tag} />
      {:else if monitor.monitor_type === "GROUP"}
        <MonitorGroup bind:data={typeData} {availableMonitors} tag={monitor.tag} />
      {:else if monitor.monitor_type === "GAMEDIG"}
        <MonitorGamedig bind:data={typeData} />
      {:else if monitor.monitor_type === "NONE"}
        <MonitorNone bind:data={typeData} />
      {/if}
    </div>
  </Card.Content>
  <Card.Footer class=" flex justify-between gap-2">
    <Dialog.Root
      onOpenChange={(e) => {
        if (e) testMonitor();
      }}
    >
      <Dialog.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="secondary">
            <PlayIcon class="size-4" />
            Test Monitor
          </Button>
        {/snippet}
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            {#if testingMonitor}
              Running Test
            {:else if testResult}
              Test Result
            {:else}
              Test Monitor
            {/if}
          </Dialog.Title>
        </Dialog.Header>
        <div class="kener-manage flex flex-col justify-center gap-2">
          {#if testingMonitor}
            <div class="flex flex-col items-center gap-2 py-8">
              <Loader class="size-8 animate-spin" />
              <p class="text-muted-foreground mt-4 text-center">Please wait while the test is being performed...</p>
            </div>
          {:else if testResult}
            <div class="mt-4 flex flex-col gap-4">
              {#if testResult.error_message}
                <div class="bg-destructive/10 text-destructive rounded-md p-3 text-sm font-medium">
                  {testResult.error_message}
                </div>
              {/if}
              <div class="grid grid-cols-2 gap-4">
                <div class="rounded-lg border p-4 text-center">
                  <div class="text-muted-foreground text-xs uppercase">Status</div>
                  <div class="mt-1 text-2xl font-bold text-{testResult.status.toLowerCase()}">
                    {testResult.status}
                  </div>
                </div>
                <div class="rounded-lg border p-4 text-center">
                  <div class="text-muted-foreground text-xs uppercase">Response Time</div>
                  <div class="mt-1 text-2xl font-bold">
                    {testResult.latency}ms
                  </div>
                </div>
              </div>
              <div class="flex justify-end">
                <Button variant="outline" size="sm" onclick={testMonitor} disabled={testingMonitor}>
                  <PlayIcon class="size-3" />
                  Run Test Again
                </Button>
              </div>
            </div>
          {/if}
        </div>
      </Dialog.Content>
    </Dialog.Root>

    <Button onclick={saveTypeSettings} disabled={savingType || !isTypeSettingsValid}>
      {#if savingType}
        <Loader class="size-4 animate-spin" />
      {:else}
        <SaveIcon class="size-4" />
      {/if}
      Save Monitor Type Settings
    </Button>
  </Card.Footer>
</Card.Root>

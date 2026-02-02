<script lang="ts">
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
  import type { PageProps } from "./$types";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import type { MonitorType } from "$lib/types/monitor.js";

  // Card components
  import GeneralSettingsCard from "./components/GeneralSettingsCard.svelte";
  import MonitorTypeCard from "./components/MonitorTypeCard.svelte";
  import UptimeSettingsCard from "./components/UptimeSettingsCard.svelte";
  import PageVisibilityCard from "./components/PageVisibilityCard.svelte";
  import ModifyDataCard from "./components/ModifyDataCard.svelte";
  import DangerZoneCard from "./components/DangerZoneCard.svelte";
  import MonitorAlerting from "./components/MonitorAlerting.svelte";
  import MonitorRecentLogs from "./components/MonitorRecentLogs.svelte";

  let { params }: PageProps = $props();
  const isNew = $derived(params.tag === "new");

  // Form state
  let loading = $state(true);
  let error = $state<string | null>(null);
  let availableMonitors = $state<MonitorRecord[]>([]);

  // Uptime settings state
  let uptimeSettings = $state({
    uptime_formula_numerator: "up + maintenance",
    uptime_formula_denominator: "up + maintenance + down + degraded"
  });

  // Pages state
  interface PageWithMonitors {
    id: number;
    page_path: string;
    page_title: string;
    monitors?: { monitor_tag: string }[];
  }
  let allPages = $state<PageWithMonitors[]>([]);

  // Monitor data
  let monitor = $state<MonitorRecord>({
    id: 0,
    tag: "",
    name: "",
    description: "",
    image: "",
    cron: "* * * * *",
    default_status: "UP",
    status: "ACTIVE",
    category_name: "Home",
    monitor_type: "" as MonitorType,
    is_hidden: "NO",
    monitor_settings_json: "",
    external_url: ""
  });

  // Type-specific data
  let typeData = $state<Record<string, unknown>>({});

  // Get pages this monitor is on
  const monitorPages = $derived(allPages.filter((p) => p.monitors?.some((m) => m.monitor_tag === monitor.tag)));

  async function fetchMonitor() {
    if (isNew) {
      loading = false;
      return;
    }

    loading = true;
    error = null;
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getMonitors", data: { tag: params.tag } })
      });
      const result = await response.json();
      if (result.error) {
        error = result.error;
      } else if (result.length > 0) {
        const m = result[0];
        monitor = {
          id: m.id,
          tag: m.tag,
          name: m.name,
          description: m.description || "",
          image: m.image || "",
          cron: m.cron || "* * * * *",
          default_status: m.default_status || "UP",
          status: m.status || "ACTIVE",
          category_name: m.category_name || "Home",
          monitor_type: m.monitor_type || "",
          is_hidden: m.is_hidden || "NO",
          monitor_settings_json: m.monitor_settings_json || "",
          external_url: m.external_url || ""
        };
        // Parse type_data
        if (m.type_data) {
          try {
            typeData = JSON.parse(m.type_data);
          } catch (e) {
            console.error("Failed to parse type_data:", e);
            typeData = {};
          }
        }
        // Parse monitor_settings_json
        if (m.monitor_settings_json) {
          try {
            const settings = JSON.parse(m.monitor_settings_json);
            uptimeSettings = {
              uptime_formula_numerator: settings.uptime_formula_numerator || "up + maintenance",
              uptime_formula_denominator: settings.uptime_formula_denominator || "up + maintenance + down + degraded"
            };
          } catch (e) {
            console.error("Failed to parse monitor_settings_json:", e);
          }
        }
      } else {
        error = "Monitor not found";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to fetch monitor";
    } finally {
      loading = false;
    }
  }

  async function fetchAvailableMonitors() {
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getMonitors", data: { status: "ACTIVE" } })
      });
      const result = await response.json();
      if (!result.error) {
        availableMonitors = result;
      }
    } catch {
      // Ignore errors for available monitors
    }
  }

  async function fetchPages() {
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getPages" })
      });
      const result = await response.json();
      if (!result.error) {
        allPages = result;
      }
    } catch {
      // Ignore errors for pages
    }
  }

  $effect(() => {
    fetchMonitor();
    fetchAvailableMonitors();
    fetchPages();
  });
</script>

<div class="flex w-full flex-col gap-4 p-4">
  <div class="mb-4 flex items-center justify-between">
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/manage/app/monitors">Monitors</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Page>{isNew ? "New Monitor" : monitor.name || params.tag}</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
    <div class="flex items-center gap-2">
      <div class="flex items-center space-x-2">
        <Switch
          id="active-mode"
          checked={monitor.status === "ACTIVE"}
          onCheckedChange={(checked) => (monitor.status = checked ? "ACTIVE" : "INACTIVE")}
        />
        <Label for="active-mode">{monitor.status === "ACTIVE" ? "Active" : "Inactive"}</Label>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="size-8" />
    </div>
  {:else if error}
    <Card.Root class="border-destructive">
      <Card.Content class="pt-6">
        <p class="text-destructive">{error}</p>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Warning Alert if monitor is not on any page -->
    {#if !isNew && monitorPages.length === 0}
      <Alert.Root variant="destructive">
        <AlertTriangleIcon class="size-4" />
        <Alert.Title>Monitor Not Visible</Alert.Title>
        <Alert.Description>
          This monitor is not added to any page. It won't be visible on your status page until you add it to at least
          one page.
        </Alert.Description>
      </Alert.Root>
    {/if}

    <!-- General Settings Card -->
    <GeneralSettingsCard bind:monitor {typeData} {isNew} />

    <!-- Monitor Type Configuration Card -->
    {#if !isNew}
      <MonitorTypeCard bind:monitor bind:typeData {availableMonitors} />
    {/if}

    <!-- Uptime Calculation Card -->
    {#if !isNew}
      <UptimeSettingsCard {monitor} {typeData} bind:uptimeSettings />
    {/if}

    <!-- Alerting Card -->
    {#if !isNew}
      <MonitorAlerting monitor_tag={params.tag} />
    {/if}

    <!-- Recent Logs Card -->
    {#if !isNew}
      <MonitorRecentLogs monitor_tag={params.tag} />
    {/if}

    <!-- Pages Card -->
    {#if !isNew}
      <PageVisibilityCard monitorTag={monitor.tag} {allPages} onPagesUpdated={fetchPages} />
    {/if}

    <!-- Modify Monitoring Data Card -->
    {#if !isNew}
      <ModifyDataCard monitorTag={monitor.tag} />
    {/if}

    <!-- Danger Zone Card -->
    {#if !isNew}
      <DangerZoneCard monitorTag={monitor.tag} />
    {/if}
  {/if}
</div>

<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import UploadIcon from "@lucide/svelte/icons/upload";
  import XIcon from "@lucide/svelte/icons/x";
  import ImageIcon from "@lucide/svelte/icons/image";
  import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import PlayIcon from "@lucide/svelte/icons/play";
  import DatabaseIcon from "@lucide/svelte/icons/database";
  import type { PageProps } from "./$types";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import { MONITOR_TYPES, type MonitorType } from "$lib/types/monitor.js";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { ValidateIpAddress, IsValidHost, IsValidNameServer, IsValidURL, IsValidPort } from "$lib/clientTools";
  import { GAMEDIG_SOCKET_TIMEOUT } from "$lib/anywhere";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import type { MonitoringResult } from "$lib/server/types/monitor.js";
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
  } from "./types/index.js";

  let { params }: PageProps = $props();
  const isNew = $derived(params.tag === "new");

  // Form state
  let loading = $state(true);
  let savingGeneral = $state(false);
  let savingType = $state(false);
  let uploadingImage = $state(false);
  let error = $state<string | null>(null);
  let availableMonitors = $state<MonitorRecord[]>([]);
  let deleting = $state(false);
  let deleteConfirmText = $state("");

  // Test monitor state
  let testingMonitor = $state(false);
  let testResult = $state<MonitoringResult | null>(null);

  // Modify monitoring data state
  let modifyingData = $state(false);
  let modifyDataError = $state<string | null>(null);
  let modifyDataForm = $state({
    start: "",
    end: "",
    newStatus: "UP" as "UP" | "DEGRADED" | "DOWN"
  });

  // Uptime settings state
  let savingUptimeSettings = $state(false);
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
  let savingPages = $state(false);

  // Monitor data
  let monitor = $state({
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
    day_degraded_minimum_count: 1,
    day_down_minimum_count: 1,
    include_degraded_in_downtime: "NO",
    is_hidden: "NO"
  });

  // Type-specific data
  let typeData = $state<Record<string, unknown>>({});

  // Validation helper functions
  async function isValidEval(ev: string): Promise<boolean> {
    if (!ev) return true; // Empty eval is valid
    if (ev.endsWith(";")) return false;
    if (!ev.startsWith("(") || !ev.endsWith(")")) return false;
    try {
      new Function(ev);
      return true;
    } catch {
      return false;
    }
  }

  // Validate uptime formula
  // Valid values: up, down, degraded, maintenance
  // Valid operators: + - * /
  function isValidUptimeFormula(formula: string): boolean {
    if (!formula || typeof formula !== "string") return false;

    const normalized = formula.toLowerCase().replace(/\s+/g, "");
    if (normalized.length === 0) return false;

    const validVars = ["up", "down", "degraded", "maintenance"];
    const validOperators = ["+", "-", "*", "/"];

    const tokens: string[] = [];
    let currentToken = "";

    for (const char of normalized) {
      if (validOperators.includes(char)) {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = "";
        }
        tokens.push(char);
      } else {
        currentToken += char;
      }
    }
    if (currentToken) {
      tokens.push(currentToken);
    }

    if (tokens.length === 0) return false;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (i % 2 === 0) {
        if (!validVars.includes(token)) return false;
      } else {
        if (!validOperators.includes(token)) return false;
      }
    }

    if (tokens.length % 2 === 0) return false;

    return true;
  }

  // Derived validation for uptime settings
  const isUptimeSettingsValid = $derived(
    isValidUptimeFormula(uptimeSettings.uptime_formula_numerator) &&
      isValidUptimeFormula(uptimeSettings.uptime_formula_denominator)
  );

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
        if (!data.nameServer || !IsValidNameServer(data.nameServer)) return false;
        if (!data.lookupRecord) return false;
        if (!data.values || !Array.isArray(data.values) || data.values.length === 0) return false;
        // Check that at least one value is not empty
        const hasNonEmptyValue = data.values.some((val: string) => val && val.trim() !== "");
        if (!hasNonEmptyValue) return false;
        return true;
      }

      case "GROUP": {
        const data = typeData as any;
        if (!data.monitors || !Array.isArray(data.monitors)) return false;
        const selected = data.monitors.filter((m: any) => m.selected);
        if (selected.length < 2) return false;
        if (!data.timeout || data.timeout < 1000) return false;
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
          day_degraded_minimum_count: m.day_degraded_minimum_count || 1,
          day_down_minimum_count: m.day_down_minimum_count || 1,
          include_degraded_in_downtime: m.include_degraded_in_downtime || "NO",
          is_hidden: m.is_hidden || "NO"
        };
        // Parse type_data
        if (m.type_data) {
          try {
            typeData = JSON.parse(m.type_data);
          } catch (e: any) {
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
          } catch (e: any) {
            console.error("Failed to parse monitor_settings_json:", e);
            // Keep defaults
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

  // Check if monitor is on a specific page
  function isMonitorOnPage(pageId: number): boolean {
    const page = allPages.find((p) => p.id === pageId);
    return page?.monitors?.some((m) => m.monitor_tag === monitor.tag) ?? false;
  }

  // Get pages this monitor is on
  const monitorPages = $derived(allPages.filter((p) => p.monitors?.some((m) => m.monitor_tag === monitor.tag)));

  // Toggle monitor on a page
  async function toggleMonitorOnPage(pageId: number, checked: boolean) {
    savingPages = true;
    try {
      const action = checked ? "addMonitorToPage" : "removeMonitorFromPage";
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          data: {
            page_id: pageId,
            monitor_tag: monitor.tag
          }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(checked ? "Monitor added to page" : "Monitor removed from page");
        await fetchPages();
      }
    } catch (e) {
      toast.error("Failed to update page");
    } finally {
      savingPages = false;
    }
  }

  async function handleImageUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Allowed: PNG, JPG, SVG, WebP");
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 2MB");
      return;
    }

    uploadingImage = true;

    try {
      const base64 = await fileToBase64(file);

      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "uploadImage",
          data: {
            base64,
            mimeType: file.type,
            fileName: file.name,
            maxWidth: 128,
            maxHeight: 128,
            prefix: "monitor_"
          }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        monitor.image = result.url;
        toast.success("Image uploaded successfully");
      }
    } catch (e) {
      toast.error("Failed to upload image");
    } finally {
      uploadingImage = false;
      input.value = "";
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  function clearImage() {
    monitor.image = "";
  }

  async function saveGeneralSettings() {
    savingGeneral = true;
    error = null;

    try {
      const payload: Record<string, unknown> = {
        ...monitor,
        type_data: JSON.stringify(typeData)
      };

      // Include default uptime settings when creating a new monitor
      if (isNew) {
        payload.monitor_settings_json = JSON.stringify({
          uptime_formula_numerator: "up + maintenance",
          uptime_formula_denominator: "up + maintenance + down + degraded"
        });
      }

      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "storeMonitorData", data: payload })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else if (isNew) {
        toast.success("Monitor created successfully");
        // Redirect to the new monitor's page after creation
        goto(`/manage/app/monitors/${monitor.tag}`);
      } else {
        toast.success("General settings saved successfully");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save general settings";
      toast.error(message);
    } finally {
      savingGeneral = false;
    }
  }

  async function saveTypeSettings() {
    savingType = true;
    error = null;

    try {
      const payload = {
        ...monitor,
        type_data: JSON.stringify(typeData)
      };

      const response = await fetch("/manage/api", {
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

  async function deleteMonitor() {
    if (isNew || !monitor.tag) return;
    if (deleteConfirmText !== `delete ${monitor.tag}`) {
      toast.error("Please type the correct confirmation text");
      return;
    }

    deleting = true;
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteMonitor",
          data: { tag: monitor.tag }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Monitor deleted successfully");
        goto("/manage/app/monitors");
      }
    } catch (e) {
      toast.error("Failed to delete monitor");
    } finally {
      deleting = false;
    }
  }

  async function testMonitor() {
    if (isNew || !monitor.id || monitor.monitor_type === "NONE") return;

    testingMonitor = true;
    testResult = null;
    try {
      const response = await fetch("/manage/api", {
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

    modifyingData = true;
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateMonitoringData",
          data: {
            monitor_tag: monitor.tag,
            start: startTimestamp,
            end: endTimestamp,
            newStatus: modifyDataForm.newStatus
          }
        })
      });

      const result = await response.json();
      if (result.error) {
        modifyDataError = result.error;
      } else {
        toast.success("Monitoring data updated successfully");
        modifyDataForm = { start: "", end: "", newStatus: "UP" };
      }
    } catch (e) {
      modifyDataError = "Failed to update monitoring data";
    } finally {
      modifyingData = false;
    }
  }

  async function saveUptimeSettings() {
    if (!isUptimeSettingsValid) {
      toast.error("Invalid uptime formula. Use: up, down, degraded, maintenance with +, -, *, /");
      return;
    }

    savingUptimeSettings = true;
    try {
      const payload = {
        ...monitor,
        type_data: JSON.stringify(typeData),
        monitor_settings_json: JSON.stringify(uptimeSettings)
      };

      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "storeMonitorData", data: payload })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Uptime settings saved successfully");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save uptime settings";
      toast.error(message);
    } finally {
      savingUptimeSettings = false;
    }
  }

  $effect(() => {
    fetchMonitor();
    fetchAvailableMonitors();
    fetchPages();
  });

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
    <Card.Root>
      <Card.Header>
        <Card.Title>General Settings</Card.Title>
        <Card.Description>Basic information about this monitor</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <Label for="monitor-name">Name <span class="text-destructive">*</span></Label>
            <Input id="monitor-name" bind:value={monitor.name} placeholder="My API Monitor" />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="monitor-tag">Tag <span class="text-destructive">*</span></Label>
            <Input id="monitor-tag" bind:value={monitor.tag} placeholder="my-api-monitor" disabled={!isNew} />
            <p class="text-muted-foreground mt-1 text-xs">Unique identifier (cannot be changed after creation)</p>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <Label for="monitor-description">Description</Label>
          <Textarea
            id="monitor-description"
            bind:value={monitor.description}
            placeholder="A brief description of what this monitor checks"
            rows={3}
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <Label>Monitor Image</Label>
            <div class="flex items-center gap-3">
              <div class="bg-muted flex h-12 w-12 items-center justify-center rounded-md border">
                {#if monitor.image}
                  <img src={monitor.image} alt="Monitor" class="max-h-10 max-w-10 object-contain" />
                {:else}
                  <ImageIcon class="text-muted-foreground h-5 w-5" />
                {/if}
              </div>
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingImage}
                  onclick={() => document.getElementById("monitor-image-input")?.click()}
                >
                  {#if uploadingImage}
                    <Loader class="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  {:else}
                    <UploadIcon class="mr-2 h-4 w-4" />
                    Upload
                  {/if}
                </Button>
                <input
                  id="monitor-image-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  class="hidden"
                  onchange={handleImageUpload}
                  disabled={uploadingImage}
                />
                {#if monitor.image}
                  <Button variant="ghost" size="icon" onclick={clearImage}>
                    <XIcon class="h-4 w-4" />
                  </Button>
                {/if}
              </div>
            </div>
            <p class="text-muted-foreground text-xs">Max 128x128px, PNG/JPG/SVG/WebP</p>
          </div>
          <div class="flex flex-col gap-2">
            <Label for="monitor-cron">Cron Schedule</Label>
            <Input id="monitor-cron" bind:value={monitor.cron} placeholder="* * * * *" />
            <p class="text-muted-foreground mt-1 text-xs">How often to check (cron format)</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <Label for="monitor-default-status">Default Status</Label>
            <Select.Root
              type="single"
              value={monitor.default_status}
              onValueChange={(v) => {
                if (v) monitor.default_status = v;
              }}
            >
              <Select.Trigger id="monitor-default-status" class="w-full">
                {monitor.default_status}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="UP">UP</Select.Item>
                <Select.Item value="DOWN">DOWN</Select.Item>
                <Select.Item value="DEGRADED">DEGRADED</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
          <div class="flex flex-col gap-2">
            <Label for="hidden-switch">Hidden in Status Page</Label>
            <div class="flex items-center gap-2">
              <Switch
                id="hidden-switch"
                checked={monitor.is_hidden === "YES"}
                onCheckedChange={(checked) => (monitor.is_hidden = checked ? "YES" : "NO")}
              />
              <span class="text-muted-foreground text-xs">
                {monitor.is_hidden === "YES" ? "Hidden" : "Visible"}
              </span>
            </div>
            <p class="text-muted-foreground text-xs">
              Hidden monitors won't appear on any status pages, but monitoring, alerting, and all other features will
              continue to work normally.
            </p>
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveGeneralSettings} disabled={savingGeneral}>
          {#if savingGeneral}
            <Loader class="mr-2 size-4 animate-spin" />
          {:else}
            <SaveIcon class="mr-2 size-4" />
          {/if}
          {isNew ? "Create Monitor" : "Save General Settings"}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Monitor Type Configuration Card -->
    {#if !isNew}
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
                  typeData = {}; // Reset type data when changing type
                }
              }}
            >
              <Select.Trigger id="monitor-type" class="w-full">
                {monitorTypeLabels[monitor.monitor_type]}
              </Select.Trigger>
              <Select.Content>
                {#each MONITOR_TYPES as type}
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
              <MonitorGroup bind:data={typeData} {availableMonitors} />
            {:else if monitor.monitor_type === "GAMEDIG"}
              <MonitorGamedig bind:data={typeData} />
            {:else if monitor.monitor_type === "NONE"}
              <MonitorNone bind:data={typeData} />
            {/if}
          </div>
        </Card.Content>
        <Card.Footer class="flex justify-between gap-2">
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
              <div class="flex flex-col justify-center gap-2">
                {#if testingMonitor}
                  <div class="flex flex-col items-center gap-2 py-8">
                    <Loader class="size-8 animate-spin" />
                    <p class="text-muted-foreground mt-4 text-center">
                      Please wait while the test is being performed...
                    </p>
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
                        <PlayIcon class="mr-2 size-3" />
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
              <Loader class="mr-2 size-4 animate-spin" />
            {:else}
              <SaveIcon class="mr-2 size-4" />
            {/if}
            Save Monitor Type Settings
          </Button>
        </Card.Footer>
      </Card.Root>
    {/if}

    {#if !isNew}
      <Card.Root>
        <Card.Header>
          <Card.Title>Uptime Calculation</Card.Title>
          <Card.Description>Customize how uptime percentage is calculated for this monitor</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="flex gap-2">
            <InputGroup.Root>
              <InputGroup.Addon>a =</InputGroup.Addon>
              <InputGroup.Input
                placeholder="up + maintenance"
                bind:value={uptimeSettings.uptime_formula_numerator}
                class={!isValidUptimeFormula(uptimeSettings.uptime_formula_numerator) ? "border-destructive" : ""}
              />
            </InputGroup.Root>
            <InputGroup.Root>
              <InputGroup.Addon>b =</InputGroup.Addon>
              <InputGroup.Input
                placeholder="up + maintenance + down + degraded"
                bind:value={uptimeSettings.uptime_formula_denominator}
                class={!isValidUptimeFormula(uptimeSettings.uptime_formula_denominator) ? "border-destructive" : ""}
              />
            </InputGroup.Root>
          </div>
          <div class="text-muted-foreground text-sm">
            <p><strong>Uptime % = (a / b) × 100</strong></p>
            <p class="mt-2 text-xs">
              Valid variables: <code class="bg-muted rounded px-1">up</code>,
              <code class="bg-muted rounded px-1">down</code>,
              <code class="bg-muted rounded px-1">degraded</code>,
              <code class="bg-muted rounded px-1">maintenance</code>
            </p>
            <p class="text-xs">
              Valid operators: <code class="bg-muted rounded px-1">+</code>,
              <code class="bg-muted rounded px-1">-</code>,
              <code class="bg-muted rounded px-1">*</code>,
              <code class="bg-muted rounded px-1">/</code>
            </p>
          </div>
        </Card.Content>
        <Card.Footer class="flex justify-end">
          <Button onclick={saveUptimeSettings} disabled={savingUptimeSettings || !isUptimeSettingsValid}>
            {#if savingUptimeSettings}
              <Loader class="mr-2 size-4 animate-spin" />
            {:else}
              <SaveIcon class="mr-2 size-4" />
            {/if}
            Save Uptime Settings
          </Button>
        </Card.Footer>
      </Card.Root>
    {/if}
    <!-- Pages Card -->
    {#if !isNew}
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <FileTextIcon class="size-5" />
            Page Visibility
          </Card.Title>
          <Card.Description>Select which pages this monitor should appear on</Card.Description>
        </Card.Header>
        <Card.Content>
          {#if allPages.length === 0}
            <p class="text-muted-foreground text-sm">No pages available. Create a page first.</p>
          {:else}
            <div class="flex flex-row flex-wrap gap-2 space-y-3">
              {#each allPages as page (page.id)}
                <div class="flex h-12 items-center space-x-3 rounded-xl border px-4 py-2">
                  <Checkbox
                    id="page-{page.id}"
                    checked={isMonitorOnPage(page.id)}
                    onCheckedChange={(checked) => toggleMonitorOnPage(page.id, !!checked)}
                    disabled={savingPages}
                  />
                  <Label for="page-{page.id}" class="flex cursor-pointer flex-row">
                    <span class="font-medium">{page.page_title}</span>
                    <span class="text-muted-foreground text-xs">{page.page_path}</span>
                  </Label>
                </div>
              {/each}
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Modify Monitoring Data Card -->
    {#if !isNew}
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
            <div class="grid grid-cols-3 gap-4">
              <div class="space-y-2">
                <Label for="start_date">Start Date & Time <span class="text-destructive">*</span></Label>
                <Input id="start_date" type="datetime-local" bind:value={modifyDataForm.start} />
              </div>
              <div class="space-y-2">
                <Label for="end_date">End Date & Time <span class="text-destructive">*</span></Label>
                <Input id="end_date" type="datetime-local" bind:value={modifyDataForm.end} min={modifyDataForm.start} />
              </div>
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
            </div>
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
    {/if}

    <!-- Danger Zone Card -->
    {#if !isNew}
      <Card.Root class="border-destructive">
        <Card.Header>
          <Card.Title class="text-destructive flex items-center gap-2">
            <TrashIcon class="size-5" />
            Danger Zone
          </Card.Title>
          <Card.Description>Deleting a monitor is irreversible. Please be sure before deleting.</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="flex items-end gap-4">
            <div class="flex-1 space-y-2">
              <Label for="deleteConfirm">
                Type <span class="text-destructive font-mono">delete {monitor.tag}</span> to confirm
              </Label>
              <Input id="deleteConfirm" bind:value={deleteConfirmText} placeholder="delete {monitor.tag}" />
            </div>
            <Button
              variant="destructive"
              onclick={deleteMonitor}
              disabled={deleting || deleteConfirmText !== `delete ${monitor.tag}`}
            >
              {#if deleting}
                <Loader class="mr-2 size-4 animate-spin" />
                Deleting...
              {:else}
                <TrashIcon class="mr-2 size-4" />
                Delete Monitor
              {/if}
            </Button>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  {/if}
</div>

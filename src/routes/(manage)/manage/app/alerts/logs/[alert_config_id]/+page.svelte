<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT } = getAdminI18n();

  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import BellOffIcon from "@lucide/svelte/icons/bell-off";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import { toast } from "svelte-sonner";
  import LocalTime from "$lib/components/LocalTime.svelte";
  import type { MonitorAlertConfigWithTriggers, MonitorAlertV2WithConfig } from "$lib/server/types/db";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  let { data } = $props();
  const alertConfigId = $derived(data.alert_config_id);

  // State
  let loading = $state(true);
  let alerts = $state<MonitorAlertV2WithConfig[]>([]);
  let configInfo = $state<MonitorAlertConfigWithTriggers | null>(null);
  let totalPages = $state(0);
  let totalCount = $state(0);
  let pageNo = $state(1);
  let statusFilter = $state("ALL");
  const limit = 20;

  // Delete dialog state
  let deleteDialogOpen = $state(false);
  let alertToDelete = $state<MonitorAlertV2WithConfig | null>(null);
  let deleteIncident = $state(false);

  // Fetch config info
  async function fetchConfigInfo() {
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getMonitorAlertConfigById",
          data: { id: parseInt(alertConfigId) }
        })
      });
      const result = await response.json();
      if (!result.error) {
        configInfo = result;
      }
    } catch (error) {
      console.error("Error fetching config info:", error);
    }
  }

  // Fetch alerts
  async function fetchAlerts() {
    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getAllAlertsPaginated",
          data: {
            page: pageNo,
            limit,
            config_id: parseInt(alertConfigId),
            status: statusFilter
          }
        })
      });
      const result = await response.json();
      if (!result.error) {
        alerts = result.alerts || [];
        totalCount = result.total || 0;
        totalPages = Math.ceil(totalCount / limit);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      loading = false;
    }
  }

  // Update alert status
  async function updateAlertStatus(alertId: number, newStatus: "TRIGGERED" | "RESOLVED") {
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateMonitorAlertV2Status",
          data: { id: alertId, status: newStatus }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT("Status updated to {newStatus}", { newStatus: $adminT(newStatus) }));
        await fetchAlerts();
      }
    } catch (error) {
      toast.error($adminT("Failed to update status"));
    }
  }

  // Open delete dialog
  function openDeleteDialog(alert: MonitorAlertV2WithConfig) {
    alertToDelete = alert;
    deleteIncident = false;
    deleteDialogOpen = true;
  }

  // Delete alert
  async function confirmDelete() {
    if (!alertToDelete) return;

    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteMonitorAlertV2",
          data: {
            id: alertToDelete.id,
            deleteIncident: deleteIncident,
            incident_id: alertToDelete.incident_id
          }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT("Alert deleted successfully"));
        await fetchAlerts();
      }
    } catch (error) {
      toast.error($adminT("Failed to delete alert"));
    } finally {
      deleteDialogOpen = false;
      alertToDelete = null;
    }
  }

  // Handle filter change
  function handleStatusChange(value: string | undefined) {
    if (value) {
      statusFilter = value;
      pageNo = 1;
      fetchAlerts();
    }
  }

  // Pagination
  function goToPage(page: number) {
    pageNo = page;
    fetchAlerts();
  }

  onMount(async () => {
    await Promise.all([fetchConfigInfo(), fetchAlerts()]);
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Breadcrumb -->
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Link href={clientResolver(resolve, "/manage/app/alerts")}>{$adminT("Alerts")}</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>{$adminT("Alert Logs")}</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>

  <!-- Header -->

  <!-- Filter -->
  <div class="flex items-center gap-3">
    <Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
      <Select.Trigger class="w-36" aria-label={$adminT("Filter alerts by status")}>
        {statusFilter === "ALL"
          ? $adminT("All Status")
          : $adminT(statusFilter === "TRIGGERED" ? "Triggered" : "Resolved")}
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="ALL">{$adminT("All Status")}</Select.Item>
        <Select.Item value="TRIGGERED">{$adminT("Triggered")}</Select.Item>
        <Select.Item value="RESOLVED">{$adminT("Resolved")}</Select.Item>
      </Select.Content>
    </Select.Root>
    {#if loading}
      <Spinner class="size-5" />
    {/if}
  </div>

  <!-- Empty State -->
  {#if !loading && alerts.length === 0}
    <div class="flex flex-col items-center gap-4 py-16 text-center">
      <BellOffIcon class="text-muted-foreground size-16" />
      <div class="space-y-2">
        <h3 class="text-lg font-semibold">{$adminT("No alert logs")}</h3>
        <p class="text-muted-foreground text-sm">
          {statusFilter === "TRIGGERED"
            ? $adminT("No triggered alerts found.")
            : statusFilter === "RESOLVED"
              ? $adminT("No resolved alerts found.")
              : $adminT("This alert has not been triggered yet.")}
        </p>
      </div>
    </div>
  {:else}
    <!-- Table -->
    <div class="ktable rounded-lg border">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-16">{$adminT("ID")}</Table.Head>
            <Table.Head class="w-40">{$adminT("Monitor")}</Table.Head>
            <Table.Head class="w-40">{$adminT("Status")}</Table.Head>
            <Table.Head class="w-32">{$adminT("Incident")}</Table.Head>
            <Table.Head class="w-44">{$adminT("Created At")}</Table.Head>
            <Table.Head class="w-44">{$adminT("Updated At")}</Table.Head>
            <Table.Head class="w-20 text-right">{$adminT("Actions")}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each alerts as alert (alert.id)}
            <Table.Row class="hover:bg-muted/50">
              <Table.Cell class="font-medium">{alert.id}</Table.Cell>
              <Table.Cell>
                {#if alert.monitor_tag}
                  <Badge variant="outline">{alert.monitor_tag}</Badge>
                {:else}
                  <span class="text-muted-foreground text-sm">—</span>
                {/if}
              </Table.Cell>
              <Table.Cell>
                <Select.Root
                  type="single"
                  value={alert.alert_status}
                  onValueChange={(v) => v && updateAlertStatus(alert.id, v as "TRIGGERED" | "RESOLVED")}
                >
                  <Select.Trigger class="h-8 w-32">{$adminT(String(alert.alert_status ?? ""))}</Select.Trigger>
                  <Select.Content>
                    <Select.Item value="TRIGGERED">{$adminT("TRIGGERED")}</Select.Item>
                    <Select.Item value="RESOLVED">{$adminT("RESOLVED")}</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Table.Cell>
              <Table.Cell>
                {#if alert.incident_id}
                  <a
                    href={clientResolver(resolve, `/manage/app/incidents/${alert.incident_id}`)}
                    class="text-primary inline-flex items-center gap-1 text-sm hover:underline"
                  >
                    #{alert.incident_id}
                    <ExternalLinkIcon class="size-3" />
                  </a>
                {:else}
                  <span class="text-muted-foreground text-sm">—</span>
                {/if}
              </Table.Cell>
              <Table.Cell class="text-muted-foreground text-sm"><LocalTime value={alert.created_at} /></Table.Cell>
              <Table.Cell class="text-muted-foreground text-sm"><LocalTime value={alert.updated_at} /></Table.Cell>
              <Table.Cell class="text-right">
                <Button variant="destructive" size="sm" class="text-xs" onclick={() => openDeleteDialog(alert)}>
                  <TrashIcon class="size-3" />
                  {$adminT("Delete")}
                </Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {/if}

  <!-- Pagination -->
  {#if totalCount > 0}
    {@const startItem = (pageNo - 1) * limit + 1}
    {@const endItem = Math.min(pageNo * limit, totalCount)}
    <div class="flex items-center justify-between">
      <span class="text-muted-foreground text-sm"
        >{$adminT("Showing {startItem}-{endItem} of {totalCount}", {
          startItem: startItem,
          endItem: endItem,
          totalCount: totalCount
        })}</span
      >
      {#if totalPages > 1}
        <div class="flex items-center gap-2">
          <Button
            aria-label={$adminT("Previous page")}
            variant="outline"
            size="icon"
            disabled={pageNo === 1}
            onclick={() => goToPage(pageNo - 1)}
          >
            <ChevronLeftIcon class="size-4" />
          </Button>
          <div class="flex items-center gap-1">
            {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
              {#if page === 1 || page === totalPages || (page >= pageNo - 1 && page <= pageNo + 1)}
                <Button variant={page === pageNo ? "default" : "ghost"} size="sm" onclick={() => goToPage(page)}>
                  {page}
                </Button>
              {:else if page === pageNo - 2 || page === pageNo + 2}
                <span class="text-muted-foreground px-1">...</span>
              {/if}
            {/each}
          </div>
          <Button
            aria-label={$adminT("Next page")}
            variant="outline"
            size="icon"
            disabled={pageNo === totalPages}
            onclick={() => goToPage(pageNo + 1)}
          >
            <ChevronRightIcon class="size-4" />
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{$adminT("Delete Alert")}</AlertDialog.Title>
      <AlertDialog.Description>
        {$adminT("Are you sure you want to delete this alert? This action cannot be undone.")}
      </AlertDialog.Description>
    </AlertDialog.Header>

    {#if alertToDelete?.incident_id}
      <div class="flex items-center gap-3 py-2">
        <Checkbox id="delete-incident" bind:checked={deleteIncident} />
        <label for="delete-incident" class="text-sm">
          {$adminT("Also delete associated incident")}
          <span class="text-primary font-medium">#{alertToDelete.incident_id}</span>
        </label>
      </div>
    {/if}

    <AlertDialog.Footer>
      <AlertDialog.Cancel>{$adminT("Cancel")}</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmDelete}>{$adminT("Delete")}</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

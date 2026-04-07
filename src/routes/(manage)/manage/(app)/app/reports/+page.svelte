<script>
  import { base } from "$app/paths";
  import * as Card from "$lib/components/ui/card";
  import * as Select from "$lib/components/ui/select";
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import { DatePicker } from "date-picker-svelte";
  import Download from "lucide-svelte/icons/download";
  import FileText from "lucide-svelte/icons/file-text";
  import Loader from "lucide-svelte/icons/loader";
  import TrendingUp from "lucide-svelte/icons/trending-up";
  import TrendingDown from "lucide-svelte/icons/trending-down";
  import AlertCircle from "lucide-svelte/icons/alert-circle";
  import Calendar from "lucide-svelte/icons/calendar";
  import axios from "axios";
  import Papa from "papaparse";
  import { format, startOfDay, endOfDay } from "date-fns";

  export let data;
  let monitors = data.monitors || [];

  let selectedMonitor = null;
  let selectedMonitorName = "";
  let startDate = new Date();
  let endDate = new Date();
  let loading = false;
  let report = null;
  let error = null;

  async function generateReport() {
    if (!selectedMonitor) {
      error = "Please select a monitor";
      return;
    }

    loading = true;
    error = null;
    report = null;

    try {
      const startTimestamp = Math.floor(startOfDay(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(endOfDay(endDate).getTime() / 1000);

      const response = await axios.post(`${base}/manage/app/reports/api`, {
        monitor_tag: selectedMonitor,
        startTimestamp,
        endTimestamp
      });

      report = response.data.report;
    } catch (err) {
      error = err.response?.data?.error || "Error generating report";
      console.error("Error generating report:", err);
    } finally {
      loading = false;
    }
  }

  async function exportToCSV() {
    if (!report) return;

    try {
      const startTimestamp = Math.floor(startOfDay(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(endOfDay(endDate).getTime() / 1000);

      const response = await axios.post(`${base}/manage/app/reports/api`, {
        monitor_tag: selectedMonitor,
        startTimestamp,
        endTimestamp,
        format: "csv"
      });

      const csvData = response.data.csvData;
      const csv = Papa.unparse(csvData);

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `downtime-report-${selectedMonitor}-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      error = "Error exporting CSV";
      console.error("Error exporting CSV:", err);
    }
  }

  function handleMonitorSelect(value) {
    selectedMonitor = value;
    const monitor = monitors.find((m) => m.tag === value);
    selectedMonitorName = monitor ? monitor.name : "";
  }
</script>

<div class="container mx-auto p-6">
  <div class="mb-6">
    <h1 class="text-3xl font-bold">Downtime Reports</h1>
    <p class="mt-2 text-muted-foreground">
      Generate detailed downtime reports for your monitors with customizable date ranges
    </p>
  </div>

  <Card.Root class="mb-6">
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <FileText class="h-5 w-5" />
        Generate Report
      </Card.Title>
      <Card.Description>Select monitor and date range to generate downtime report</Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Label for="monitor" class="mb-2 block">Monitor</Label>
          <Select.Root onSelectedChange={(v) => handleMonitorSelect(v.value)}>
            <Select.Trigger class="w-full">
              <Select.Value placeholder="Select monitor" />
            </Select.Trigger>
            <Select.Content>
              {#each monitors as monitor}
                <Select.Item value={monitor.tag}>
                  {monitor.name}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div>
          <Label class="mb-2 block">
            <Calendar class="mr-1 inline h-4 w-4" />
            Start Date
          </Label>
          <DatePicker bind:value={startDate} />
        </div>

        <div>
          <Label class="mb-2 block">
            <Calendar class="mr-1 inline h-4 w-4" />
            End Date
          </Label>
          <DatePicker bind:value={endDate} />
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <Button on:click={generateReport} disabled={loading}>
          {#if loading}
            <Loader class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            <FileText class="mr-2 h-4 w-4" />
          {/if}
          Generate Report
        </Button>

        {#if report}
          <Button variant="outline" on:click={exportToCSV}>
            <Download class="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        {/if}
      </div>

      {#if error}
        <div class="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-destructive">
          <AlertCircle class="h-5 w-5" />
          <span>{error}</span>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  {#if report}
    <Card.Root class="mb-6">
      <Card.Header>
        <Card.Title>Summary - {report.monitor.name}</Card.Title>
        <Card.Description>
          Period: {report.period.startFormatted} to {report.period.endFormatted}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div class="rounded-lg border p-4">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp class="h-4 w-4" />
              Uptime
            </div>
            <p class="mt-2 text-2xl font-bold text-green-600">
              {report.summary.uptimePercentage}%
            </p>
          </div>
          <div class="rounded-lg border p-4">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown class="h-4 w-4" />
              Downtime
            </div>
            <p class="mt-2 text-2xl font-bold text-red-600">
              {report.summary.downtimePercentage}%
            </p>
          </div>
          <div class="rounded-lg border p-4">
            <p class="text-sm text-muted-foreground">Total Downtime</p>
            <p class="mt-2 text-2xl font-bold">
              {report.summary.totalDowntimeHours}h
            </p>
            <p class="text-xs text-muted-foreground">
              ({report.summary.totalDowntimeMinutes} min)
            </p>
          </div>
          <div class="rounded-lg border p-4">
            <p class="text-sm text-muted-foreground">Downtime Events</p>
            <p class="mt-2 text-2xl font-bold">{report.summary.totalEvents}</p>
          </div>
          <div class="rounded-lg border p-4">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle class="h-4 w-4" />
              Alerts Generated
            </div>
            <p class="mt-2 text-2xl font-bold">{report.summary.alertsGenerated}</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <Card.Title>Downtime Events</Card.Title>
        <Card.Description>
          {report.downtimes.length} event{report.downtimes.length !== 1 ? "s" : ""} found
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {#if report.downtimes.length === 0}
          <div class="py-8 text-center text-muted-foreground">
            <TrendingUp class="mx-auto mb-2 h-12 w-12 text-green-600" />
            <p class="text-lg font-semibold">No downtime events found!</p>
            <p class="text-sm">This monitor had 100% uptime during the selected period.</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b">
                  <th class="p-3 text-left font-semibold">Start Date/Time</th>
                  <th class="p-3 text-left font-semibold">End Date/Time</th>
                  <th class="p-3 text-right font-semibold">Duration (min)</th>
                  <th class="p-3 text-right font-semibold">Duration (hrs)</th>
                  <th class="p-3 text-center font-semibold">Status</th>
                  <th class="p-3 text-center font-semibold">Alert</th>
                </tr>
              </thead>
              <tbody>
                {#each report.downtimes as downtime, index}
                  <tr class="border-b transition-colors hover:bg-muted/50">
                    <td class="p-3 font-mono text-sm">{downtime.startDateTime}</td>
                    <td class="p-3 font-mono text-sm">{downtime.endDateTime}</td>
                    <td class="p-3 text-right font-semibold">{downtime.durationMinutes}</td>
                    <td class="p-3 text-right font-semibold">{downtime.durationHours}</td>
                    <td class="p-3 text-center">
                      <span
                        class="rounded-full px-3 py-1 text-xs font-semibold {downtime.status ===
                        'DOWN'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}"
                      >
                        {downtime.status}
                      </span>
                    </td>
                    <td class="p-3 text-center">
                      {#if downtime.alertGenerated}
                        <span class="text-green-600">✓</span>
                      {:else}
                        <span class="text-muted-foreground">-</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}
</div>

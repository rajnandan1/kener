<script>
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import moment from "moment";
  import Loader from "lucide-svelte/icons/loader";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import ChevronRight from "lucide-svelte/icons/chevron-right";
  export let data;
  let pageNo = 1;
  let limit = 20;
  let alerts = [];
  let totalPages = 0;
  let loadingData = false;

  let incidentURL = "";
  if (data.siteData.github && data.siteData.github.owner && data.siteData.github.repo) {
    incidentURL = `https://github.com/${data.siteData.github.owner}/${data.siteData.github.repo}/issues`;
  }

  async function loadData() {
    loadingData = true;
    try {
      let apiResp = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "getAllAlertsPaginated",
          data: { page: pageNo, limit }
        })
      });
      let resp = await apiResp.json();
      alerts = resp.alerts;
      totalPages = Math.ceil(resp.total.count / limit);
    } catch (error) {
      alert("Error: " + error);
    } finally {
      loadingData = false;
    }
  }

  onMount(async () => {
    await loadData();
  });
</script>

<div class="mt-4">
  <div class="mb-4 flex justify-between">
    <div>
      {#if loadingData}
        <Loader class="mt-6 h-4 w-4 animate-spin" />
      {/if}
    </div>
    <!-- Pagination -->
    {#if totalPages > 1}
      <nav class="flex max-w-2xl items-center gap-x-1" aria-label="Pagination">
        <button
          disabled={pageNo === 1}
          type="button"
          class="inline-flex min-h-[38px] min-w-[38px] items-center justify-center gap-x-2 rounded-lg border border-transparent px-2.5 py-2 text-sm text-gray-800 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-transparent dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
          aria-label="Previous"
          on:click={() => {
            pageNo--;
            loadData();
          }}
        >
          <ChevronLeft class="size-3.5 shrink-0" />
          <span class="sr-only">Previous</span>
        </button>
        <div class="flex max-w-[380px] items-center gap-x-1 overflow-x-auto">
          {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
            <button
              on:click={() => {
                pageNo = page;
                loadData();
              }}
              type="button"
              class="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border {page == pageNo
                ? 'border-gray-200'
                : 'border-transparent'}  px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-transparent dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
            >
              {page}
            </button>
          {/each}
        </div>
        <button
          type="button"
          disabled={pageNo === totalPages}
          class="inline-flex min-h-[38px] min-w-[38px] items-center justify-center gap-x-2 rounded-lg border border-transparent px-2.5 py-2 text-sm text-gray-800 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-transparent dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
          aria-label="Next"
          on:click={() => {
            pageNo++;
            loadData();
          }}
        >
          <span class="sr-only">Next</span>
          <ChevronRight class="size-3.5 shrink-0" />
        </button>
      </nav>
    {/if}
    <!-- End Pagination -->
  </div>
  <div class="flex flex-col">
    <div class="-m-1.5 overflow-x-auto">
      <div class="inline-block min-w-full p-1.5 align-middle">
        <div class="overflow-hidden rounded-lg border dark:border-neutral-700">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
            <thead>
              <tr>
                <th
                  scope="col"
                  class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500">ID</th
                >
                <th
                  scope="col"
                  class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
                  >Type</th
                >
                <th
                  scope="col"
                  class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
                  >Monitor</th
                >
                <th
                  scope="col"
                  class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
                  >Status</th
                >
                <th
                  scope="col"
                  class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
                  >Checks</th
                >
                <th
                  scope="col"
                  class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
                  >Incident</th
                >
                <th
                  scope="col"
                  class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
                  >Created At</th
                >
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-neutral-700">
              {#each alerts as alert}
                <tr>
                  <td class="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    {alert.id}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-xs font-semibold">
                    {#if alert.monitor_status === "DOWN"}
                      <span class="text-red-500">
                        {alert.monitor_status}
                      </span>
                    {:else}
                      <span class="text-yellow-500">
                        {alert.monitor_status}
                      </span>
                    {/if}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-sm">
                    {alert.monitor_tag}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-xs font-semibold">
                    {#if alert.alert_status === "RESOLVED"}
                      <span class="text-blue-500">
                        {alert.alert_status}
                      </span>
                    {:else}
                      <span class="text-fuchsia-500">
                        {alert.alert_status}
                      </span>
                    {/if}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-sm">
                    {alert.health_checks}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-xs font-semibold">
                    {#if !!alert.incident_number}
                      <a
                        rel="external"
                        href="{base}/manage/app/events#{alert.incident_number}"
                        class="text-cyan-500 hover:underline focus:outline-none"
                      >
                        {alert.incident_number}
                      </a>
                    {:else}
                      -
                    {/if}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-sm">
                    {moment.utc(alert.created_at, "YYYY-MM-DD HH:mm:ss").local().format("YYYY-MM-DD HH:mm:ss")}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

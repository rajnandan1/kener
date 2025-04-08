<script>
  import { Button } from "$lib/components/ui/button";
  import Plus from "lucide-svelte/icons/plus";
  import X from "lucide-svelte/icons/x";
  import Settings from "lucide-svelte/icons/settings";
  import Bell from "lucide-svelte/icons/bell";
  import Loader from "lucide-svelte/icons/loader";
  import ArrowDownUp from "lucide-svelte/icons/arrow-down-up";
  import Grip from "lucide-svelte/icons/grip";
  import ExternalLink from "lucide-svelte/icons/external-link";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { base } from "$app/paths";
  import MonitorsSheet from "$lib/components/manage/monitorSheet.svelte";
  import { onMount } from "svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Select from "$lib/components/ui/select";
  import { storeSiteData, SortMonitor, RandomString } from "$lib/clientTools.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { dndzone } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import GMI from "$lib/components/gmi.svelte";
  import { page } from "$app/stores";
  import { DefaultAPIEval, DefaultTCPEval, DefaultPingEval } from "$lib/anywhere.js";

  export let categories = [];
  export let colorDown = "#777";
  export let colorDegraded = "#777";
  export let monitorSort = [];
  let monitors = [];
  let status = "ACTIVE";
  let showAddMonitor = false;
  let formState = "idle";
  let loadingData = false;
  let triggers = [];
  let selectedCategory = "All Categories";

  //listen for hash change

  $: {
    //broadcast a custom event named blockScroll
    if (!!isMounted) {
      const noScrollEvent = new CustomEvent("noScroll", {
        detail: showAddMonitor || draggableMenu || shareMenusToggle
      });
      window.dispatchEvent(noScrollEvent);

      //if modal closed then clear url hashed
      if (!showAddMonitor) {
        window.location.hash = "";
      }
    }
  }

  function showAddMonitorSheet() {
    resetNewMonitor();
    showAddMonitor = true;
  }
  let newMonitor;
  function resetNewMonitor() {
    newMonitor = {
      id: 0,
      tag: "",
      name: "",
      description: "",
      image: "",
      cron: "* * * * *",
      default_status: "NONE",
      status: "ACTIVE",
      category_name: "Home",
      monitor_type: "NONE",
      type_data: "",
      day_degraded_minimum_count: 1,
      day_down_minimum_count: 1,
      include_degraded_in_downtime: "NO",
      apiConfig: {
        url: "",
        method: "GET",
        headers: [],
        body: "",
        timeout: 10000,
        eval: DefaultAPIEval,
        hideURLForGet: "NO",
        allowSelfSignedCert: false
      },
      tcpConfig: {
        hosts: [], //{timeout: 1000, host: "", type:""}
        tcpEval: DefaultTCPEval
      },
      pingConfig: {
        hosts: [], //{timeout: 1000, host: "", count: "", type:""}
        pingEval: DefaultPingEval
      },
      dnsConfig: {
        host: "",
        lookupRecord: "",
        nameServer: "8.8.8.8",
        matchType: "ANY",
        values: []
      },
      groupConfig: createGroupConfig({
        monitors: [],
        timeout: 10000,
        hideMonitors: false
      }),
      sslConfig: {
        host: "",
        port: 443,
        degradedRemainingHours: 1,
        downRemainingHours: 0
      },
      sqlConfig: {
        connectionString: "",
        query: "SELECT 1",
        timeout: 5000,
        dbType: "pg" //mysql2
      },
      heartbeatConfig: {
        degradedRemainingMinutes: 1,
        downRemainingMinutes: 2,
        secretString: RandomString(32)
      }
    };
  }

  function createGroupConfig(groupConfig) {
    let eligibleMonitors = monitors
      .filter((m) => m.monitor_type != "GROUP" && m.status == "ACTIVE")
      .map((m) => {
        let isSelected = false;
        if (groupConfig.monitors) {
          isSelected = !!groupConfig.monitors.find((tm) => tm.id == m.id);
        }

        return { id: m.id, name: m.name, tag: m.tag, selected: isSelected };
      });
    return { monitors: eligibleMonitors, timeout: groupConfig.timeout, hideMonitors: groupConfig.hideMonitors };
  }

  function showUpdateMonitorSheet(m) {
    resetNewMonitor();
    newMonitor = { ...newMonitor, ...m };

    if (newMonitor.monitor_type == "API") {
      newMonitor.apiConfig = JSON.parse(newMonitor.type_data);
    } else if (newMonitor.monitor_type == "PING") {
      newMonitor.pingConfig = JSON.parse(newMonitor.type_data);
    } else if (newMonitor.monitor_type == "DNS") {
      newMonitor.dnsConfig = JSON.parse(newMonitor.type_data);
    } else if (newMonitor.monitor_type == "TCP") {
      newMonitor.tcpConfig = JSON.parse(newMonitor.type_data);
    } else if (newMonitor.monitor_type == "GROUP") {
      newMonitor.groupConfig = createGroupConfig(JSON.parse(newMonitor.type_data));
    } else if (newMonitor.monitor_type == "SSL") {
      newMonitor.sslConfig = JSON.parse(newMonitor.type_data);
    } else if (newMonitor.monitor_type == "SQL") {
      newMonitor.sqlConfig = JSON.parse(newMonitor.type_data);
    } else if (newMonitor.monitor_type == "HEARTBEAT") {
      newMonitor.heartbeatConfig = JSON.parse(newMonitor.type_data);
    }
    showAddMonitor = true;
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
          action: "getMonitors",
          data: { status: status, category_name: selectedCategory }
        })
      });
      let resp = await apiResp.json();
      resp = resp.map((m) => {
        m.down_trigger = JSON.parse(m.down_trigger);
        m.degraded_trigger = JSON.parse(m.degraded_trigger);
        return m;
      });

      monitors = SortMonitor(monitorSort, resp);
    } catch (error) {
      alert("Err2or: " + error);
    } finally {
      loadingData = false;
    }
  }

  async function loadTriggersData() {
    try {
      let apiResp = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "getTriggers",
          data: {
            status: "ACTIVE"
          }
        })
      });
      triggers = await apiResp.json();
    } catch (error) {
      alert("Error: " + error);
    }
  }

  //find by tag and showUpdateMonitorSheet
  function findMonitorByTagAndOpenModal(tag) {
    let monitor = monitors.find((m) => m.tag == tag);
    if (monitor) {
      showUpdateMonitorSheet(monitor);
    }
  }

  let isMounted = false;
  onMount(async () => {
    await loadData();
    await loadTriggersData();
    isMounted = true;
    //check if there is a hash
    if (window.location.hash) {
      let tag = window.location.hash.replace("#", "");
      findMonitorByTagAndOpenModal(tag);
    }
    window.onhashchange = function () {
      let tag = window.location.hash.replace("#", "");
      findMonitorByTagAndOpenModal(tag);
    };
  });
  let shareMenusToggle = false;

  function initMonitorTriggers() {
    monitorTriggers = {
      down_trigger: {
        failureThreshold: 1,
        trigger_type: "DOWN",
        successThreshold: 1,
        description: "The monitor is down",
        createIncident: "NO",
        active: false,
        triggers: [],
        severity: "critical"
      },
      degraded_trigger: {
        failureThreshold: 1,
        trigger_type: "DEGRADED",
        successThreshold: 1,
        active: false,
        description: "The monitor is degraded",
        createIncident: "NO",
        triggers: [],
        severity: "warning"
      }
    };
  }

  let monitorTriggers;
  initMonitorTriggers();

  let saveTriggerError = "";
  async function saveTriggers() {
    saveTriggerError = "";
    let data = {
      id: currentAlertMonitor.id,
      down_trigger: JSON.stringify(monitorTriggers.down_trigger),
      degraded_trigger: JSON.stringify(monitorTriggers.degraded_trigger)
    };
    formState = "loading";
    //updateMonitorTriggers
    try {
      let apiResp = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "updateMonitorTriggers", data })
      });

      let resp = await apiResp.json();
      if (resp.error) {
        saveTriggerError = resp.error;
      } else {
        shareMenusToggle = false;
        loadData();
      }
    } catch (error) {
      saveTriggerError = "Error while saving triggers";
    } finally {
      formState = "idle";
    }
  }
  let currentAlertMonitor;
  function openAlertMenu(m) {
    initMonitorTriggers();
    currentAlertMonitor = m;
    if (m.down_trigger) {
      monitorTriggers.down_trigger = m.down_trigger;
    }
    if (m.degraded_trigger) {
      monitorTriggers.degraded_trigger = m.degraded_trigger;
    }
    shareMenusToggle = true;
  }
  const flipDurationMs = 200;

  let orderErrorMessage = "";
  function handleSort(e) {
    dropTargetStyle = {
      border: "1px solid transparent"
    };
    monitors = e.detail.items;
    monitorSort = monitors.map((m) => m.id);

    storeSiteData({
      monitorSort: JSON.stringify(monitorSort)
    })
      .then(async (resp) => {
        let data = await resp.json();
        if (data.error) {
          orderErrorMessage = data.error;
        }
      })
      .catch((error) => {
        orderErrorMessage = "Error while saving order";
      });
  }
  let dropTargetStyle;
  let draggableMenu = false;

  function testMonitor(i) {
    if (monitors[i].isTestRunning) {
      return;
    }
    monitors[i].isTestRunning = true;
    fetch(base + "/manage/app/api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "testMonitor",
        data: { monitor_id: monitors[i].id }
      })
    })
      .then((resp) => resp.json())
      .then((data) => {
        monitors[i].isTestRunning = false;
        monitors[i].testResult = data;
      })
      .catch((error) => {
        monitors[i].isTestRunning = false;
        monitors[i].testResult = data;
      });
  }
</script>

{#if showAddMonitor}
  <MonitorsSheet
    {categories}
    {newMonitor}
    on:closeModal={(e) => {
      showAddMonitor = false;
      loadData();
    }}
  />
{/if}
{#if draggableMenu}
  <div class="moldal-container fixed left-0 top-0 z-50 h-screen w-full bg-card bg-opacity-30 backdrop-blur-sm">
    <div
      class="absolute left-1/2 top-1/2 h-fit w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background shadow-lg backdrop-blur-lg"
    >
      <Button
        variant="ghost"
        on:click={() => {
          draggableMenu = false;
        }}
        class="absolute right-2 top-2 z-40 h-6 w-6   rounded-full border bg-background p-1"
      >
        <X class="h-4 w-4   text-muted-foreground" />
      </Button>
      <div class="content px-4 py-4">
        <h2 class="text-lg font-semibold">Rearrange Monitors</h2>
        <div
          class="mt-4"
          use:dndzone={{ items: monitors, flipDurationMs, dropTargetStyle }}
          on:consider={handleSort}
          on:finalize={handleSort}
        >
          {#each monitors as monitor (monitor.id)}
            <div animate:flip={{ duration: flipDurationMs }} class="mb-2 rounded-md bg-card p-2">
              <Grip class="mr-2 inline h-4 w-4" />
              {#if !!monitor.image}
                <GMI src={monitor.image} alt={monitor.name} classList="mr-1 inline-block h-4 w-4" />
              {/if}
              {monitor.name}
            </div>
          {/each}
        </div>
        {#if !!orderErrorMessage}
          <p class="py-2 text-sm font-medium text-destructive">{orderErrorMessage}</p>
        {/if}
      </div>
    </div>
  </div>
{/if}
<div class="mt-4 flex justify-between">
  <div class="flex w-1/3 gap-x-2">
    <Select.Root
      portal={null}
      onSelectedChange={(e) => {
        status = e.value;
        loadData();
      }}
      selected={{
        value: status,
        label: status
      }}
    >
      <Select.Trigger id="statusmonitor">
        <Select.Value bind:value={status} placeholder="Status" />
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          <Select.Label>Status</Select.Label>
          <Select.Item value="ACTIVE" label="ACTIVE" class="text-sm font-medium">ACTIVE</Select.Item>
          <Select.Item value="INACTIVE" label="INACTIVE" class="text-sm font-medium">INACTIVE</Select.Item>
        </Select.Group>
      </Select.Content>
    </Select.Root>

    <Select.Root
      portal={null}
      onSelectedChange={(e) => {
        selectedCategory = e.value;
        loadData();
      }}
      selected={{
        value: selectedCategory,
        label: selectedCategory
      }}
    >
      <Select.Trigger id="catemonitor">
        <Select.Value bind:value={selectedCategory} placeholder="Category" />
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          <Select.Label>Category</Select.Label>
          <Select.Item value="All Categories" label="All Categories" class="text-sm font-medium">
            All Categories
          </Select.Item>
          {#each categories as category}
            <Select.Item value={category.name} label={category.name} class="text-sm font-medium">
              {category.name}
            </Select.Item>
          {/each}
        </Select.Group>
      </Select.Content>
    </Select.Root>
    <div>
      {#if loadingData}
        <Loader class="ml-2 mt-2 inline h-6 w-6 animate-spin" />
      {/if}
    </div>
  </div>
  {#if $page.data.user.role != "member"}
    <div>
      {#if status == "ACTIVE"}
        <Button size="icon" variant="secondary" on:click={() => (draggableMenu = !draggableMenu)}>
          <ArrowDownUp class=" " />
        </Button>
      {/if}
      <Button on:click={showAddMonitorSheet}>
        <Plus class="mr-2 inline h-6 w-6" />
        Add Monitor
      </Button>
    </div>
  {/if}
</div>

<div class="mt-4">
  {#each monitors as monitor, i}
    <Card.Root class="mb-4">
      <Card.Header class="relative">
        <Card.Title>
          {#if !!monitor.image}
            <GMI src={monitor.image} alt={monitor.name} classList="mr-2 inline-block h-8 w-8" />
          {/if}
          {monitor.name}
        </Card.Title>
        {#if !!monitor.description}
          <Card.Description>{@html monitor.description}</Card.Description>
        {/if}
        <div class="absolute right-2 top-0.5 flex gap-x-1">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="secondary" class="h-8 p-2 text-xs" on:click={() => testMonitor(i)}>Test Monitor</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="max-w-md">
              <DropdownMenu.Group>
                <DropdownMenu.Label class="text-xs">Test Result</DropdownMenu.Label>
                <DropdownMenu.Separator />
                <div class="px-2 text-xs">
                  {#if monitor.isTestRunning}
                    <div class="text-center">
                      <Loader class="mx-auto inline h-4 w-4 animate-spin" />
                    </div>
                  {:else if !!monitor.testResult}
                    {#if !!monitor.testResult.error}
                      <div class="text-red-500">
                        {monitor.testResult.error}
                      </div>
                    {:else if monitor.testResult.status != undefined && monitor.testResult.latency != undefined}
                      <p class="text-muted-foreground">
                        Status: <span class="text-api-{monitor.testResult.status.toLowerCase()}"
                          >{monitor.testResult.status}</span
                        ><br /> Response Time: <span class="text-card-foreground">{monitor.testResult.latency}ms</span>
                      </p>
                    {:else}
                      <div class="text-muted-foreground">No Test Result</div>
                    {/if}
                  {/if}
                </div>
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          {#if $page.data.user.role != "member"}
            <Button
              variant="secondary"
              class="h-8 w-8 p-2 {monitor.down_trigger?.active || monitor.degraded_trigger?.active
                ? 'text-yellow-500'
                : ''}"
              on:click={() => openAlertMenu(monitor)}
            >
              <Bell class="inline h-4 w-4" />
            </Button>
          {/if}
          <Button variant="secondary" class="h-8 w-8 p-2" rel="external" href="{base}/?monitor={monitor.tag}">
            <ExternalLink class="inline h-4 w-4" />
          </Button>
          {#if $page.data.user.role != "member"}
            <Button variant="secondary" class="h-8 w-8 p-2" href="#{monitor.tag}">
              <Settings class="inline h-4 w-4" />
            </Button>
          {/if}
        </div>
      </Card.Header>
      <Card.Content>
        <div class="flex justify-between gap-4">
          <div class="">
            <Label class="text-xs font-semibold text-muted-foreground">Tag</Label>
            <p class="text-sm font-semibold">
              {monitor.tag}
            </p>
          </div>
          <div class="">
            <Label class="text-xs font-semibold text-muted-foreground">Monitor Type</Label>
            <p class="text-sm font-semibold">
              {monitor.monitor_type}
            </p>
          </div>
          <div class="">
            <Label class="text-xs font-semibold text-muted-foreground">Cron</Label>
            <p class="text-sm font-semibold">
              {monitor.cron}
            </p>
          </div>
          <div class="">
            <Label class="text-xs font-semibold text-muted-foreground">Category</Label>
            <p class="text-sm font-semibold">
              {!!monitor.category_name ? monitor.category_name : "-"}
            </p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/each}
</div>

{#if shareMenusToggle}
  <div class="moldal-container fixed left-0 top-0 z-50 h-screen w-full bg-card bg-opacity-30 backdrop-blur-sm">
    <div
      class="absolute left-1/2 top-1/2 h-fit w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background shadow-lg backdrop-blur-lg"
    >
      <Button
        variant="ghost"
        on:click={() => {
          shareMenusToggle = false;
        }}
        class="absolute right-2 top-2 z-40 h-6 w-6   rounded-full border bg-background p-1"
      >
        <X class="h-4 w-4   text-muted-foreground" />
      </Button>
      <div class="content px-4 py-4">
        <h2 class="text-lg font-semibold">
          Add Alert Triggers for {currentAlertMonitor.name}
        </h2>
        <p class="text-xs text-muted-foreground">
          Alert triggers are used to notify you when your monitor is down or degraded.
        </p>
        <hr class="my-4" />
        {#each Object.entries(monitorTriggers) as [key, data]}
          <div class="flex justify-between">
            <h3 class="font-semibold" style="color:{data.trigger_type == 'DOWN' ? colorDown : colorDegraded};">
              If Monitor {data.trigger_type}
            </h3>
            <div>
              <label class="inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  value=""
                  class="peer sr-only"
                  checked={data.active}
                  on:change={() => {
                    data.active = !data.active;
                  }}
                />
                <div
                  class="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800 rtl:peer-checked:after:-translate-x-full"
                ></div>
              </label>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-2">
            <div class="col-span-1">
              <Label for="{key}failureThreshold">
                Failure Threshold
                <span class="text-red-500">*</span>
              </Label>
              <Input bind:value={data.failureThreshold} min="1" id="{key}failureThreshold" type="number" />
            </div>
            <div class="col-span-1">
              <div class="col-span-1">
                <Label for="{key}successThreshold">
                  Success Threshold
                  <span class="text-red-500">*</span>
                </Label>
                <Input bind:value={data.successThreshold} min="1" id="{key}successThreshold" type="number" />
              </div>
            </div>
            <div class="col-span-1">
              <Label for="{key}createIncident">Create Incident</Label>
              <Select.Root
                portal={null}
                onSelectedChange={(e) => (data.createIncident = e.value)}
                selected={{
                  value: data.createIncident,
                  label: data.createIncident
                }}
              >
                <Select.Trigger id="{key}createIncident">
                  <Select.Value bind:value={data.createIncident} placeholder={data.createIncident} />
                </Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    <Select.Item value="YES" label="YES" class="text-sm font-medium">YES</Select.Item>
                    <Select.Item value="NO" label="NO" class="text-sm font-medium">NO</Select.Item>
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </div>
            <div class="col-span-1">
              <Label for="{key}createInseveritycident">
                Severity
                <span class="text-red-500">*</span>
              </Label>
              <Select.Root
                portal={null}
                onSelectedChange={(e) => (data.severity = e.value)}
                selected={{
                  value: data.severity,
                  label: data.severity.toUpperCase()
                }}
              >
                <Select.Trigger id="{key}severity">
                  <Select.Value bind:value={data.severity} placeholder={data.severity} />
                </Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    <Select.Item value="critical" label="CRITICAL" class="text-sm font-medium">CRITICAL</Select.Item>
                    <Select.Item value="warning" label="WARNING" class="text-sm font-medium">WARNING</Select.Item>
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </div>
            <div class="col-span-4">
              <Label for="{key}description">
                Add Custom Alert Message
                <span class="text-red-500">*</span>
              </Label>
              <Input id="{key}description" bind:value={data.description} type="text" />
            </div>
            <p class="col-span-4 mt-2 text-sm font-medium">Choose Triggers</p>
            {#each triggers as trigger}
              <div class="col-span-1 overflow-hidden overflow-ellipsis whitespace-nowrap">
                <label class="cursor-pointer" class:line-through={trigger.trigger_status != "ACTIVE"}>
                  <input
                    type="checkbox"
                    class="text-sm"
                    checked={data.triggers.indexOf(trigger.id) > -1}
                    on:change={() => {
                      data.triggers = data.triggers.includes(trigger.id)
                        ? data.triggers.filter((t) => t != trigger.id)
                        : [...data.triggers, trigger.id];
                    }}
                  />
                  {#if trigger.trigger_type == "webhook"}
                    <img src={base + "/webhooks.svg"} alt={trigger.trigger_type} class="ml-2 inline-block h-4 w-4" />
                  {:else if trigger.trigger_type == "email"}
                    <img src={base + "/email.png"} alt={trigger.trigger_type} class="ml-2 inline-block h-4 w-4" />
                  {:else if trigger.trigger_type == "slack"}
                    <img src={base + "/slack.svg"} alt={trigger.trigger_type} class="ml-2 inline-block h-4 w-4" />
                  {:else if trigger.trigger_type == "discord"}
                    <img src={base + "/discord.svg"} alt={trigger.trigger_type} class="ml-2 inline-block h-4 w-4" />
                  {/if}
                  {trigger.name}
                </label>
              </div>
            {/each}
          </div>
          <hr class="my-4" />
        {/each}

        <div class="flex justify-end gap-x-2">
          {#if !!saveTriggerError}
            <div class="py-2 text-sm font-medium text-destructive">{saveTriggerError}</div>
          {/if}
          <Button class="" on:click={saveTriggers} disabled={formState === "loading"}>
            Save Alerts
            {#if formState === "loading"}
              <Loader class="ml-2 inline h-4 w-4 animate-spin" />
            {/if}
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<script>
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { clickOutsideAction, slide } from "svelte-legos";
  import Plus from "lucide-svelte/icons/plus";
  import X from "lucide-svelte/icons/x";
  import Loader from "lucide-svelte/icons/loader";
  import Clipboard from "lucide-svelte/icons/clipboard";
  import Check from "lucide-svelte/icons/check";
  import ChevronRight from "lucide-svelte/icons/chevron-right";
  import Trash from "lucide-svelte/icons/trash";
  import { base } from "$app/paths";
  import * as Select from "$lib/components/ui/select";
  import { createEventDispatcher } from "svelte";
  import GMI from "$lib/components/gmi.svelte";
  import { page } from "$app/stores";
  import CodeMirror from "svelte-codemirror-editor";
  import { javascript } from "@codemirror/lang-javascript";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
  import { mode } from "mode-watcher";
  import {
    allRecordTypes,
    ValidateIpAddress,
    ValidateCronExpression,
    IsValidHost,
    IsValidNameServer
  } from "$lib/clientTools.js";

  const dispatch = createEventDispatcher();

  const defaultEval = `(async function (statusCode, responseTime, responseData) {
	let statusCodeShort = Math.floor(statusCode/100);
    if(statusCode == 429 || (statusCodeShort >=2 && statusCodeShort <= 3)) {
        return {
			status: 'UP',
			latency: responseTime,
        }
    } 
	return {
		status: 'DOWN',
		latency: responseTime,
	}
})`;
  export let categories = [];
  let formState = "idle";

  export let newMonitor;

  if (!!newMonitor && newMonitor.monitor_type == "PING" && !!!newMonitor.pingConfig.hosts) {
    newMonitor.pingConfig.hosts = [];
  }
  let loadingLogo = false;

  let selectedCategory = categories.find((category) => category.name === newMonitor.category_name);

  async function handleFileChangeLogo(event) {
    const file = event.target.files[0];
    if (!file) {
      event.target.value = "";
      alert("Please select a file to upload.");
      return;
    }
    if (file.size > 102400) {
      event.target.value = "";
      alert("File size should be less than 100KB");
      return;
    }

    loadingLogo = true;
    const formData = new FormData();
    formData.append("image", file);
    try {
      const response = await fetch(base + "/manage/app/upload", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        newMonitor.image = "/uploads/" + result.filename;
      } else {
        alert("Failed to upload file.");
      }
    } catch (error) {
      alert("An error occurred while uploading the file.");
    } finally {
      loadingLogo = false;
    }
  }
  function addHeader() {
    newMonitor.apiConfig.headers = [...newMonitor.apiConfig.headers, { key: "", value: "" }];
  }

  let invalidFormMessage = "";

  function copyToClipboard(t) {
    navigator.clipboard.writeText(t);
  }

  async function isValidEval(ev) {
    if (ev.endsWith(";")) {
      invalidFormMessage = "Eval should not end with semicolon";
      return false;
    }
    //has to start with ( and end with )
    if (!ev.startsWith("(") || !ev.endsWith(")")) {
      invalidFormMessage = "Eval should start with ( and end with ). It is an anonymous function";
      return false;
    }
    try {
      new Function(ev);

      return true; // The code is valid
    } catch (error) {
      invalidFormMessage = error.message + " in eval.";
      return false;
    }
  }
  const IsValidURL = function (url) {
    return /^(http|https):\/\/[^ "]+$/.test(url);
  };

  async function saveOrUpdateMonitor() {
    invalidFormMessage = "";
    //tag should alphanumeric hyphen underscore only
    const tagRegex = /^[a-zA-Z0-9_-]+$/;
    if (!tagRegex.test(newMonitor.tag)) {
      invalidFormMessage = "Tag should be alphanumeric, hyphen, underscore only";
      return;
    }
    //name should be present
    if (!newMonitor.name) {
      invalidFormMessage = "Name is required";
      return;
    }
    //day_degraded_minimum_count should be positive number
    if (newMonitor.day_degraded_minimum_count < 1) {
      invalidFormMessage = "Day Degraded Minimum Count should be greater than 0";
      return;
    }
    //day_down_minimum_count should be positive number
    if (newMonitor.day_down_minimum_count < 1) {
      invalidFormMessage = "Day Down Minimum Count should be greater than 0";
      return;
    }

    //validating cron
    const cron = newMonitor.cron;
    let cronValidation = ValidateCronExpression(cron);
    if (cronValidation.isValid === false) {
      invalidFormMessage = "Cron invalid: " + cronValidation.message;
      return;
    }
    //if monitor type is API
    if (newMonitor.monitor_type === "API") {
      //validating url
      if (!newMonitor.apiConfig.url) {
        invalidFormMessage = "URL is required";
        return;
      }
      if (!IsValidURL(newMonitor.apiConfig.url)) {
        invalidFormMessage = "Invalid URL";
        return;
      }

      //timeout should be positive number
      if (newMonitor.apiConfig.timeout < 1) {
        invalidFormMessage = "Timeout should be greater than 0";
        return;
      }

      //validating eval
      if (!!newMonitor.apiConfig.eval) {
        newMonitor.apiConfig.eval = newMonitor.apiConfig.eval.trim();

        if (!(await isValidEval(newMonitor.apiConfig.eval))) {
          invalidFormMessage = invalidFormMessage + ". Invalid eval";
          return;
        }
      }
      newMonitor.type_data = JSON.stringify(newMonitor.apiConfig);
    } else if (newMonitor.monitor_type === "PING") {
      let hosts = newMonitor.pingConfig.hosts;
      if (hosts && Array.isArray(hosts) && hosts.length > 0) {
        for (let i = 0; i < hosts.length; i++) {
          if (ValidateIpAddress(hosts[i].host) != hosts[i].type) {
            invalidFormMessage = `Host ${hosts[i].host} is not of type ${hosts[i].type}`;
            return;
          }
          //validating timeout for ping
          if (!!hosts[i].timeout && isNaN(hosts[i].timeout)) {
            invalidFormMessage = "Timeout should be a number";
            return;
          }
          hosts[i].timeout = Number(hosts[i].timeout);
          //validating timeout
          if (hosts[i].timeout < 1) {
            invalidFormMessage = "Timeout should be greater than 0";
            return;
          }
          //validating count
          if (hosts[i].count < 1) {
            invalidFormMessage = "Count should be greater than 0";
            return;
          }
        }
      } else {
        invalidFormMessage = "Host is required";
        return;
      }
      if (!!newMonitor.pingConfig.pingEval) {
        newMonitor.pingConfig.pingEval = newMonitor.pingConfig.pingEval.trim();
        if (!(await isValidEval(newMonitor.pingConfig.pingEval))) {
          invalidFormMessage = invalidFormMessage + ". Invalid eval";
          return;
        }
      }

      newMonitor.type_data = JSON.stringify(newMonitor.pingConfig);
    } else if (newMonitor.monitor_type === "TCP") {
      //validating hostsV4

      let hosts = newMonitor.tcpConfig.hosts;
      if (hosts && Array.isArray(hosts) && hosts.length > 0) {
        for (let i = 0; i < hosts.length; i++) {
          if (ValidateIpAddress(hosts[i].host) != hosts[i].type) {
            invalidFormMessage = `Host ${hosts[i].host} is not of type ${hosts[i].type}`;
            return;
          }
          //validating timeout for tcp
          if (!!hosts[i].timeout && isNaN(hosts[i].timeout)) {
            invalidFormMessage = "Timeout should be a number";
            return;
          }
          hosts[i].timeout = Number(hosts[i].timeout);
          //validating timeout
          if (hosts[i].timeout < 1) {
            invalidFormMessage = "Timeout should be greater than 0";
            return;
          }
          //validating port
          if (hosts[i].port < 1 || hosts[i].port > 65535) {
            invalidFormMessage = "Port should be valid";
            return;
          }
        }
      } else {
        invalidFormMessage = "Host is required";
        return;
      }
      if (!!newMonitor.tcpConfig.tcpEval) {
        newMonitor.tcpConfig.tcpEval = newMonitor.tcpConfig.tcpEval.trim();
        if (!(await isValidEval(newMonitor.tcpConfig.tcpEval))) {
          invalidFormMessage = invalidFormMessage + ". Invalid eval";
          return;
        }
      }

      newMonitor.type_data = JSON.stringify(newMonitor.tcpConfig);
    } else if (newMonitor.monitor_type === "DNS") {
      //validating host
      if (!newMonitor.dnsConfig.host) {
        invalidFormMessage = "Host is required";
        return;
      }
      if (!IsValidHost(newMonitor.dnsConfig.host)) {
        invalidFormMessage = "Invalid Host";
        return;
      }
      //validating nameServer
      if (!newMonitor.dnsConfig.nameServer) {
        invalidFormMessage = "Name Server is required";
        return;
      }
      if (!IsValidNameServer(newMonitor.dnsConfig.nameServer)) {
        invalidFormMessage = "Invalid Name Server";
        return;
      }
      //at least one value should be present
      if (
        !newMonitor.dnsConfig.values ||
        !Array.isArray(newMonitor.dnsConfig.values) ||
        newMonitor.dnsConfig.values.length === 0
      ) {
        invalidFormMessage = "At least one value is required";
        return;
      }
      newMonitor.type_data = JSON.stringify(newMonitor.dnsConfig);
    } else if (newMonitor.monitor_type === "GROUP") {
      let selectedOnly = newMonitor.groupConfig.monitors.filter((monitor) => monitor.selected);
      if (selectedOnly.length < 2) {
        invalidFormMessage = "Select at least 2 monitors";
        return;
      }
      //timeout >=1000
      if (newMonitor.groupConfig.timeout < 1000) {
        invalidFormMessage = "Timeout should be greater than or equal to 1000";
        return;
      }
      newMonitor.type_data = JSON.stringify({
        monitors: selectedOnly,
        timeout: parseInt(newMonitor.groupConfig.timeout),
        hideMonitors: newMonitor.groupConfig.hideMonitors
      });
    } else if (newMonitor.monitor_type === "SSL") {
      //validating host
      if (!newMonitor.sslConfig.host) {
        invalidFormMessage = "Host is required";
        return;
      }
      if (!IsValidHost(newMonitor.sslConfig.host)) {
        invalidFormMessage = "Invalid Host";
        return;
      }
      //validating port
      if (
        !!!newMonitor.sslConfig.port ||
        isNaN(newMonitor.sslConfig.port) ||
        newMonitor.sslConfig.port < 1 ||
        newMonitor.sslConfig.port > 65535
      ) {
        invalidFormMessage = "Port should be valid";
        return;
      }
      //check if degradedRemainingHours > 0
      if (
        !!!newMonitor.sslConfig.degradedRemainingHours ||
        isNaN(newMonitor.sslConfig.degradedRemainingHours) ||
        newMonitor.sslConfig.degradedRemainingHours < 0
      ) {
        invalidFormMessage = "Degraded Remaining Hours should be greater than 0";
        return;
      }
      //check if downRemainingHours > 0
      if (
        !!!newMonitor.sslConfig.downRemainingHours ||
        isNaN(newMonitor.sslConfig.downRemainingHours) ||
        newMonitor.sslConfig.downRemainingHours < 0
      ) {
        invalidFormMessage = "Down Remaining Hours should be greater than 0";
        return;
      }

      newMonitor.sslConfig.degradedRemainingHours = Number(newMonitor.sslConfig.degradedRemainingHours);
      newMonitor.sslConfig.downRemainingHours = Number(newMonitor.sslConfig.downRemainingHours);

      //check if degradedRemainingHours > downRemainingHours
      if (newMonitor.sslConfig.degradedRemainingHours <= newMonitor.sslConfig.downRemainingHours) {
        invalidFormMessage = "Degraded Remaining Hours should be greater than Down Remaining Hours";
        return;
      }
      newMonitor.type_data = JSON.stringify(newMonitor.sslConfig);
    } else if (newMonitor.monitor_type === "SQL") {
      //connectionString cannot be empty
      if (!!!newMonitor.sqlConfig.connectionString) {
        invalidFormMessage = "Connection String is required";
        return;
      }

      //connection string has to start with postgresql or mysql
      if (
        !newMonitor.sqlConfig.connectionString.startsWith("postgresql://") &&
        !newMonitor.sqlConfig.connectionString.startsWith("mysql://")
      ) {
        invalidFormMessage = "Connection string should start with postgresql:// or mysql2://";
        return;
      }

      //timeout should be positive number
      if (newMonitor.sqlConfig.timeout < 1) {
        invalidFormMessage = "Timeout should be greater than 0";
        return;
      }

      //query cannot be empty
      if (!!!newMonitor.sqlConfig.query) {
        invalidFormMessage = "SQL Query is required";
        return;
      }

      newMonitor.type_data = JSON.stringify(newMonitor.sqlConfig);
    } else if (newMonitor.monitor_type === "HEARTBEAT") {
      //newMonitor.heartbeatConfig.degradedRemainingMinutes should be a number and greater than equal to 1
      if (
        !!!newMonitor.heartbeatConfig.degradedRemainingMinutes ||
        isNaN(newMonitor.heartbeatConfig.degradedRemainingMinutes) ||
        newMonitor.heartbeatConfig.degradedRemainingMinutes < 1
      ) {
        invalidFormMessage = "Degraded or grace Period should at least be 1 minute";
        return;
      }

      //newMonitor.heartbeatConfig.downRemainingMinutes should be a number and greater than degradedRemainingMinutes
      if (
        !!!newMonitor.heartbeatConfig.downRemainingMinutes ||
        isNaN(newMonitor.heartbeatConfig.downRemainingMinutes) ||
        newMonitor.heartbeatConfig.downRemainingMinutes <= newMonitor.heartbeatConfig.degradedRemainingMinutes
      ) {
        invalidFormMessage = "Down or impacted Period should be greater than Degraded or grace Period";
        return;
      }

      newMonitor.type_data = JSON.stringify(newMonitor.heartbeatConfig);
    }
    formState = "loading";

    try {
      let data = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "storeMonitorData", data: newMonitor })
      });
      let resp = await data.json();
      if (resp.error) {
        invalidFormMessage = resp.error;
      } else {
        dispatch("closeModal", {});
      }
    } catch (error) {
      invalidFormMessage = "Error while saving data";
    } finally {
      formState = "idle";
    }
  }
  let typeOfLogoUpload = newMonitor.image.startsWith("http") ? "URL" : "FILE";

  let databaseTypes = {
    pg: "PostgreSQL",
    mysql2: "MySQL"
  };
  let deleteMonitorConfirmText = "";
  let deletingMonitor = false;

  async function deleteMonitor() {
    if (deleteMonitorConfirmText != `delete ${newMonitor.tag}`) {
      invalidFormMessage = "Please type the correct text to delete the monitor";
      return;
    }
    deletingMonitor = true;
    try {
      let data = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "deleteMonitor", data: { tag: newMonitor.tag } })
      });
      let resp = await data.json();
      if (resp.error) {
        invalidFormMessage = resp.error;
      } else {
        dispatch("closeModal", {});
      }
    } catch (error) {
      invalidFormMessage = "Error while deleting monitor";
    } finally {
      deletingMonitor = false;
    }
  }
</script>

<div class="fixed left-0 top-0 z-50 h-screen w-screen bg-card bg-opacity-20 backdrop-blur-sm">
  <div
    transition:slide={{ direction: "right", duration: 200 }}
    use:clickOutsideAction
    on:clickoutside={(e) => {
      dispatch("closeModal", {});
    }}
    class="absolute right-0 top-0 h-screen w-screen bg-background px-3 shadow-xl md:w-[800px]"
  >
    <Button
      variant="outline"
      size="icon"
      class="absolute right-[785px] top-8  z-10 h-8 w-8 rounded-md"
      on:click={(e) => {
        dispatch("closeModal", {});
      }}
    >
      <ChevronRight class="h-6 w-6 " />
    </Button>
    <div class="absolute top-0 flex h-12 w-full justify-between gap-2 border-b p-3 pr-6">
      {#if newMonitor.id}
        <h2 class="text-lg font-medium">Edit Monitor</h2>
      {:else}
        <h2 class="text-lg font-medium">Add Monitor</h2>
      {/if}
      <div>
        <label class="inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            value=""
            class="peer sr-only"
            checked={newMonitor.status == "ACTIVE"}
            on:change={() => {
              newMonitor.status = newMonitor.status == "ACTIVE" ? "INACTIVE" : "ACTIVE";
            }}
          />
          <div
            class="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800 rtl:peer-checked:after:-translate-x-full"
          ></div>
        </label>
      </div>
    </div>
    <div class="mt-12 w-full overflow-y-auto p-3" style="height: calc(100vh - 7rem);">
      <div class="grid grid-cols-3 gap-x-2 gap-y-4">
        <div class="col-span-3 flex gap-x-2">
          {#if !!newMonitor.image}
            <div class="relative mr-2 mt-3 h-[48px] w-[48px] rounded-sm border p-1">
              <GMI src={newMonitor.image} alt="" />
              <Button
                variant="secondary"
                class="absolute -right-2.5 -top-1.5 h-5 w-5 rounded-full p-0"
                on:click={() => (newMonitor.image = "")}
              >
                <X class="h-4 w-4" />
              </Button>
            </div>
          {/if}
          <div>
            <Label for="typeOfLogoUpload" class="text-sm font-medium">Monitor Logo</Label>
            <Select.Root
              portal={null}
              onSelectedChange={(e) => {
                typeOfLogoUpload = e.value;
              }}
              selected={{
                value: typeOfLogoUpload,
                label: typeOfLogoUpload
              }}
            >
              <Select.Trigger class="w-[200px]" id="typeOfLogoUpload">
                <Select.Value bind:value={typeOfLogoUpload} placeholder="Logo Type" />
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Label>Logo Type</Select.Label>
                  <Select.Item value="URL" label="URL" class="text-sm font-medium">URL</Select.Item>
                  <Select.Item value="FILE" label="FILE" class="text-sm font-medium">FILE</Select.Item>
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>
          {#if typeOfLogoUpload === "URL"}
            <div>
              <Label for="logo">Logo URL</Label>
              <Input
                bind:value={newMonitor.image}
                type="text"
                id="logo"
                placeholder="https://example.com/favicon.ico"
              />
            </div>
          {:else}
            <div>
              <Label for="logo" class="text-sm font-medium">Logo File (&lt; 100 KB)</Label>
              <Input
                class="w-1/2"
                id="logo"
                type="file"
                disabled={loadingLogo}
                accept=".jpg, .jpeg, .png, .svg"
                on:change={(e) => {
                  handleFileChangeLogo(e);
                }}
              />
            </div>
          {/if}
        </div>

        <div class="col-span-1">
          <Label for="tag">
            Tag
            <span class="text-red-500">*</span>
          </Label>
          <Input bind:value={newMonitor.tag} id="tag" placeholder="Add a Tag" />
        </div>
        <div class="col-span-1">
          <Label for="name">Name <span class="text-red-500">*</span></Label>
          <Input bind:value={newMonitor.name} id="name" placeholder="Add a Name" />
        </div>
        <div class="col-span-3">
          <Label for="description">Description</Label>
          <Input bind:value={newMonitor.description} id="description" placeholder="Add a description for the monitor" />
        </div>

        <div class="col-span-1">
          <Label for="cron">Cron <span class="text-red-500">*</span></Label>
          <Input bind:value={newMonitor.cron} id="cron" />
        </div>
        <div class="col-span-1">
          <Label for="default_status">Default Status</Label>
          <Select.Root portal={null} onSelectedChange={(e) => (newMonitor.default_status = e.value)}>
            <Select.Trigger id="default_status">
              <Select.Value placeholder={newMonitor.default_status} />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label>Status</Select.Label>
                <Select.Item value="NONE" label="NONE" class="text-sm font-medium">NONE</Select.Item>
                <Select.Item value="UP" label="UP" class="text-sm font-medium">UP</Select.Item>
                <Select.Item value="DOWN" label="DOWN" class="text-sm font-medium">DOWN</Select.Item>
                <Select.Item value="DEGRADED" label="DEGRADED" class="text-sm font-medium">DEGRADED</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>

        <div class="col-span-1">
          <Label for="category_name">Category Name</Label>
          <Select.Root
            portal={null}
            bind:value={selectedCategory}
            onSelectedChange={(e) => (newMonitor.category_name = e.value)}
          >
            <Select.Trigger id="category_name">
              <Select.Value placeholder={newMonitor.category_name} />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label>Category</Select.Label>

                {#each categories as category}
                  <Select.Item value={category.name} label={category.name} class="text-sm font-medium">
                    {category.name}
                  </Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>

        <div class="col-span-1">
          <Label for="day_degraded_minimum_count">
            Day Degraded Minimum Count <span class="text-red-500">*</span>
          </Label>
          <Input bind:value={newMonitor.day_degraded_minimum_count} id="day_degraded_minimum_count" />
        </div>
        <div class="col-span-1">
          <Label for="day_down_minimum_count">
            Day Down Minimum Count <span class="text-red-500">*</span>
          </Label>
          <Input bind:value={newMonitor.day_down_minimum_count} id="day_down_minimum_count" />
        </div>
        <div class="col-span-1">
          <Label for="include_degraded_in_downtime">Include Degraded In Downtime</Label>
          <Select.Root portal={null} onSelectedChange={(e) => (newMonitor.include_degraded_in_downtime = e.value)}>
            <Select.Trigger id="include_degraded_in_downtime">
              <Select.Value placeholder={newMonitor.include_degraded_in_downtime} />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label>Select YES or NO</Select.Label>
                <Select.Item value="YES" label="YES" class="text-sm font-medium">YES</Select.Item>
                <Select.Item value="NO" label="NO" class="text-sm font-medium">NO</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
        <div class="col-span-1">
          <Label for="monitor_type">Monitor Type</Label>
          <Select.Root
            portal={null}
            onSelectedChange={(e) => (newMonitor.monitor_type = e.value)}
            selected={{
              value: newMonitor.monitor_type,
              label: newMonitor.monitor_type
            }}
          >
            <Select.Trigger id="monitor_type">
              <Select.Value bind:value={newMonitor.monitor_type} placeholder="Monitor Type" />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label>Type</Select.Label>
                <Select.Item value="NONE" label="NONE" class="text-sm font-medium">NONE</Select.Item>
                <Select.Item value="API" label="API" class="text-sm font-medium">API</Select.Item>
                <Select.Item value="PING" label="PING" class="text-sm font-medium">PING</Select.Item>
                <Select.Item value="DNS" label="DNS" class="text-sm font-medium">DNS</Select.Item>
                <Select.Item value="TCP" label="TCP" class="text-sm font-medium">TCP</Select.Item>
                <Select.Item value="GROUP" label="GROUP" class="text-sm font-medium">GROUP</Select.Item>
                <Select.Item value="SSL" label="SSL" class="text-sm font-medium">SSL</Select.Item>
                <Select.Item value="SQL" label="SQL" class="text-sm font-medium">SQL</Select.Item>
                <Select.Item value="HEARTBEAT" label="HEARTBEAT" class="text-sm font-medium">HEARTBEAT</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
      </div>
      {#if newMonitor.monitor_type === "API"}
        <div class="mt-4 grid grid-cols-6 gap-2">
          <div class="col-span-1">
            <Label for="timeout">
              Timeout(ms)
              <span class="text-red-500">*</span>
            </Label>
            <Input bind:value={newMonitor.apiConfig.timeout} id="timeout" />
          </div>
          <div class="col-span-1">
            <Label for="method">Method</Label>
            <Select.Root portal={null} onSelectedChange={(e) => (newMonitor.apiConfig.method = e.value)}>
              <Select.Trigger id="method">
                <Select.Value placeholder={newMonitor.apiConfig.method} />
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Label>Method</Select.Label>
                  <Select.Item value="GET" label="GET" class="text-sm font-medium">GET</Select.Item>
                  <Select.Item value="POST" label="POST" class="text-sm font-medium">POST</Select.Item>
                  <Select.Item value="PUT" label="PUT" class="text-sm font-medium">PUT</Select.Item>
                  <Select.Item value="PATCH" label="PATCH" class="text-sm font-medium">PATCH</Select.Item>
                  <Select.Item value="DELETE" label="DELETE" class="text-sm font-medium">DELETE</Select.Item>
                  <Select.Item value="HEAD" label="HEAD" class="text-sm font-medium">HEAD</Select.Item>
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>
          <div class="col-span-4">
            <Label for="url">URL <span class="text-red-500">*</span></Label>
            <Input bind:value={newMonitor.apiConfig.url} id="url" placeholder="https://example.com/api/users" />
          </div>
          <div class="col-span-6 mt-2">
            <Label for="url">Headers</Label>
            <div class="grid grid-cols-6 gap-2">
              {#each newMonitor.apiConfig.headers as header, index}
                <div class="col-span-2">
                  <Input bind:value={header.key} id="header" placeholder="Content-Type" />
                </div>
                <div class="col-span-3">
                  <Input bind:value={header.value} id="header" placeholder="application/json" />
                </div>
                <div class="col-span-1 pt-2">
                  <Button
                    class=" h-6 w-6 p-1"
                    variant="secondary"
                    on:click={() => {
                      newMonitor.apiConfig.headers = newMonitor.apiConfig.headers.filter((_, i) => i !== index);
                    }}
                  >
                    <X class="h-5 w-5" />
                  </Button>
                </div>
              {/each}
            </div>
            <div class="relative pb-8 pt-2">
              <hr class="border-1 border-border-input relative top-4 h-px border-dashed" />

              <Button
                on:click={addHeader}
                variant="secondary"
                class="absolute left-1/2 h-8 -translate-x-1/2  p-2 text-xs  "
              >
                <Plus class="mr-2 h-4 w-4" /> Add Header
              </Button>
            </div>
          </div>

          {#if newMonitor.apiConfig.method[0] == "P"}
            <div class="col-span-6">
              <Label for="body">Body</Label>
              <textarea
                bind:value={newMonitor.apiConfig.body}
                id="body"
                class="h-48 w-full rounded-sm border p-2"
                placeholder={JSON.stringify({ name: "Kener" }, null, 2)}
              ></textarea>
            </div>
          {/if}
          <div class="col-span-6">
            <label class="cursor-pointer">
              <input
                type="checkbox"
                on:change={(e) => {
                  newMonitor.apiConfig.allowSelfSignedCert = e.target.checked;
                }}
                checked={newMonitor.apiConfig.allowSelfSignedCert}
              />
              <span class="ml-2 text-sm">Allow Self Signed Certificate</span>
            </label>
          </div>
          <div class="col-span-6">
            <Label for="eval">Eval</Label>
            <p class="my-1 text-xs text-muted-foreground">
              You can write a custom eval function to evaluate the response. The function should return a promise that
              resolves to an object with status and latency. <a
                target="_blank"
                class="font-medium text-primary"
                href="https://kener.ing/docs/monitors-api#eval">Read the docs</a
              > to learn
            </p>

            <div class="overflow-hidden rounded-md">
              <CodeMirror
                bind:value={newMonitor.apiConfig.eval}
                lang={javascript()}
                theme={$mode == "dark" ? githubDark : githubLight}
                styles={{
                  "&": {
                    width: "100%",
                    maxWidth: "100%",
                    height: "18rem",
                    border: "1px solid hsl(var(--border) / var(--tw-border-opacity))",
                    borderRadius: "0.375rem"
                  }
                }}
              />
            </div>
          </div>
        </div>
      {:else if newMonitor.monitor_type == "PING"}
        <div class="mt-4 grid grid-cols-6 gap-2">
          <div class="col-span-6">
            <div class=" grid grid-cols-7 gap-2">
              {#each newMonitor.pingConfig.hosts as host, index}
                <div class="relative col-span-7 flex gap-x-2">
                  <div>
                    <Label for="xconfig_ip_type">Type</Label>
                    <Select.Root
                      portal={null}
                      onSelectedChange={(e) => (host.type = e.value)}
                      selected={{
                        value: host.type,
                        label: host.type
                      }}
                    >
                      <Select.Trigger class="w-[150px]" id="xconfig_ip_type">
                        <Select.Value bind:value={host.type} placeholder="IP Type" />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Group>
                          <Select.Label>Type</Select.Label>
                          <Select.Item value="IP4" label="IP4" class="text-sm font-medium">IP4</Select.Item>
                          <Select.Item value="IP6" label="IP6" class="text-sm font-medium">IP6</Select.Item>
                          <Select.Item value="DOMAIN" label="DOMAIN" class="text-sm font-medium">DOMAIN</Select.Item>
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </div>
                  <div>
                    <Label for="hostsV4">Host</Label>
                    <Input bind:value={host.host} id="hostsV4" placeholder="172.12.14.42" />
                  </div>
                  <div>
                    <Label for="hostsV4timeout">Timeout</Label>
                    <Input
                      disabled={host.type == "IP6"}
                      bind:value={host.timeout}
                      id="hostsV4timeout"
                      placeholder="timeout in ms ex 3000"
                    />
                  </div>
                  <div>
                    <Label for="hostsV4count">Count</Label>
                    <Input bind:value={host.count} id="hostsV4count" placeholder="number of pings ex 4" />
                  </div>
                  <div>
                    <Button
                      class=" right-3 top-2 mt-8 h-6 w-6 p-1"
                      variant="secondary"
                      on:click={() => {
                        newMonitor.pingConfig.hosts = newMonitor.pingConfig.hosts.filter((_, i) => i !== index);
                      }}
                    >
                      <X class="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              {/each}
            </div>

            <div class="">
              <div class="">
                <Button
                  class="mt-4 text-xs"
                  variant="secondary"
                  on:click={() => {
                    newMonitor.pingConfig.hosts = [
                      ...newMonitor.pingConfig.hosts,
                      { host: "", timeout: 3000, count: 4, type: "IP4" }
                    ];
                  }}
                >
                  <Plus class="h-5 w-5" /> Add New
                </Button>
              </div>
            </div>
            <div class="mt-2">
              <Label for="pingEval">PING Eval</Label>
              <p class="my-1 text-xs text-muted-foreground">
                You can write a custom eval function to evaluate the response. The function should return a promise that
                resolves to an object with status and latency. <a
                  target="_blank"
                  class="font-medium text-primary"
                  href="https://kener.ing/docs/monitors-ping#eval">Read the docs</a
                > to learn
              </p>

              <div class="overflow-hidden rounded-md">
                <CodeMirror
                  bind:value={newMonitor.pingConfig.pingEval}
                  lang={javascript()}
                  theme={$mode == "dark" ? githubDark : githubLight}
                  styles={{
                    "&": {
                      width: "100%",
                      maxWidth: "100%",
                      height: "18rem",
                      border: "1px solid hsl(var(--border) / var(--tw-border-opacity))",
                      borderRadius: "0.375rem"
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      {:else if newMonitor.monitor_type == "TCP"}
        <div class="mt-4 grid grid-cols-6 gap-2">
          <div class="col-span-6">
            <div class=" grid grid-cols-7 gap-2">
              {#each newMonitor.tcpConfig.hosts as host, index}
                <div class="relative col-span-7 flex gap-x-2">
                  <div>
                    <Label for="xconfig_ip_type">Type</Label>
                    <Select.Root
                      portal={null}
                      onSelectedChange={(e) => (host.type = e.value)}
                      selected={{
                        value: host.type,
                        label: host.type
                      }}
                    >
                      <Select.Trigger class="w-[150px]" id="xconfig_ip_type">
                        <Select.Value bind:value={host.type} placeholder="IP Type" />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Group>
                          <Select.Label>Type</Select.Label>
                          <Select.Item value="IP4" label="IP4" class="text-sm font-medium">IP4</Select.Item>
                          <Select.Item value="IP6" label="IP6" class="text-sm font-medium">IP6</Select.Item>
                          <Select.Item value="DOMAIN" label="DOMAIN" class="text-sm font-medium">DOMAIN</Select.Item>
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </div>
                  <div>
                    <Label for="hostsV4">Host</Label>
                    <Input bind:value={host.host} id="hostsV4" placeholder="172.12.14.42" />
                  </div>
                  <div>
                    <Label for="hostsV4port">Port</Label>
                    <Input bind:value={host.port} id="hostsV4port" placeholder="port number ex 8080" />
                  </div>
                  <div>
                    <Label for="hostsV4timeout">Timeout</Label>
                    <Input bind:value={host.timeout} id="hostsV4timeout" placeholder="timeout in ms ex 3000" />
                  </div>
                  <div>
                    <Button
                      class="right-3 top-2 mt-8 h-6 w-6 p-1"
                      variant="secondary"
                      on:click={() => {
                        newMonitor.tcpConfig.hosts = newMonitor.tcpConfig.hosts.filter((_, i) => i !== index);
                      }}
                    >
                      <X class="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              {/each}
            </div>

            <div class="">
              <div class="">
                <Button
                  class="mt-4 text-xs"
                  variant="secondary"
                  on:click={() => {
                    newMonitor.tcpConfig.hosts = [
                      ...newMonitor.tcpConfig.hosts,
                      { host: "", timeout: 3000, type: "IP4", port: "" }
                    ];
                  }}
                >
                  <Plus class="mr-1 h-5 w-5" /> Add New
                </Button>
              </div>
            </div>
            <div class="mt-2">
              <Label for="tcpEval">TCP Eval</Label>
              <p class="my-1 text-xs text-muted-foreground">
                You can write a custom eval function to evaluate the response. The function should return a promise that
                resolves to an object with status and latency. <a
                  target="_blank"
                  class="font-medium text-primary"
                  href="https://kener.ing/docs/monitors-tcp#eval">Read the docs</a
                > to learn
              </p>
              <div class="overflow-hidden rounded-md">
                <CodeMirror
                  bind:value={newMonitor.tcpConfig.tcpEval}
                  lang={javascript()}
                  theme={$mode == "dark" ? githubDark : githubLight}
                  styles={{
                    "&": {
                      width: "100%",
                      maxWidth: "100%",
                      height: "22rem",
                      border: "1px solid hsl(var(--border) / var(--tw-border-opacity))",
                      borderRadius: "0.375rem"
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      {:else if newMonitor.monitor_type == "DNS"}
        <div class="mt-4 grid grid-cols-4 gap-2">
          <div class="col-span-2">
            <Label for="host">Host</Label>
            <Input bind:value={newMonitor.dnsConfig.host} id="host" />
          </div>
          <div class="col-span-2">
            <Label for="lookupRecord">Lookup Record</Label>
            <Select.Root portal={null} onSelectedChange={(e) => (newMonitor.dnsConfig.lookupRecord = e.value)}>
              <Select.Trigger id="lookupRecord">
                <Select.Value placeholder={newMonitor.dnsConfig.lookupRecord} />
              </Select.Trigger>
              <Select.Content class="max-h-56 overflow-y-auto">
                <Select.Group>
                  <Select.Label>Record</Select.Label>
                  {#each Object.keys(allRecordTypes) as record}
                    <Select.Item value={record} label={record} class="text-sm font-medium">
                      {record}
                    </Select.Item>
                  {/each}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>
          <div class="col-span-2">
            <Label for="nameServer">Name Server</Label>
            <Input bind:value={newMonitor.dnsConfig.nameServer} id="nameServer" />
          </div>
          <div class="col-span-2">
            <Label for="matchType">Match Type</Label>
            <Select.Root portal={null} onSelectedChange={(e) => (newMonitor.dnsConfig.matchType = e.value)}>
              <Select.Trigger id="matchType">
                <Select.Value placeholder={newMonitor.dnsConfig.matchType} />
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Label>Match Type</Select.Label>
                  <Select.Item value="ANY" label="ANY" class="text-sm font-medium">ANY</Select.Item>
                  <Select.Item value="ALL" label="ALL" class="text-sm font-medium">ALL</Select.Item>
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>

          <div class="col-span-4">
            <Label for="values">Expected Values</Label>
            <div class="grid grid-cols-7 gap-2">
              {#each newMonitor.dnsConfig.values as value, index}
                <div class="relative col-span-3">
                  <Input bind:value id="values" class="pr-10" placeholder="rajnandan1.github.io" />
                  <Button
                    class="absolute right-3 top-2 h-6 w-6 p-1"
                    variant="secondary"
                    on:click={() => {
                      newMonitor.dnsConfig.values = newMonitor.dnsConfig.values.filter((_, i) => i !== index);
                    }}
                  >
                    <X class="h-5 w-5" />
                  </Button>
                </div>
              {/each}
              <div class="col-span-1 pt-2">
                <Button
                  class="h-6 w-6 p-1"
                  variant="secondary"
                  on:click={() => {
                    newMonitor.dnsConfig.values = [...newMonitor.dnsConfig.values, ""];
                  }}
                >
                  <Plus class="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      {:else if newMonitor.monitor_type == "GROUP"}
        <div class="mt-4 grid grid-cols-6 gap-2">
          <div class="col-span-6 mb-1">
            <Label for="timeout">
              Timeout(ms)
              <span class="text-red-500">*</span>
            </Label>
            <Input bind:value={newMonitor.groupConfig.timeout} class="w-40" id="timeout" />
            <p class="my-1 text-xs text-muted-foreground">
              Maximum Time in milliseconds it will wait for all the monitors to resolved in that particular timestamp.
              Read the <a target="_blank" class="font-medium text-primary" href="https://kener.ing/docs/monitors-group">
                docs
              </a> to learn more
            </p>
          </div>
          <div class="col-span-6">
            <Label class="text-sm">Monitors</Label>
          </div>
          {#each newMonitor.groupConfig.monitors as monitor}
            <div class="col-span-3">
              <label class="cursor-pointer">
                <input
                  type="checkbox"
                  on:change={(e) => {
                    monitor.selected = e.target.checked;
                  }}
                  checked={monitor.selected}
                />
                {monitor.name}
                <span class="text-muted-foreground">({monitor.tag})</span>
              </label>
            </div>
          {/each}
          <div class="col-span-6 mt-2 rounded-sm border p-2">
            <label class="cursor-pointer">
              <input
                type="checkbox"
                on:change={(e) => {
                  newMonitor.groupConfig.hideMonitors = e.target.checked;
                }}
                checked={newMonitor.groupConfig.hideMonitors}
              />
              Hide Grouped Monitors from Home View
            </label>
          </div>
          <div class="col-span-6 mt-2">
            <ul class="text-xs font-medium leading-5 text-muted-foreground">
              <li>- The group status will be the worst status of the monitors in the group.</li>
            </ul>
          </div>
        </div>
      {:else if newMonitor.monitor_type == "SSL"}
        <div class="mt-4 grid grid-cols-7 gap-2">
          <div class="col-span-2">
            <Label for="sslHost">Host</Label>
            <Input placeholder="example.com" bind:value={newMonitor.sslConfig.host} id="sslHost" />
          </div>
          <div class="col-span-1">
            <Label for="sslHost">Port</Label>
            <Input placeholder="443" bind:value={newMonitor.sslConfig.port} id="sslPort" />
          </div>
          <div class="relative col-span-2">
            <Label for="degradedRemainingHours">Degraded If (in hours)</Label>
            <Input
              class="pl-20"
              type="number"
              placeholder="x hours"
              bind:value={newMonitor.sslConfig.degradedRemainingHours}
              id="degradedRemainingHours"
            />
            <span class="absolute left-2 top-9 -mt-0.5 text-sm font-medium text-muted-foreground">Expires In</span>
          </div>
          <div class="relative col-span-2">
            <Label for="downRemainingHours">Down If (in hours)</Label>
            <Input
              class="pl-20"
              placeholder="x hours"
              type="number"
              bind:value={newMonitor.sslConfig.downRemainingHours}
              id="downRemainingHours"
            />
            <span class="absolute left-2 top-9 -mt-0.5 text-sm font-medium text-muted-foreground">Expires In</span>
          </div>
          <div class="col-span-7">
            <span class="text-xs text-muted-foreground"
              >Degraded Remaining Hours should be greater than Down Remaining Hours. Refer to the
              <a target="_blank" class="font-medium text-primary" href="https://kener.ing/docs/monitors-ssl"
                >documentation</a
              >
            </span>
          </div>
        </div>
      {:else if newMonitor.monitor_type == "SQL"}
        <div>
          <div class="mt-4 flex gap-2">
            <div class="w-36">
              <Label for="sqlConfigdbType">Database Type</Label>
              <Select.Root
                portal={null}
                onSelectedChange={(e) => {
                  newMonitor.sqlConfig.dbType = e.value;
                }}
                selected={{
                  value: newMonitor.sqlConfig.dbType,
                  label: databaseTypes[newMonitor.sqlConfig.dbType]
                }}
              >
                <Select.Trigger id="sqlConfigdbType">
                  <Select.Value bind:value={newMonitor.sqlConfig.dbType} placeholder="DB" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    <Select.Label>Select DB</Select.Label>
                    <Select.Item value="pg" label={databaseTypes.pg} class="text-sm font-medium">
                      {databaseTypes.pg}
                    </Select.Item>
                    <Select.Item value="mysql2" label={databaseTypes.mysql2} class="text-sm font-medium">
                      {databaseTypes.mysql2}
                    </Select.Item>
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </div>
            <div class="w-36">
              <Label for="dbtimeout">Timeout(ms)</Label>
              <Input
                placeholder="in milliseconds"
                type="number"
                bind:value={newMonitor.sqlConfig.timeout}
                id="dbtimeout"
              />
            </div>
          </div>
          <div class="mt-2 grid grid-cols-1">
            <div class="col-span-1">
              <Label for="connectionString">Connection String</Label>
              <Input
                bind:value={newMonitor.sqlConfig.connectionString}
                id="connectionString"
                placeholder="Enter the connection string"
              />
            </div>
          </div>
          <div class="mt-2 grid grid-cols-1">
            <div class="col-span-1">
              <Label for="sqlQuery">SQL Query</Label>
              <Input bind:value={newMonitor.sqlConfig.query} id="sqlQuery" placeholder="SELECT 1" />
            </div>
          </div>
          <div class="col-span-1">
            <span class="text-xs text-muted-foreground"
              >Refer to the
              <a target="_blank" class="font-medium text-primary" href="https://kener.ing/docs/monitors-sql">
                documentation
              </a> for more details
            </span>
          </div>
        </div>
      {:else if newMonitor.monitor_type == "HEARTBEAT"}
        <div>
          <div class="relative mt-4 justify-start gap-x-4">
            <p class="truncate rounded-md border bg-popover p-2 pr-8 text-sm font-medium">
              Heart beat url: <span class="text-muted-foreground">
                {$page.data.siteData.siteURL +
                  `${base}/api/heartbeat/${newMonitor.tag}:${newMonitor.heartbeatConfig.secretString}`}</span
              >
            </p>
            <Button
              class="copybtn absolute right-2 top-2 flex h-6 w-6 justify-center p-1"
              variant="ghost"
              size="icon"
              on:click={() =>
                copyToClipboard(
                  $page.data.siteData.siteURL +
                    `${base}/api/heartbeat/${newMonitor.tag}:${newMonitor.heartbeatConfig.secretString}`
                )}
            >
              <Check class="check-btn absolute  h-4 w-4 text-green-500" />
              <Clipboard class="copy-btn absolute h-4 w-4" />
            </Button>
          </div>
          <div class="mt-2 flex flex-row justify-start gap-x-4">
            <div>
              <Label for="degradedRemainingMinutes">Degraded or grace Period (in minutes)</Label>
              <Input
                placeholder="in minutes"
                class="w-full"
                type="number"
                bind:value={newMonitor.heartbeatConfig.degradedRemainingMinutes}
                id="degradedRemainingMinutes"
              />
            </div>
            <div>
              <Label for="downRemainingMinutes">Down or impacted Period (in minutes)</Label>
              <Input
                placeholder="in minutes"
                type="number"
                bind:value={newMonitor.heartbeatConfig.downRemainingMinutes}
                id="downRemainingMinutes"
              />
            </div>
          </div>

          <div class="col-span-1">
            <span class="text-xs text-muted-foreground"
              >Refer to the
              <a target="_blank" class="font-medium text-primary" href="https://kener.ing/docs/monitors-heartbeat">
                documentation
              </a> for more details
            </span>
          </div>
        </div>
      {/if}
      {#if !!newMonitor.id}
        <div class="mt-4 flex">
          <div class="flex w-full flex-col rounded-md border border-destructive p-2">
            <div class="w-full">
              <h2 class="flex justify-between text-lg">
                <span class="text-destructive">Danger Zone</span>
              </h2>
              <p class="text-sm">Deleting a monitor is irreversible. Please be sure before deleting.</p>
            </div>
            <form class="flex gap-x-2" on:submit|preventDefault={deleteMonitor}>
              <div class="mt-1 flex flex-col gap-y-2">
                <Label for="deleteMonitor">
                  Type <i class="text-destructive">delete {newMonitor.tag}</i> to confirm
                </Label>
                <Input bind:value={deleteMonitorConfirmText} id="deleteMonitor" required />
              </div>
              <Button
                variant="destructive"
                type="submit"
                class="mt-7"
                disabled={deleteMonitorConfirmText != `delete ${newMonitor.tag}`}
              >
                Delete
                {#if deletingMonitor}
                  <Loader class="ml-2 inline h-4 w-4 animate-spin" />
                {/if}
              </Button>
            </form>
          </div>
        </div>
      {/if}
    </div>
    <div class="absolute bottom-0 grid h-16 w-full grid-cols-6 justify-end gap-2 border-t p-3 pr-6">
      <div class="col-span-5 py-2.5">
        <p
          title={invalidFormMessage}
          class="overflow-x-hidden text-ellipsis whitespace-nowrap text-right text-xs font-medium text-red-500"
        >
          {invalidFormMessage}
        </p>
      </div>
      <div class="col-span-1">
        <Button class=" w-full" on:click={saveOrUpdateMonitor} disabled={formState === "loading"}>
          Save
          {#if formState === "loading"}
            <Loader class="ml-2 inline h-4 w-4 animate-spin" />
          {/if}
        </Button>
      </div>
    </div>
  </div>
</div>

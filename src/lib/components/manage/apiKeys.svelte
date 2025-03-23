<script>
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import moment from "moment";
  import { Button } from "$lib/components/ui/button";
  import Plus from "lucide-svelte/icons/plus";
  import X from "lucide-svelte/icons/x";
  import Settings from "lucide-svelte/icons/settings";
  import Bell from "lucide-svelte/icons/bell";
  import Loader from "lucide-svelte/icons/loader";
  import Copy from "lucide-svelte/icons/copy";
  import Check from "lucide-svelte/icons/check";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { page } from "$app/stores";

  let apiKeys = [];
  let loaderLoadingAll = false;
  let loaderCreateNew = false;
  let newAPIKeyName = "";
  let newKeyResp = {};
  let showCreateModal = false;

  async function loadAPIKeys() {
    loaderLoadingAll = true;
    try {
      let apiResp = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "getAPIKeys",
          data: {}
        })
      });
      let resp = await apiResp.json();
      apiKeys = resp;
    } catch (error) {
      alert("Error: " + error);
    } finally {
      loaderLoadingAll = false;
    }
  }

  async function createNew() {
    newKeyResp = {};
    loaderCreateNew = true;
    try {
      let apiResp = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "createNewApiKey",
          data: {
            name: newAPIKeyName
          }
        })
      });
      newKeyResp = await apiResp.json();
      loadAPIKeys();
      showCreateModal = false;
    } catch (error) {
      alert("Error: " + error);
    } finally {
      loaderCreateNew = false;
    }
  }

  onMount(() => {
    loadAPIKeys();
  });

  function copyKey() {
    navigator.clipboard.writeText(newKeyResp.apiKey);
  }

  function updateStatus(apiKey) {
    apiKey.status = apiKey.status == "ACTIVE" ? "INACTIVE" : "ACTIVE";
    fetch(base + "/manage/app/api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "updateApiKeyStatus",
        data: {
          id: apiKey.id,
          status: apiKey.status
        }
      })
    });
  }
</script>

<div class="mt-4">
  <div class="mb-4 flex justify-between">
    <div>
      {#if loaderLoadingAll}
        <Loader class="mt-6 h-4 w-4 animate-spin" />
      {/if}
    </div>
    <div>
      {#if $page.data.user.role != "member"}
        <Button
          on:click={(e) => {
            showCreateModal = true;
          }}
        >
          <Plus class="mr-2 h-4 w-4" /> Create New API Key
        </Button>
      {/if}
    </div>
  </div>
</div>
{#if !!newKeyResp && !!newKeyResp.apiKey}
  <div class="my-4 rounded-lg border border-green-700 bg-green-800 bg-opacity-20 p-4">
    <p class="font-medium">
      <picture class="mr-1 inline-block">
        <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp" type="image/webp" />
        <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif" alt="🎉" width="24" height="24" />
      </picture>
      API Key Created
    </p>
    <p class="relative my-2 rounded-sm border bg-card px-4 py-2 pr-8 font-mono text-sm font-medium">
      {newKeyResp.apiKey}

      <Button size="icon" variant="ghost" class="copybtn absolute right-2 top-2 h-5 w-5 p-1" on:click={copyKey}>
        <Check class="check-btn absolute left-0 top-0 h-4 w-4 text-green-500" />
        <Copy class="copy-btn absolute left-0 top-0 h-4 w-4 " />
      </Button>
    </p>
    <p class="text-xs text-muted-foreground">
      Your new API key has been created. It will be <b class="uppercase underline">not be shown again</b>, so make sure
      to save it.
    </p>
  </div>
{/if}
<div class="flex flex-col">
  <div class="-m-1.5 overflow-x-auto">
    <div class="inline-block min-w-full p-1.5 align-middle">
      <div class="overflow-hidden rounded-lg border dark:border-neutral-700">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
          <thead>
            <tr>
              <th
                scope="col"
                class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500">Name</th
              >
              <th
                scope="col"
                class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500">Key</th
              >
              <th
                scope="col"
                class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
                >Created At</th
              >
              <th
                scope="col"
                class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
              ></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-neutral-700">
            {#each apiKeys as apiKey}
              <tr>
                <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800 dark:text-neutral-200">
                  {apiKey.name}
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-xs font-semibold text-gray-800 dark:text-neutral-200">
                  {apiKey.masked_key.slice(-32)}
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-800 dark:text-neutral-200">
                  {moment.utc(apiKey.created_at, "YYYY-MM-DD HH:mm:ss").local().format("YYYY-MM-DD HH:mm:ss")}
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-xs font-semibold text-gray-800 dark:text-neutral-200">
                  <label class="inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      disabled={$page.data.user.role == "member"}
                      value=""
                      class="peer sr-only"
                      checked={apiKey.status == "ACTIVE"}
                      on:change={() => {
                        updateStatus(apiKey);
                      }}
                    />
                    <div
                      class="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 peer-disabled:opacity-55 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800 rtl:peer-checked:after:-translate-x-full"
                    ></div>
                  </label>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
{#if showCreateModal}
  <div class="moldal-container fixed left-0 top-0 z-30 h-screen w-full bg-card bg-opacity-30 backdrop-blur-sm">
    <div
      class="absolute left-1/2 top-1/2 h-fit w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background shadow-lg backdrop-blur-lg"
    >
      <Button
        variant="ghost"
        on:click={() => {
          showCreateModal = false;
        }}
        class="absolute right-2 top-2 z-40 h-6 w-6   rounded-full border bg-background p-1"
      >
        <X class="h-4 w-4   text-muted-foreground" />
      </Button>
      <div class="content px-4 py-4">
        <h2 class="text-lg font-semibold">Create a new API Key</h2>
        <p class="text-xs text-muted-foreground">
          API keys are used to authenticate your requests to the API. They are unique to your account and should be kept
          secret.
        </p>
        <hr class="my-4" />
        <form on:submit|preventDefault={createNew}>
          <div class="flex flex-col gap-4">
            <div>
              <Label for="newAPIKeyName">Name</Label>
              <Input
                bind:value={newAPIKeyName}
                class="mt-2"
                type="text"
                id="newAPIKeyName"
                required
                placeholder="eg. My API Key"
              />
            </div>
          </div>
          <div class="mt-4 flex justify-end">
            <Button variant="secondary" type="submit" disabled={loaderCreateNew}>
              Create
              {#if loaderCreateNew}
                <Loader class="ml-2 inline h-4 w-4 animate-spin" />
              {/if}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

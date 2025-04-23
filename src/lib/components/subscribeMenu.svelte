<script>
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Button } from "$lib/components/ui/button";
  import { page } from "$app/stores";
  import { base } from "$app/paths";
  import { onMount } from "svelte";
  import GMI from "$lib/components/gmi.svelte";
  import autoAnimate from "@formkit/auto-animate";
  import Loader from "lucide-svelte/icons/loader";
  import AlarmClockCheck from "lucide-svelte/icons/alarm-clock-check";
  import Logout from "lucide-svelte/icons/log-out";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";

  let apiError = "";
  let view = "loading";
  let localStorageKey = "user_subscription";

  let login = {
    userEmail: "",
    verifyWithToken: "",
    verificationCode: ""
  };

  let subscribedMonitors = [];

  let subsInfo = {
    allMonitors: false,
    monitors: [],
    hasActiveSubscription: false
  };

  let subscribableMonitors = $page.data.subscribableMonitors;
  let callingAPI = false;
  let alreadySubscribed = false;
  let subscriberData = null;

  onMount(async () => {
    // Try to fetch stored subscription data from localStorage
    await fetchStoredSubscription();
    //
  });

  async function createNewUserSubscription() {
    callingAPI = true;
    apiError = "";
    let action = "subscribe";

    try {
      const response = await callAPI(action, {
        token: localStorage.getItem(localStorageKey),
        monitors: subsInfo.monitors,
        allMonitors: subsInfo.allMonitors
      });
      await fetchStoredSubscription();
    } catch (e) {
      apiError = e.message;
    } finally {
      callingAPI = false;
    }
  }

  async function removeSubscription() {
    //use confirm
    if (!confirm("Are you sure you want to unsubscribe?")) {
      return;
    }
    callingAPI = true;
    apiError = "";
    let action = "unsubscribe";

    try {
      await callAPI(action, {
        token: localStorage.getItem(localStorageKey)
      });
      await fetchStoredSubscription();
    } catch (e) {
      apiError = e.message;
    } finally {
      callingAPI = false;
    }
  }

  async function callAPI(action, data) {
    try {
      const response = await fetch(`${base}/api/subscriptions/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        return await response.json();
      } else {
        let error = await response.json();
        throw new Error(error.message || "An error occurred while processing your request.");
      }
    } catch (error) {
      console.error("Error calling API:", error);
      throw error;
    }
  }

  async function doLogin() {
    let action = "login";
    callingAPI = true;
    apiError = "";
    try {
      const response = await callAPI(action, {
        userEmail: login.userEmail
      });

      if (response) {
        login.verifyWithToken = response.token;
        login.verificationCode = "";
        view = "verify_login";
      }
    } catch (e) {
      apiError = e.message;
    } finally {
      callingAPI = false;
    }
  }

  async function verifyLogin() {
    let action = "verify";
    callingAPI = true;
    apiError = "";
    try {
      const response = await callAPI(action, {
        token: login.verifyWithToken,
        code: login.verificationCode
      });

      if (response) {
        localStorage.setItem(localStorageKey, response.token);
        await fetchStoredSubscription();
      }
    } catch (e) {
      apiError = e.message;
    } finally {
      callingAPI = false;
    }
  }

  async function fetchStoredSubscription() {
    let action = "fetch";
    view = "loading";
    let token = localStorage.getItem(localStorageKey);
    if (!!!token) {
      view = "login";
      return;
    }
    try {
      const response = await callAPI(action, {
        token: token
      });

      if (response) {
        subsInfo.email = response.email;
        view = "subscribe";
        subsInfo.monitors = response.monitors;
        if (subsInfo.monitors && subsInfo.monitors.length > 0) {
          subsInfo.hasActiveSubscription = true;
          //if parsedData.monitors contains "_", set allMonitors to true
          const allMonitorsIncluded = subsInfo.monitors.includes("_");
          if (allMonitorsIncluded) {
            subsInfo.allMonitors = true;
          } else {
            subsInfo.allMonitors = false;
            subsInfo.monitors = subsInfo.monitors.filter((m) => m !== "_");
          }
        } else {
          subsInfo.allMonitors = false;
          subsInfo.monitors = [];
          subsInfo.hasActiveSubscription = false; // Updated to set hasActiveSubscription
        }
      }
    } catch (e) {
      view = "login";
    }
  }

  function doLogout() {
    localStorage.removeItem(localStorageKey);
    login.userEmail = "";
    login.verificationCode = "";
    login.verifyWithToken = "";
    view = "login";
  }
</script>

<div class="flex flex-col gap-2 pb-4" use:autoAnimate>
  <div class="relative mb-2 scroll-m-20 px-4 pt-4 text-xl font-medium tracking-tight">
    <p>Manage Subscription</p>
  </div>

  {#if view === "login"}
    <div class="flex flex-col gap-2 px-4">
      <div>
        <p class="mb-2 text-xs font-semibold text-muted-foreground">
          Enter your email to log in. If you are not subscribed, you will be prompted to subscribe.
        </p>

        <div class="relative">
          <Input type="email" placeholder="Enter your email" bind:value={login.userEmail} />
        </div>
      </div>
    </div>

    <div class="mt-2 flex flex-col gap-2 px-4">
      {#if apiError}
        <p class="text-xs font-semibold text-destructive">{apiError}</p>
      {/if}
      <Button class="w-full" disabled={callingAPI || !login.userEmail} on:click={doLogin}>
        Login
        {#if callingAPI}
          <Loader class="ml-2 h-4 w-4 animate-spin" />
        {/if}
      </Button>
    </div>
  {/if}

  {#if view === "loading"}
    <div class="flex h-20 justify-center align-middle">
      <Loader class="mt-5 h-10 w-10 animate-spin" />
    </div>
  {/if}
  {#if view === "subscribe"}
    <div class="flex flex-col gap-2 px-4">
      {#if subsInfo.email}
        <div
          class="flex justify-between rounded-md stroke-secondary-foreground py-2 text-xs font-medium text-muted-foreground"
        >
          <span class="mt-1 text-xs font-semibold text-muted-foreground">You are logged in as {subsInfo.email}</span>
          <div>
            <Button
              variant="ghost"
              size="icon"
              class="   h-6 w-6 justify-center   text-xs font-semibold  text-muted-foreground"
              on:click={doLogout}
            >
              <Logout class="  h-4 w-4" />
            </Button>
          </div>
        </div>
      {/if}
      <div class="mt-2">
        <label class="flex w-full cursor-pointer items-center justify-between">
          <span class="text-sm font-medium"> Subscribe to all monitors </span>
          <input
            type="checkbox"
            value=""
            class="peer sr-only"
            checked={subsInfo.allMonitors}
            on:change={(e) => {
              subsInfo.allMonitors = e.target.checked;
              if (e.target.checked) {
                subsInfo.monitors = [];
              }
            }}
          />
          <div
            class="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800 rtl:peer-checked:after:-translate-x-full"
          ></div>
        </label>
      </div>
    </div>
    {#if subscribableMonitors.length > 0 && !subsInfo.allMonitors}
      <div class="flex flex-col gap-2">
        <p class="px-4">
          <span class="text-xs font-semibold text-muted-foreground">
            Please select specific monitors to receive updates from.
          </span>
        </p>
        <div class="flex max-h-96 flex-col gap-2 overflow-y-auto px-4">
          {#each subscribableMonitors as monitor}
            <div class="flex items-center justify-between gap-2 border-b pb-2 last:border-0">
              <label for={monitor.tag} class="flex gap-x-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                <GMI src={monitor.image} classList="mt-1 h-4 w-4" />
                {monitor.name}
              </label>
              <input
                type="checkbox"
                on:change={(e) => {
                  if (e.target.checked) {
                    subsInfo.monitors.push(monitor.tag);
                  } else {
                    subsInfo.monitors = subsInfo.monitors.filter((tag) => tag !== monitor.tag);
                  }
                }}
                id={monitor.tag}
                value={monitor.tag}
                bind:group={subsInfo.monitors}
                class="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
              />
            </div>
          {/each}
        </div>
      </div>
    {/if}
    <div class="mt-2 flex flex-col gap-2 px-4">
      {#if apiError}
        <p class="text-xs font-semibold text-destructive">{apiError}</p>
      {/if}
      <Button class="w-full" disabled={callingAPI} on:click={createNewUserSubscription}>
        {#if subsInfo.monitors.length > 0}
          Update Subscription
        {:else}
          Subscribe
        {/if}

        {#if callingAPI}
          <Loader class="ml-2 h-4 w-4 animate-spin" />
        {/if}
      </Button>
    </div>
  {/if}

  {#if view === "verify_login"}
    <div class="flex flex-col gap-2 px-4">
      <div>
        <Button
          variant="outline"
          class="bounce-left mb-2 h-8 justify-start  pl-1.5 text-xs  text-muted-foreground"
          on:click={() => (view = "login")}
        >
          <ChevronLeft class="arrow mr-1 h-5 w-5" />
          Change Email
        </Button>
        <p class="mb-2 text-xs text-muted-foreground">
          We have sent a code to your email. Please enter it below to confirm your login
        </p>

        <Input type="text" placeholder="Enter the code" bind:value={login.verificationCode} />
      </div>
    </div>
    <div class="mt-2 flex flex-col gap-2 px-4">
      {#if apiError}
        <p class="text-xs font-semibold text-destructive">{apiError}</p>
      {/if}
      <Button class="w-full" disabled={callingAPI || !login.verificationCode} on:click={verifyLogin}>
        Confirm Login

        {#if callingAPI}
          <Loader class="ml-2 h-4 w-4 animate-spin" />
        {/if}
      </Button>
    </div>
  {/if}
</div>

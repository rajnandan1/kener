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
  import ChevronLeft from "lucide-svelte/icons/chevron-left";

  let apiError = "";
  let view = "subscribe";
  let localStorageKey = "user_subscription";
  let pin = "";
  let subsConfig = {
    allMonitors: true,
    monitorTags: [],
    userEmail: "",
    type: "email",
    emailStatus: "",
    confirmCode: "",
    unsubscribeCode: "",
    forceSend: false,
    forceSend2: false
  };
  let subscribableMonitors = $page.data.subscribableMonitors;
  let callingAPI = false;
  let alreadySubscribed = false;
  let subscriberData = null;

  function parsingData(parsedData) {
    subsConfig.userEmail = parsedData.email || "";
    subsConfig.monitorTags = [];
    subsConfig.allMonitors = false;
    subsConfig.emailStatus = parsedData.status || "";

    if (parsedData.monitors && parsedData.monitors.length > 0) {
      //if parsedData.monitors contains "_", set allMonitors to true
      const allMonitorsIncluded = parsedData.monitors.includes("_");
      if (allMonitorsIncluded) {
        subsConfig.allMonitors = true;
      } else {
        subsConfig.allMonitors = false;
        subsConfig.monitorTags = parsedData.monitors.filter((m) => m !== "_");
      }
    } else {
      subsConfig.allMonitors = true;
      subsConfig.monitorTags = [];
    }
  }

  onMount(async () => {
    // Try to fetch stored subscription data from localStorage
    const storedSubscription = localStorage.getItem(localStorageKey);
    if (storedSubscription) {
      try {
        const parsedData = JSON.parse(storedSubscription);
        parsingData(parsedData);
        await fetchAndSet();
      } catch (e) {
        console.error("Error parsing stored subscription:", e);
        localStorage.removeItem(localStorageKey);
      }
    }
  });

  async function fetchAndSet() {
    try {
      let action = "fetch";
      const data = await callAPI(action, {
        userEmail: subsConfig.userEmail,
        type: "email"
      });

      if (data) {
        //store in localStorage
        parsingData(data);
        localStorage.setItem(localStorageKey, JSON.stringify(data));
      }
    } catch (e) {
      //remove localstorage
      localStorage.removeItem(localStorageKey);
    }
  }

  async function createNewUserSubscription() {
    callingAPI = true;
    apiError = "";
    let action = "subscribe";

    try {
      const response = await callAPI(action, subsConfig);
      view = "confirm_subscribe";

      // Store subscription data in localStorage
    } catch (e) {
      apiError = e.message;
    } finally {
      callingAPI = false;
      subsConfig.forceSend = false;
      fetchAndSet();
    }
  }

  async function removeSubscription() {
    callingAPI = true;
    apiError = "";
    let action = "unsubscribe";

    try {
      await callAPI(action, subsConfig);
      view = "confirm_unsubscribe";
    } catch (e) {
      apiError = e.message;
    } finally {
      callingAPI = false;
      subsConfig.forceSend2 = false;
    }
  }

  function toggleView() {
    view = view === "subscribe" ? "unsubscribe" : "subscribe";

    // When switching to unsubscribe view, fetch current subscription details
    if (view === "unsubscribe" && subsConfig.userEmail) {
      fetchAndSet();
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

  async function confirmSubscription() {
    let action = "confirm_subscription";
    callingAPI = true;
    apiError = "";

    try {
      const response = await callAPI(action, {
        userEmail: subsConfig.userEmail,
        type: "email",
        confirmCode: subsConfig.confirmCode
      });

      if (response) {
        // Store subscription data in localStorage
        parsingData(response);
        localStorage.setItem(localStorageKey, JSON.stringify(response));
        view = "subscribe";
      }
    } catch (e) {
      apiError = e.message;
    } finally {
      callingAPI = false;
    }
  }

  async function confirmUnsubscribe() {
    let action = "confirm_unsubscribe";
    callingAPI = true;
    apiError = "";

    try {
      const response = await callAPI(action, {
        userEmail: subsConfig.userEmail,
        type: "email",
        unsubscribeCode: subsConfig.unsubscribeCode // Updated to use subsConfig.unsubscribeCode
      });

      if (response) {
        // Store subscription data in localStorage
        parsingData(response);
        localStorage.setItem(localStorageKey, JSON.stringify(response));
        view = "subscribe";
        //clear lc
        localStorage.removeItem(localStorageKey);
        subsConfig = {
          allMonitors: true,
          monitorTags: [],
          userEmail: "",
          type: "email",
          emailStatus: "",
          confirmCode: "",
          unsubscribeCode: "",
          forceSend: false,
          forceSend2: false
        };
      }
    } catch (e) {
      apiError = e.message;
    } finally {
      callingAPI = false;
    }
  }
</script>

<div class="flex flex-col gap-2 pb-4" use:autoAnimate>
  <div class="relative mb-2 scroll-m-20 px-4 pt-4 text-xl font-medium tracking-tight">
    <p>Manage Subscription</p>
  </div>

  {#if view === "subscribe"}
    <div class="flex flex-col gap-2 px-4">
      <div>
        <p class="mb-2 text-xs font-semibold text-muted-foreground">
          Enter your email to receive updates. You can also customize your preferences.
        </p>
        {#if alreadySubscribed}
          <div class="">
            <p class="relative mb-2 rounded-md border bg-green-400 p-2 pl-8 dark:bg-green-700">
              <AlarmClockCheck class="absolute left-2 top-3 h-4 w-4  " />
              <span class="text-sm font-medium"> You have already subscribed to updates. </span>
            </p>
          </div>
        {/if}
        <div class="relative">
          <Input type="email" placeholder="Enter your email" bind:value={subsConfig.userEmail} />
        </div>
        {#if !!subsConfig.emailStatus && subsConfig.emailStatus === "PENDING"}
          <div class="mt-2 text-xs font-semibold text-muted-foreground">
            You have not verified your email yet. Please check your inbox for a verification code. Click <button
              class="text-card-foreground"
              on:click={createNewUserSubscription}
            >
              here
            </button>
            if you already have the verification code or if you want to
            <button
              class="text-card-foreground"
              on:click={() => {
                subsConfig.forceSend = true;
                createNewUserSubscription();
              }}
            >
              resend
            </button> it.
          </div>
        {/if}
        {#if !!subsConfig.emailStatus && subsConfig.emailStatus === "ACTIVE"}
          <div class="mt-2 text-xs font-semibold text-green-500">
            You are currently subscribed to updates. You can
            <button class="text-card-foreground" on:click={toggleView}> unsubscribe </button> at any time.
          </div>
        {/if}
      </div>
    </div>
    <div class="mt-2">
      <label class="flex w-full cursor-pointer items-center justify-between px-4">
        <span class="text-sm font-medium"> Subscribe to all monitors </span>
        <input
          type="checkbox"
          value=""
          class="peer sr-only"
          checked={subsConfig.allMonitors}
          on:change={(e) => {
            subsConfig.allMonitors = e.target.checked;
          }}
        />
        <div
          class="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800 rtl:peer-checked:after:-translate-x-full"
        ></div>
      </label>
    </div>
    {#if subscribableMonitors.length > 0 && !subsConfig.allMonitors}
      <div class="flex flex-col gap-2">
        <p class="px-4">
          <span class="text-xs font-semibold text-muted-foreground">
            Please select specific monitors to receive updates from.
          </span>
        </p>
        <div class="flex max-h-96 flex-col gap-2 overflow-y-auto px-4">
          {#each subscribableMonitors as monitor}
            <div class="flex items-center justify-between gap-2 border-b pb-2 last:border-0">
              <label
                for={monitor.tag}
                class="flex gap-x-2 text-sm font-medium text-gray-900 dark:text-gray-300 {subsConfig.allMonitors
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer'}"
              >
                <GMI src={monitor.image} classList="mt-1 h-4 w-4" />
                {monitor.name}
              </label>
              <input
                type="checkbox"
                on:change={(e) => {
                  if (e.target.checked) {
                    subsConfig.monitorTags.push(monitor.tag);
                  } else {
                    subsConfig.monitorTags = subsConfig.monitorTags.filter((tag) => tag !== monitor.tag);
                  }
                }}
                id={monitor.tag}
                value={monitor.tag}
                bind:group={subsConfig.monitorTags}
                disabled={subsConfig.allMonitors}
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
      <Button class="w-full" disabled={callingAPI || !subsConfig.userEmail} on:click={createNewUserSubscription}>
        Subscribe
        {#if callingAPI}
          <Loader class="ml-2 h-4 w-4 animate-spin" />
        {/if}
      </Button>
      <div class="mt-1 text-center text-xs font-semibold text-muted-foreground">
        You can

        <button class="cursor-pointer text-primary" on:click={toggleView}>unsubscribe</button>
        from updates at any time.
      </div>
    </div>
  {/if}

  {#if view === "unsubscribe"}
    <!-- Unsubscribe -->

    <div class="flex flex-col gap-2 px-4">
      <div>
        <Button
          variant="outline"
          class="bounce-left mb-2 h-8 justify-start  pl-1.5 text-xs font-semibold  text-muted-foreground"
          on:click={() => (view = "subscribe")}
        >
          <ChevronLeft class="arrow mr-1 h-5 w-5" />
          Back
        </Button>
        <p class="mb-2 text-xs font-semibold text-muted-foreground">
          Please enter your email to unsubscribe from updates.
        </p>

        <Input type="email" placeholder="Enter your email" bind:value={subsConfig.userEmail} />
        <div class="mt-2 flex flex-row justify-between text-xs font-semibold text-muted-foreground">
          <button
            on:click={() => {
              view = "confirm_unsubscribe";
            }}
          >
            Have the Code?
          </button>
          <button
            on:click={() => {
              subsConfig.forceSend2 = true;
              removeSubscription();
            }}
          >
            Resend Code
          </button>
        </div>
      </div>
    </div>
    <div class="mt-2 flex flex-col gap-2 px-4">
      {#if apiError}
        <p class="text-xs font-semibold text-destructive">{apiError}</p>
      {/if}
      <Button
        class="w-full"
        variant="destructive"
        disabled={callingAPI || !subsConfig.userEmail}
        on:click={removeSubscription}
      >
        Unsubscribe
        {#if callingAPI}
          <Loader class="ml-2 h-4 w-4 animate-spin" />
        {/if}
      </Button>
    </div>
    <div class="mt-2 px-4">
      <p class="text-center text-xs font-semibold text-muted-foreground">
        You can
        <span class="cursor-pointer text-primary" on:click={toggleView}>subscribe</span> again at any time.
      </p>
    </div>
  {/if}

  {#if view === "confirm_subscribe"}
    <div class="flex flex-col gap-2 px-4">
      <div>
        <Button
          variant="outline"
          class="bounce-left mb-2 h-8 justify-start  pl-1.5 text-xs  text-muted-foreground"
          on:click={() => (view = "subscribe")}
        >
          <ChevronLeft class="arrow mr-1 h-5 w-5" />
          Change Email
        </Button>
        <p class="mb-2 text-xs text-muted-foreground">
          We have sent a code to your email. Please enter it below to confirm your subscription
        </p>

        <Input type="text" placeholder="Enter the code" bind:value={subsConfig.confirmCode} />
      </div>
    </div>
    <div class="mt-2 flex flex-col gap-2 px-4">
      {#if apiError}
        <p class="text-xs font-semibold text-destructive">{apiError}</p>
      {/if}
      <Button class="w-full" disabled={callingAPI || !subsConfig.confirmCode} on:click={confirmSubscription}>
        Confirm Subscription

        {#if callingAPI}
          <Loader class="ml-2 h-4 w-4 animate-spin" />
        {/if}
      </Button>
    </div>
  {/if}
  {#if view === "confirm_unsubscribe"}
    <!-- Unsubscribe -->

    <div class="flex flex-col gap-2 px-4">
      <div>
        <Button
          variant="outline"
          class="bounce-left mb-2 h-8 justify-start  pl-1.5 text-xs  text-muted-foreground"
          on:click={() => (view = "unsubscribe")}
        >
          <ChevronLeft class="arrow mr-1 h-5 w-5" />
          Change Email
        </Button>
        <p class="mb-2 text-xs text-muted-foreground">
          We have sent a code to your email. Please enter it below to remove your subscription
        </p>

        <Input type="text" placeholder="Enter the code" bind:value={subsConfig.unsubscribeCode} />
      </div>
    </div>
    <div class="mt-2 flex flex-col gap-2 px-4">
      {#if !!apiError}
        <p class="text-xs font-semibold text-destructive">{apiError}</p>
      {/if}
      <Button
        class="w-full"
        disabled={callingAPI || !subsConfig.unsubscribeCode}
        on:click={() => {
          confirmUnsubscribe();
        }}
      >
        Remove Subscription

        {#if callingAPI}
          <Loader class="ml-2 h-4 w-4 animate-spin" />
        {/if}
      </Button>
    </div>
  {/if}
</div>

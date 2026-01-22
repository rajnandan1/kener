<script lang="ts">
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import Loader from "lucide-svelte/icons/loader";
  import LogOut from "lucide-svelte/icons/log-out";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import * as Avatar from "$lib/components/ui/avatar/index.js";

  import { onMount } from "svelte";

  interface MonitorTagResponse {
    tag: string;
    name: string;
    image: string | null;
    description: string | null;
  }

  interface Props {
    open: boolean;
    monitor_tags?: string[];
  }

  type ViewType = "loading" | "login" | "verify_login" | "subscribe";

  const LOCAL_STORAGE_KEY = "user_subscription";

  let monitors = $state<MonitorTagResponse[]>([]);
  let { open = $bindable(false), monitor_tags = [] }: Props = $props();

  // View state
  let view = $state<ViewType>("loading");
  let apiError = $state("");
  let callingAPI = $state(false);

  // Login state
  let loginEmail = $state("");
  let verifyToken = $state("");
  let verificationCode = $state("");

  // Subscription state
  let userEmail = $state("");
  let selectedMonitors = $state<string[]>([]);
  let savedMonitors = $state<string[]>([]);
  let hasActiveSubscription = $state(false);

  onMount(async () => {
    await fetchStoredSubscription();
    await fetchMonitors();
  });

  async function fetchMonitors() {
    if (monitor_tags.length === 0) return;
    try {
      const response = await fetch(`/dashboard-apis/monitor-tags?tags=${monitor_tags.join(",")}`);
      if (response.ok) {
        monitors = await response.json();
      }
    } catch (e) {
      console.error("Failed to fetch monitors:", e);
    }
  }

  async function callAPI(action: string, data: Record<string, unknown>) {
    const response = await fetch(`/dashboard-apis/subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...data })
    });

    if (response.ok) {
      return await response.json();
    } else {
      const error = await response.json();
      throw new Error(error.message || "An error occurred while processing your request.");
    }
  }

  async function fetchStoredSubscription() {
    view = "loading";
    const token = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!token) {
      view = "login";
      return;
    }

    try {
      const response = await callAPI("fetch", { token });
      userEmail = response.email;
      view = "subscribe";
      let monitors = response.monitors || [];

      if (monitors.length > 0) {
        hasActiveSubscription = true;
        // Filter out the "_" (all monitors) marker if present
        monitors = monitors.filter((m: string) => m !== "_");
      } else {
        monitors = [];
        hasActiveSubscription = false;
      }
      savedMonitors = [...monitors];
      selectedMonitors = [...monitors];
    } catch (e) {
      view = "login";
    }
  }

  async function doLogin() {
    callingAPI = true;
    apiError = "";
    try {
      const response = await callAPI("login", { userEmail: loginEmail });
      if (response) {
        verifyToken = response.token;
        verificationCode = "";
        view = "verify_login";
      }
    } catch (e) {
      apiError = (e as Error).message;
    } finally {
      callingAPI = false;
    }
  }

  async function verifyLogin() {
    callingAPI = true;
    apiError = "";
    try {
      const response = await callAPI("verify", {
        token: verifyToken,
        code: verificationCode
      });
      if (response) {
        localStorage.setItem(LOCAL_STORAGE_KEY, response.token);
        await fetchStoredSubscription();
      }
    } catch (e) {
      apiError = (e as Error).message;
    } finally {
      callingAPI = false;
    }
  }

  async function saveSubscription() {
    callingAPI = true;
    apiError = "";
    try {
      const token = localStorage.getItem(LOCAL_STORAGE_KEY);
      await callAPI("subscribe", {
        token,
        monitors: selectedMonitors
      });
      await fetchStoredSubscription();
      open = false;
    } catch (e) {
      apiError = (e as Error).message;
    } finally {
      callingAPI = false;
    }
  }

  async function unsubscribe() {
    if (!confirm("Are you sure you want to unsubscribe?")) return;
    callingAPI = true;
    apiError = "";
    try {
      const token = localStorage.getItem(LOCAL_STORAGE_KEY);
      await callAPI("unsubscribe", { token });
      await fetchStoredSubscription();
    } catch (e) {
      apiError = (e as Error).message;
    } finally {
      callingAPI = false;
    }
  }

  function doLogout() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    loginEmail = "";
    verificationCode = "";
    verifyToken = "";
    userEmail = "";
    selectedMonitors = [];
    hasActiveSubscription = false;
    view = "login";
  }

  function toggleMonitor(tag: string) {
    if (selectedMonitors.includes(tag)) {
      selectedMonitors = selectedMonitors.filter((t) => t !== tag);
    } else {
      selectedMonitors = [...selectedMonitors, tag];
    }
  }
</script>

<Dialog.Root
  {open}
  onOpenChange={(o) => {
    if (!o) {
      // Reset to saved state when closing without saving
      selectedMonitors = [...savedMonitors];
    }
    open = o;
  }}
>
  <Dialog.Overlay class="backdrop-blur-[2px]" />
  <Dialog.Content class="rounded-3xl sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Manage Subscription</Dialog.Title>
      <Dialog.Description>
        {#if view === "login"}
          Enter your email to log in. If you are not subscribed, you will be prompted to subscribe.
        {:else if view === "verify_login"}
          We have sent a code to your email. Please enter it below to confirm your login.
        {:else if view === "subscribe"}
          Select the monitors you want to receive updates for.
        {:else}
          Loading...
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-4">
      {#if view === "loading"}
        <div class="flex h-20 items-center justify-center">
          <Spinner />
        </div>
      {/if}

      {#if view === "login"}
        <div class="flex flex-col gap-2">
          <Input
            type="email"
            placeholder="Enter your email"
            bind:value={loginEmail}
            onkeydown={(e) => e.key === "Enter" && loginEmail && doLogin()}
          />
        </div>
        {#if apiError}
          <p class="text-destructive text-sm">{apiError}</p>
        {/if}
      {/if}

      {#if view === "verify_login"}
        <div class="flex flex-col gap-2">
          <div>
            <Button variant="outline" class="rounded-btn  " size="sm" onclick={() => (view = "login")}>
              <ChevronLeft class="h-4 w-4" />
              Change Email
            </Button>
          </div>
          <Input
            type="text"
            placeholder="Enter the code"
            bind:value={verificationCode}
            onkeydown={(e) => e.key === "Enter" && verificationCode && verifyLogin()}
          />
        </div>
        {#if apiError}
          <p class="text-destructive text-sm">{apiError}</p>
        {/if}
      {/if}

      {#if view === "subscribe"}
        {#if userEmail}
          <div class="text-muted-foreground flex items-center justify-between text-sm">
            <span>Logged in as <strong>{userEmail}</strong></span>
            <Button variant="secondary" size="icon-sm" class="rounded-btn h-8 w-8" onclick={doLogout}>
              <LogOut class="" />
            </Button>
          </div>
        {/if}

        {#if monitors.length > 0}
          <div class="text-muted-foreground text-sm">Select the monitors you want to receive updates from.</div>
          <div class="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {#each monitors as monitor}
              <div class="flex items-center justify-between gap-2 border-b pb-2 last:border-0">
                <label for={monitor.tag} class="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <Avatar.Root class="size-4">
                    <Avatar.Image src={monitor.image} />
                    <Avatar.Fallback>
                      {monitor.name.charAt(0).toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  {monitor.name}
                </label>
                <Switch
                  id={monitor.tag}
                  checked={selectedMonitors.includes(monitor.tag)}
                  onCheckedChange={() => toggleMonitor(monitor.tag)}
                />
              </div>
            {/each}
          </div>
        {/if}

        {#if apiError}
          <p class="text-destructive text-sm">{apiError}</p>
        {/if}
      {/if}
    </div>

    <Dialog.Footer class="flex-col gap-2 sm:flex-row">
      {#if view === "login"}
        <div class="flex w-full justify-end">
          <Button disabled={callingAPI || !loginEmail} class="rounded-btn" onclick={doLogin}>
            Login
            {#if callingAPI}
              <Loader class="h-4 w-4 animate-spin" />
            {/if}
          </Button>
        </div>
      {/if}

      {#if view === "verify_login"}
        <Button disabled={callingAPI || !verificationCode} class="rounded-btn" onclick={verifyLogin}>
          Confirm Login
          {#if callingAPI}
            <Loader class="h-4 w-4 animate-spin" />
          {/if}
        </Button>
      {/if}

      {#if view === "subscribe"}
        <Button disabled={callingAPI} class="rounded-btn" onclick={saveSubscription}>
          {hasActiveSubscription ? "Update Preferences" : "Save Preferences"}
          {#if callingAPI}
            <Loader class="h-4 w-4 animate-spin" />
          {/if}
        </Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

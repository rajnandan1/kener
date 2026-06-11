<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as InputOTP from "$lib/components/ui/input-otp/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  import Mail from "@lucide/svelte/icons/mail";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import LogOut from "@lucide/svelte/icons/log-out";
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import Bell from "@lucide/svelte/icons/bell";
  import Activity from "@lucide/svelte/icons/activity";
  import { t } from "$lib/stores/i18n";
  import trackEvent from "$lib/beacon";
  import ICONS from "$lib/icons";

  interface Props {
    compact?: boolean;
  }

  let { compact = false }: Props = $props();
  let open = $state(false);

  const STORAGE_KEY = "subscriber_token";

  type View = "loading" | "login" | "otp" | "preferences" | "error";
  let currentView = $state<View>("loading");
  let isSubmitting = $state(false);
  let errorMessage = $state("");

  let email = $state("");
  let otpValue = $state("");

  // Preferences data
  let subscriberEmail = $state("");

  // Monitor selection (the core subscription model)
  interface MonitorOption { tag: string; name: string }
  let monitorsList = $state<MonitorOption[]>([]);
  let loadingMonitors = $state(false);
  let selectedMonitorTags = $state<string[]>([]);
  let monitorSearch = $state("");

  let filteredMonitors = $derived(
    monitorsList.filter((m) => m.name.toLowerCase().includes(monitorSearch.toLowerCase()) || m.tag.toLowerCase().includes(monitorSearch.toLowerCase()))
  );

  // Track whether user has any active subscriptions at all
  let hasActiveSubscriptions = $state(false);
  let subscriptionsEnabled = $state(false);

  onMount(() => {
    checkExistingToken();
  });

  $effect(() => {
    if (open) {
      checkExistingToken();
    }
  });

  async function checkExistingToken() {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      currentView = "login";
      return;
    }

    currentView = "loading";
    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/subscription"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getPreferences", token })
      });

      if (!response.ok) {
        localStorage.removeItem(STORAGE_KEY);
        currentView = "login";
        return;
      }

      const data = await response.json();
      subscriberEmail = data.email || "";

      // Load monitor tags from incidents subscription
      const tags = data.incidentsMonitorTags || data.monitorsMonitorTags || [];
      selectedMonitorTags = tags;

      // Has active subs and overall feature enabled
      hasActiveSubscriptions = data.subscriptions?.incidents || data.subscriptions?.maintenances || data.subscriptions?.monitors || false;
      subscriptionsEnabled = data.availableSubscriptions?.incidents || data.availableSubscriptions?.maintenances || data.availableSubscriptions?.monitors || false;

      // Fetch monitors list
      fetchMonitorsList();

      currentView = "preferences";
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      currentView = "login";
    }
  }

  async function fetchMonitorsList() {
    loadingMonitors = true;
    try {
      const res = await fetch(clientResolver(resolve, "/dashboard-apis/subscription"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getAvailableMonitors" })
      });
      if (res.ok) {
        monitorsList = await res.json();
      }
    } catch {
      // silently fail
    } finally {
      loadingMonitors = false;
    }
  }

  async function handleLogin() {
    if (!email.trim()) {
      errorMessage = $t("Please enter a valid email address");
      return;
    }

    isSubmitting = true;
    errorMessage = "";

    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/subscription"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: email.trim() })
      });

      if (!response.ok) {
        errorMessage = $t("Failed to send verification code");
        return;
      }

      trackEvent("subscribe_login_sent", { source: "subscribe_menu" });

      currentView = "otp";
      otpValue = "";
    } catch {
      errorMessage = $t("Network error. Please try again.");
    } finally {
      isSubmitting = false;
    }
  }

  async function handleVerifyOTP() {
    if (otpValue.length !== 6) {
      errorMessage = $t("Please enter the 6-digit verification code");
      return;
    }

    isSubmitting = true;
    errorMessage = "";

    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/subscription"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: email.trim(), code: otpValue })
      });

      if (!response.ok) {
        errorMessage = $t("Verification failed");
        return;
      }

      const data = await response.json();
      localStorage.setItem(STORAGE_KEY, data.token);
      trackEvent("subscribe_otp_verified", { source: "subscribe_menu" });
      await checkExistingToken();
    } catch {
      errorMessage = $t("Network error. Please try again.");
    } finally {
      isSubmitting = false;
    }
  }

  function toggleMonitorTag(tag: string) {
    if (selectedMonitorTags.includes(tag)) {
      selectedMonitorTags = selectedMonitorTags.filter((t) => t !== tag);
    } else {
      selectedMonitorTags = [...selectedMonitorTags, tag];
    }
  }

  async function saveMonitorSelection() {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      currentView = "login";
      return;
    }

    isSubmitting = true;
    errorMessage = "";

    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/subscription"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePreferences",
          token,
          incidents: true,
          maintenances: true,
          monitors: true,
          incidentsMonitorTags: selectedMonitorTags,
          maintenancesMonitorTags: selectedMonitorTags,
          monitorsMonitorTags: selectedMonitorTags
        })
      });

      if (!response.ok) {
        const data = await response.json();
        errorMessage = data.message || $t("Failed to update subscription");
        return;
      }

      hasActiveSubscriptions = true;
      trackEvent("subscribe_monitors_saved", { source: "subscribe_menu", count: selectedMonitorTags.length });
    } catch {
      errorMessage = $t("Network error. Please try again.");
    } finally {
      isSubmitting = false;
    }
  }

  async function handleUnsubscribeAll() {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      currentView = "login";
      return;
    }

    isSubmitting = true;
    errorMessage = "";

    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/subscription"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePreferences",
          token,
          incidents: false,
          maintenances: false,
          monitors: false
        })
      });

      if (!response.ok) {
        const data = await response.json();
        errorMessage = data.message || $t("Failed to unsubscribe");
        return;
      }

      hasActiveSubscriptions = false;
      selectedMonitorTags = [];
      trackEvent("subscribe_unsubscribed", { source: "subscribe_menu" });
    } catch {
      errorMessage = $t("Network error. Please try again.");
    } finally {
      isSubmitting = false;
    }
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    email = "";
    otpValue = "";
    subscriberEmail = "";
    selectedMonitorTags = [];
    hasActiveSubscriptions = false;
    errorMessage = "";
    currentView = "login";
    trackEvent("subscribe_logout", { source: "subscribe_menu" });
  }

  function handleBackToEmail() {
    currentView = "login";
    otpValue = "";
    errorMessage = "";
  }

  function handleClose() {
    open = false;
    errorMessage = "";
  }
</script>

{#if compact}
  <Button
    variant="outline"
    size="icon-sm"
    class="bg-background/80 dark:bg-background/70 border-foreground/10 rounded-full border shadow-none backdrop-blur-md"
    aria-label={$t("Subscribe")}
    onclick={() => {
      open = true;
      trackEvent("subscribe_opened", { source: "theme_plus" });
    }}
  >
    <ICONS.Bell />
  </Button>
{:else}
  <Button
    variant="outline"
    size="sm"
    class="rounded-btn bg-background/80 dark:bg-background/70 border-foreground/10 border text-xs backdrop-blur-md"
    aria-label="Subscribe"
    onclick={() => {
      open = true;
      trackEvent("subscribe_opened", { source: "theme_plus" });
    }}
  >
    <ICONS.Bell class="" />
    {$t("Subscribe")}
  </Button>
{/if}

<Dialog.Root bind:open>
  <Dialog.Overlay class="backdrop-blur-[2px]" />
  <Dialog.Content class="max-w-sm rounded-3xl">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Bell class="h-5 w-5" />
        {$t("Subscribe to Updates")}
      </Dialog.Title>
      <Dialog.Description>
        {#if currentView === "login"}
          {$t("Select the monitors you care about and get notified when they have issues.")}
        {:else if currentView === "otp"}
          {$t("Enter the verification code sent to your email.")}
        {:else if currentView === "preferences"}
          {$t("Choose which monitors to follow. You'll be notified about incidents, maintenance, and status changes affecting your selected monitors.")}
        {:else if currentView === "loading"}
          {$t("Loading your preferences...")}
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <div class="py-4">
      {#if currentView === "loading"}
        <div class="flex items-center justify-center py-8">
          <Loader2 class="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      {:else if currentView === "login"}
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <Label for="email">{$t("Email address")}</Label>
            <div class="relative">
              <Mail class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                class="pl-10"
                bind:value={email}
                disabled={isSubmitting}
                onkeydown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
          </div>

          {#if errorMessage}
            <p class="text-destructive text-sm">{errorMessage}</p>
          {/if}

          <Button onclick={handleLogin} disabled={isSubmitting} class="w-full">
            {#if isSubmitting}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {$t("Sending...")}
            {:else}
              {$t("Continue")}
            {/if}
          </Button>
        </div>
      {:else if currentView === "otp"}
        <div class="flex flex-col gap-4">
          <div class="flex flex-col items-center gap-4">
            <p class="text-muted-foreground text-center text-sm">
              {$t("We sent a 6-digit code to")} <strong class="text-foreground">{email}</strong>
            </p>

            <InputOTP.Root maxlength={6} bind:value={otpValue}>
              {#snippet children({ cells })}
                <InputOTP.Group>
                  {#each cells as cell, i (i)}
                    <InputOTP.Slot {cell} />
                  {/each}
                </InputOTP.Group>
              {/snippet}
            </InputOTP.Root>
          </div>

          {#if errorMessage}
            <p class="text-destructive text-center text-sm">{errorMessage}</p>
          {/if}

          <div class="flex gap-2">
            <Button variant="outline" onclick={handleBackToEmail} disabled={isSubmitting} class="flex-1">
              <ArrowLeft class="mr-2 h-4 w-4" />
              {$t("Back")}
            </Button>
            <Button onclick={handleVerifyOTP} disabled={isSubmitting || otpValue.length !== 6} class="flex-1">
              {#if isSubmitting}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {$t("Verifying")}...
              {:else}
                {$t("Verify")}
              {/if}
            </Button>
          </div>

          <Button variant="link" onclick={handleLogin} disabled={isSubmitting} class="text-xs">
            {$t("Didn't receive the code? Resend")}
          </Button>
        </div>
      {:else if currentView === "preferences"}
        <div class="flex flex-col gap-6">
          <!-- User info bar -->
          <div class="rounded-lg border p-4">
            <div class="flex items-center justify-between gap-2">
              <div class="flex gap-2">
                <Mail class="text-muted-foreground h-4 w-4" />
                <span class="text-sm font-medium">{subscriberEmail}</span>
              </div>
              <Button variant="ghost" size="icon-sm" onclick={handleLogout} class="rounded-btn">
                <LogOut class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- Subscription status -->
          {#if hasActiveSubscriptions}
            <div class="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <Activity class="h-4 w-4" />
              {$t("You are subscribed to")} {selectedMonitorTags.length > 0 ? selectedMonitorTags.length : $t("all")} {$t("monitor(s)")}
            </div>
          {:else}
            <div class="rounded-lg border p-3 text-sm text-muted-foreground">
              {$t("You are not currently subscribed. Select monitors below to get notified.")}
            </div>
          {/if}

          <!-- Monitor list -->
          {#if subscriptionsEnabled}
            {#if loadingMonitors}
              <div class="flex items-center justify-center py-4">
                <Loader2 class="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            {:else if monitorsList.length > 0}
              <div class="space-y-2">
                <Label class="text-xs font-medium text-muted-foreground">{$t("Select monitors to follow")}</Label>
                <Input
                  type="text"
                  placeholder={$t("Search monitors...")}
                  bind:value={monitorSearch}
                />
                <div class="max-h-48 space-y-1 overflow-y-auto rounded border p-2">
                  {#if filteredMonitors.length === 0}
                    <p class="text-muted-foreground py-2 text-center text-xs">{$t("No monitors match your search")}</p>
                  {:else}
                    {#each filteredMonitors as monitor (monitor.tag)}
                      <div class="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="mon-{monitor.tag}"
                          class="h-4 w-4 rounded border-gray-300"
                          checked={selectedMonitorTags.includes(monitor.tag)}
                          onchange={() => toggleMonitorTag(monitor.tag)}
                        />
                        <Label for="mon-{monitor.tag}" class="mb-0 text-sm cursor-pointer">{monitor.name}</Label>
                      </div>
                    {/each}
                  {/if}
                </div>
              </div>

              <p class="text-xs text-muted-foreground">
                {$t("Leave empty to follow all monitors.")}
              </p>
            {:else}
              <p class="text-sm text-muted-foreground">{$t("No monitors available to subscribe to.")}</p>
            {/if}
          {:else}
            <p class="text-sm text-muted-foreground">{$t("Subscriptions are not currently enabled.")}</p>
          {/if}

          {#if errorMessage}
            <p class="text-destructive text-sm">{errorMessage}</p>
          {/if}

          <!-- Actions -->
          {#if subscriptionsEnabled && monitorsList.length > 0}
            <div class="flex gap-2">
              <Button onclick={saveMonitorSelection} disabled={isSubmitting} class="flex-1">
                {#if isSubmitting}
                  <Loader2 class="mr-2 h-3 w-3 animate-spin" />
                {/if}
                {$t("Save")}
              </Button>
              {#if hasActiveSubscriptions}
                <Button variant="outline" onclick={handleUnsubscribeAll} disabled={isSubmitting}>
                  {$t("Unsubscribe All")}
                </Button>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>

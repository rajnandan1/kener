<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as InputOTP from "$lib/components/ui/input-otp/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  import Mail from "@lucide/svelte/icons/mail";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import LogOut from "@lucide/svelte/icons/log-out";
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import Bell from "@lucide/svelte/icons/bell";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import Wrench from "@lucide/svelte/icons/wrench";
  import { t } from "$lib/stores/i18n";
  import trackEvent from "$lib/beacon";
  import ICONS from "$lib/icons";

  interface Props {
    compact?: boolean;
  }

  let { compact = false }: Props = $props();
  let open = $state(false);

  const STORAGE_KEY = "subscriber_token";

  // UI States
  type View = "loading" | "login" | "otp" | "preferences" | "error";
  let currentView = $state<View>("loading");
  let isSubmitting = $state(false);
  let errorMessage = $state("");

  // Form data
  let email = $state("");
  let otpValue = $state("");

  // Preferences data
  let subscriberEmail = $state("");
  let incidentsEnabled = $state(false);
  let maintenancesEnabled = $state(false);
  let availableSubscriptions = $state<{ incidents: boolean; maintenances: boolean }>({
    incidents: false,
    maintenances: false
  });

  // Check token on mount
  onMount(() => {
    checkExistingToken();
  });

  // Also check when dialog opens
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
        // Token invalid or expired
        localStorage.removeItem(STORAGE_KEY);
        currentView = "login";
        return;
      }

      const data = await response.json();
      subscriberEmail = data.email || "";
      incidentsEnabled = data.subscriptions?.incidents || false;
      maintenancesEnabled = data.subscriptions?.maintenances || false;
      availableSubscriptions = data.availableSubscriptions || { incidents: false, maintenances: false };
      currentView = "preferences";
    } catch (err) {
      localStorage.removeItem(STORAGE_KEY);
      currentView = "login";
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
        const data = await response.json();
        errorMessage = $t("Failed to send verification code");
        return;
      }

      trackEvent("subscribe_login_sent", { source: "subscribe_menu" });

      currentView = "otp";
      otpValue = "";
    } catch (err) {
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
        const data = await response.json();
        errorMessage = $t("Verification failed");
        return;
      }

      const data = await response.json();
      localStorage.setItem(STORAGE_KEY, data.token);
      trackEvent("subscribe_otp_verified", { source: "subscribe_menu" });
      await checkExistingToken();
    } catch (err) {
      errorMessage = $t("Network error. Please try again.");
    } finally {
      isSubmitting = false;
    }
  }

  async function handlePreferenceChange(type: "incidents" | "maintenances", value: boolean) {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      currentView = "login";
      return;
    }

    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/subscription"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePreferences",
          token,
          [type]: value
        })
      });

      if (!response.ok) {
        const data = await response.json();
        errorMessage = $t("Failed to update preference");
        // Revert the toggle
        if (type === "incidents") {
          incidentsEnabled = !value;
        } else {
          maintenancesEnabled = !value;
        }
        return;
      }

      // Update local state
      if (type === "incidents") {
        incidentsEnabled = value;
      } else {
        maintenancesEnabled = value;
      }

      trackEvent("subscribe_pref_toggled", { source: "subscribe_menu", type, value });
    } catch (err) {
      errorMessage = $t("Network error. Please try again.");
      // Revert the toggle
      if (type === "incidents") {
        incidentsEnabled = !value;
      } else {
        maintenancesEnabled = !value;
      }
    }
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    email = "";
    otpValue = "";
    subscriberEmail = "";
    incidentsEnabled = false;
    maintenancesEnabled = false;
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

<!--
  Subscribe trigger button. Console-style secondary: h-8 rounded-lg,
  zinc-800 border over zinc-950/60, 13 px leading-none text. The
  compact variant collapses to a square icon-only version at the same
  height so it reads as a sibling of the profile / theme chips used
  elsewhere in the header.
-->
{#if compact}
  <Button
    variant="outline"
    size="icon-sm"
    class="size-8 cursor-pointer rounded-lg border-zinc-800 bg-zinc-950/60 text-zinc-300 shadow-none hover:bg-zinc-900 hover:text-zinc-100"
    aria-label={$t("Subscribe")}
    onclick={() => {
      open = true;
      trackEvent("subscribe_opened", { source: "theme_plus" });
    }}
  >
    <ICONS.Bell class="size-3.5" />
  </Button>
{:else}
  <Button
    variant="outline"
    size="sm"
    class="h-8 cursor-pointer rounded-lg border-zinc-800 bg-zinc-950/60 px-2.5 text-[13px] font-medium leading-none text-zinc-300 shadow-none hover:bg-zinc-900 hover:text-zinc-100"
    aria-label="Subscribe"
    onclick={() => {
      open = true;
      trackEvent("subscribe_opened", { source: "theme_plus" });
    }}
  >
    <ICONS.Bell class="size-3.5" />
    {$t("Subscribe")}
  </Button>
{/if}

<!--
  Subscribe dialog.

  Structured to match the Console's `Dialog` primitive (see
  `apps/web/src/lib/ui/components/dialog.component.svelte`) pixel-for-
  pixel: header `px-6 pt-5 pb-4` with a 15 px medium title and a 13 px
  zinc-400 description, body `px-6 py-3`, footer `px-6 pt-4 pb-5`. The
  shadcn Dialog.Content wrapper's default `p-6 gap-4` is overridden
  with `!p-0 !gap-0` so we own the rhythm entirely.

  The X close button is inherited from the shared dialog primitive
  (`dialog-content.svelte`) and already matches the Console's
  `IconX size={14}` in a `size-7 rounded-lg` hover chip.
-->
<Dialog.Root bind:open>
  <Dialog.Overlay class="backdrop-blur-[2px]" />
  <Dialog.Content class="max-w-md gap-0! overflow-hidden border-zinc-800! p-0!">
    <!-- Header: Console rhythm (px-6 pt-5 pb-4, title 15px/-0.01em, description 13px) -->
    <div class="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
      <Dialog.Header class="gap-1! text-start!">
        <Dialog.Title class="inline-flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em] text-zinc-50!">
          <Bell class="size-4 shrink-0 text-zinc-400" />
          {$t("Subscribe to Updates")}
        </Dialog.Title>
        <Dialog.Description class="text-[13px] leading-5 text-zinc-400!">
          {#if currentView === "login"}
            {$t("Get notified about incidents and scheduled maintenance.")}
          {:else if currentView === "otp"}
            {$t("Enter the verification code sent to your email.")}
          {:else if currentView === "preferences"}
            {$t("Manage your notification preferences.")}
          {:else if currentView === "loading"}
            {$t("Loading your preferences...")}
          {/if}
        </Dialog.Description>
      </Dialog.Header>
    </div>

    <!-- Body: Console rhythm (px-6 py-3) -->
    <div class="px-6 py-3">
      {#if currentView === "loading"}
        <div class="flex items-center justify-center py-8">
          <Loader2 class="size-6 animate-spin text-zinc-500" />
        </div>
      {:else if currentView === "login"}
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-1.5">
            <Label for="email" class="text-sm font-medium text-zinc-300">{$t("Email address")}</Label>
            <div class="relative">
              <Mail class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                class="h-9 rounded-lg border-zinc-800 bg-zinc-950/90 pl-10 text-sm text-zinc-100 placeholder:text-zinc-500"
                bind:value={email}
                disabled={isSubmitting}
                onkeydown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
          </div>

          {#if errorMessage}
            <p class="text-[13px] text-red-400">{errorMessage}</p>
          {/if}
        </div>
      {:else if currentView === "otp"}
        <div class="flex flex-col gap-3">
          <div class="flex flex-col items-center gap-4">
            <p class="text-center text-[13px] text-zinc-400">
              {$t("We sent a 6-digit code to")} <strong class="text-zinc-100">{email}</strong>
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
            <p class="text-center text-[13px] text-red-400">{errorMessage}</p>
          {/if}
        </div>
      {:else if currentView === "preferences"}
        <div class="flex flex-col gap-4">
          <!-- Signed-in email chip — Console card rhythm -->
          <div class="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2">
                <Mail class="size-4 shrink-0 text-zinc-500" />
                <span class="truncate text-[13px] font-medium text-zinc-200">{subscriberEmail}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onclick={handleLogout}
                class="size-7 shrink-0 rounded-lg text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-100"
                aria-label={$t("Sign out")}
              >
                <LogOut class="size-3.5" />
              </Button>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            {#if availableSubscriptions.incidents}
              <div class="flex items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-3">
                  <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                    <AlertTriangle class="size-4" />
                  </div>
                  <div class="min-w-0">
                    <Label class="text-[13px] font-medium text-zinc-100">{$t("Incident Updates")}</Label>
                    <p class="text-[11px] text-zinc-500">{$t("Get notified about incidents updates")}</p>
                  </div>
                </div>
                <Switch
                  checked={incidentsEnabled}
                  onCheckedChange={(value) => handlePreferenceChange("incidents", value)}
                />
              </div>
            {/if}

            {#if availableSubscriptions.maintenances}
              <div class="flex items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-3">
                  <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
                    <Wrench class="size-4" />
                  </div>
                  <div class="min-w-0">
                    <Label class="text-[13px] font-medium text-zinc-100">{$t("Maintenance Updates")}</Label>
                    <p class="text-[11px] text-zinc-500">{$t("Get notified about scheduled maintenance")}</p>
                  </div>
                </div>
                <Switch
                  checked={maintenancesEnabled}
                  onCheckedChange={(value) => handlePreferenceChange("maintenances", value)}
                />
              </div>
            {/if}
          </div>

          {#if errorMessage}
            <p class="text-[13px] text-red-400">{errorMessage}</p>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Footer: Console rhythm (px-6 pt-4 pb-5, h-8 rounded-lg buttons) -->
    {#if currentView === "login"}
      <div class="flex justify-end gap-2 px-6 pt-4 pb-5">
        <Button
          onclick={handleLogin}
          disabled={isSubmitting}
          class="h-8 w-full rounded-lg bg-blue-600 px-2.5 text-[13px] font-medium leading-none text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {#if isSubmitting}
            <Loader2 class="mr-2 size-4 animate-spin" />
            {$t("Sending...")}
          {:else}
            {$t("Continue")}
          {/if}
        </Button>
      </div>
    {:else if currentView === "otp"}
      <div class="flex flex-col gap-2 px-6 pt-4 pb-5">
        <div class="flex gap-2">
          <Button
            variant="outline"
            onclick={handleBackToEmail}
            disabled={isSubmitting}
            class="h-8 flex-1 rounded-lg border-zinc-800 bg-transparent px-2.5 text-[13px] font-medium leading-none text-zinc-200 hover:bg-zinc-800/60"
          >
            <ArrowLeft class="mr-1.5 size-3.5" />
            {$t("Back")}
          </Button>
          <Button
            onclick={handleVerifyOTP}
            disabled={isSubmitting || otpValue.length !== 6}
            class="h-8 flex-1 rounded-lg bg-blue-600 px-2.5 text-[13px] font-medium leading-none text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {#if isSubmitting}
              <Loader2 class="mr-2 size-4 animate-spin" />
              {$t("Verifying")}...
            {:else}
              {$t("Verify")}
            {/if}
          </Button>
        </div>
        <Button
          variant="link"
          onclick={handleLogin}
          disabled={isSubmitting}
          class="h-auto text-[11px] font-medium text-zinc-500 hover:text-zinc-200"
        >
          {$t("Didn't receive the code? Resend")}
        </Button>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>

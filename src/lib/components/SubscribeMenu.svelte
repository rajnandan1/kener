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
  import { t } from "$lib/stores/i18n";
  import trackEvent from "$lib/beacon";
  import ICONS from "$lib/icons";
  import Captcha from "./Captcha.svelte";
  import MonitorSubscriptionPicker from "./MonitorSubscriptionPicker.svelte";

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
  let captchaRequired = $state(false);
  let captchaToken = $state<string | null>(null);
  let captchaRef: { reset: () => void } | undefined = $state();

  // Preferences data
  let subscriberEmail = $state("");
  let subscribedMonitors = $state<string[]>([]);
  let availableMonitors = $state<Array<{ tag: string; name: string }>>([]);

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

      // Only a rejected token means signing in again. Any other failure (the server restarting, an
      // error, a dropped connection) keeps the sign-in and offers to try again.
      if (response.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        currentView = "login";
        return;
      }
      if (!response.ok) {
        errorMessage = $t("Could not load your preferences. Please try again.");
        currentView = "error";
        return;
      }

      const data = await response.json();
      subscriberEmail = data.email || "";
      subscribedMonitors = data.monitors || [];
      availableMonitors = data.availableMonitors || [];
      errorMessage = "";
      currentView = "preferences";
    } catch (err) {
      errorMessage = $t("Network error. Please try again.");
      currentView = "error";
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
        body: JSON.stringify({ action: "login", email: email.trim(), captchaToken })
      });

      if (!response.ok) {
        const data = await response.json();
        errorMessage = data?.message || $t("Failed to send verification code");
        captchaToken = null;
        captchaRef?.reset();
        return;
      }

      trackEvent("subscribe_login_sent", { source: "subscribe_menu" });

      // The token is single-use and has now been consumed by the provider
      // regardless of which UI path sent it -- clear it so nothing can
      // accidentally resubmit it later.
      captchaToken = null;
      currentView = "otp";
      otpValue = "";
    } catch (err) {
      errorMessage = $t("Network error. Please try again.");
    } finally {
      isSubmitting = false;
    }
  }

  function handleResend() {
    if (captchaRequired) {
      // The OTP view has no captcha widget to produce a fresh token, and
      // the one from the original submission is already consumed -- send
      // the user back to solve a new challenge instead of silently
      // replaying a token the provider will reject.
      handleBackToEmail();
      return;
    }
    handleLogin();
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

  async function handleMonitorsChange(changes: Record<string, boolean>) {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      currentView = "login";
      return;
    }
    if (Object.keys(changes).length === 0) return;

    // Show the change at once; put the previous selection back if saving fails.
    const previous = subscribedMonitors;
    subscribedMonitors = [
      ...previous.filter((tag) => changes[tag] !== false),
      ...Object.keys(changes).filter((tag) => changes[tag] && !previous.includes(tag))
    ];
    errorMessage = "";

    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/subscription"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updatePreferences", token, monitors: changes })
      });

      if (response.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        subscribedMonitors = previous;
        currentView = "login";
        return;
      }
      if (!response.ok) {
        errorMessage = $t("Failed to update preference");
        subscribedMonitors = previous;
        return;
      }

      const data = await response.json();
      subscribedMonitors = data.monitors || subscribedMonitors;
      trackEvent("subscribe_monitors_changed", { source: "subscribe_menu", count: Object.keys(changes).length });
    } catch (err) {
      errorMessage = $t("Network error. Please try again.");
      subscribedMonitors = previous;
    }
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    email = "";
    otpValue = "";
    subscriberEmail = "";
    subscribedMonitors = [];
    availableMonitors = [];
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

  // Google reCAPTCHA's expanded image-challenge renders as a second iframe
  // appended outside this Dialog's own DOM subtree (unlike the basic
  // checkbox, which nests inside it). Bits UI's outside-interaction
  // detection sees clicks/focus landing on that iframe as "outside" and
  // dismisses the dialog, orphaning the still-open challenge. Any outside
  // interaction targeting an iframe is treated as captcha-challenge traffic
  // and kept open — nothing else in this dialog renders a bare iframe.
  function ignoreCaptchaIframeInteraction(event: PointerEvent | FocusEvent) {
    if (event.target instanceof HTMLIFrameElement) {
      event.preventDefault();
    }
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
  <Dialog.Content
    class="max-h-[90dvh] max-w-sm overflow-y-auto rounded-3xl"
    onInteractOutside={ignoreCaptchaIframeInteraction}
    onFocusOutside={ignoreCaptchaIframeInteraction}
  >
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Bell class="h-5 w-5" />
        {$t("Subscribe to Updates")}
      </Dialog.Title>
      <Dialog.Description>
        {#if currentView === "login"}
          {$t("Get email updates about the monitors you choose.")}
        {:else if currentView === "otp"}
          {$t("Enter the verification code sent to your email.")}
        {:else if currentView === "preferences" || currentView === "error"}
          {$t("Choose the monitors you want to hear about.")}
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
      {:else if currentView === "error"}
        <!-- Still signed in: the preferences did not load this time -->
        <div class="flex flex-col items-center gap-4 py-4">
          <p class="text-destructive text-center text-sm">{errorMessage}</p>
          <div class="flex w-full gap-2">
            <Button variant="outline" onclick={handleLogout} class="flex-1">
              {$t("Use another email")}
            </Button>
            <Button onclick={checkExistingToken} class="flex-1">
              {$t("Retry")}
            </Button>
          </div>
        </div>
      {:else if currentView === "login"}
        <!-- Login View -->
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

          <Captcha
            bind:this={captchaRef}
            onReady={(required) => (captchaRequired = required)}
            onVerify={(token) => (captchaToken = token)}
          />

          {#if errorMessage}
            <p class="text-destructive text-sm">{errorMessage}</p>
          {/if}

          <Button onclick={handleLogin} disabled={isSubmitting || (captchaRequired && !captchaToken)} class="w-full">
            {#if isSubmitting}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {$t("Sending...")}
            {:else}
              {$t("Continue")}
            {/if}
          </Button>
        </div>
      {:else if currentView === "otp"}
        <!-- OTP View -->
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

          <Button variant="link" onclick={handleResend} disabled={isSubmitting} class="text-xs">
            {$t("Didn't receive the code? Resend")}
          </Button>
        </div>
      {:else if currentView === "preferences"}
        <!-- Preferences View -->
        <div class="flex flex-col gap-4">
          <div class="rounded-lg border px-4 py-3">
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

          <div class="flex flex-col gap-2">
            <p class="text-muted-foreground text-xs">
              {$t("You get an email when a chosen monitor changes status or is part of an incident or maintenance.")}
            </p>
            <MonitorSubscriptionPicker
              monitors={availableMonitors}
              selected={subscribedMonitors}
              onChange={handleMonitorsChange}
            />
          </div>

          {#if errorMessage}
            <p class="text-destructive text-sm">{errorMessage}</p>
          {/if}
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>

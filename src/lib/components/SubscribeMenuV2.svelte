<script lang="ts">
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import * as InputOTP from "$lib/components/ui/input-otp";
  import * as Sheet from "$lib/components/ui/sheet/index.js";

  import Bell from "@lucide/svelte/icons/bell";
  import Mail from "@lucide/svelte/icons/mail";
  import Webhook from "@lucide/svelte/icons/webhook";
  import MessageSquare from "@lucide/svelte/icons/message-square";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Plus from "@lucide/svelte/icons/plus";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import LoaderCircle from "@lucide/svelte/icons/loader-circle";
  import MessageCircleWarning from "@lucide/svelte/icons/message-circle-warning";
  import CircleCheckBig from "@lucide/svelte/icons/circle-check-big";
  import LogOut from "@lucide/svelte/icons/log-out";
  import Activity from "@lucide/svelte/icons/activity";
  import Wrench from "@lucide/svelte/icons/wrench";
  import Check from "@lucide/svelte/icons/check";

  import { resolve } from "$app/paths";
  import GMI from "$lib/components/gmi.svelte";
  import SquareChartGantt from "lucide-svelte/icons/square-chart-gantt";

  interface SubscriptionConfig {
    enabled: boolean;
    events_enabled: {
      incidentUpdatesAll: boolean;
      maintenanceUpdatesAll: boolean;
      monitorUpdatesAll: boolean;
    };
    methods_enabled: {
      email: boolean;
      webhook: boolean;
      slack: boolean;
      discord: boolean;
    };
  }

  interface SubscriberMethod {
    id: number;
    method_type: "email" | "webhook" | "slack" | "discord";
    method_value: string;
    status: string;
    created_at: string;
  }

  interface Subscription {
    id: number;
    event_type: "incidentUpdatesAll" | "maintenanceUpdatesAll" | "monitorUpdatesAll";
    entity_type: "monitor" | "incident" | "maintenance" | null;
    entity_id: string | null;
    method: {
      id: number;
      method_type: string;
      method_value: string;
    };
    created_at: string;
  }

  interface MonitorInfo {
    tag: string;
    name: string;
    image?: string | null;
  }

  interface IncidentInfo {
    id: string;
    title: string;
  }

  interface MaintenanceInfo {
    id: string;
    title: string;
  }

  type Step = "loading" | "login" | "verify" | "dashboard" | "add-method" | "select-items";

  // Props
  interface Props {
    open: boolean;
    monitor_tags?: string[];
    incident_ids?: string[];
    maintenance_ids?: string[];
  }
  let { open = $bindable(false), monitor_tags = [], incident_ids = [], maintenance_ids = [] }: Props = $props();
  const base = resolve("/");
  // State
  let step = $state<Step>("loading");
  let config = $state<SubscriptionConfig | null>(null);
  let error = $state("");
  let loading = $state(false);
  let success = $state("");

  // Login state
  let email = $state("");
  let verificationToken = $state("");
  let verificationCode = $state("");

  // Auth state
  let authToken = $state("");
  let userEmail = $state("");
  let methods = $state<SubscriberMethod[]>([]);
  let subscriptions = $state<Subscription[]>([]);

  // Add method state
  let newMethodType = $state<"webhook" | "slack" | "discord">("webhook");
  let newMethodValue = $state("");

  // Select items state - which method we're configuring
  let selectedMethod = $state<SubscriberMethod | null>(null);
  let selectedMonitorTags = $state<string[]>([]);
  let selectedIncidentIds = $state<string[]>([]);
  let selectedMaintenanceIds = $state<string[]>([]);

  // Fetched entity info
  let monitors = $state<MonitorInfo[]>([]);
  let incidents = $state<IncidentInfo[]>([]);
  let maintenances = $state<MaintenanceInfo[]>([]);

  // Fetch monitors info
  async function fetchMonitors() {
    if (monitor_tags.length === 0) return;
    try {
      const response = await fetch(`${base}dashboard-apis/monitor-tags?tags=${monitor_tags.join(",")}`);
      if (response.ok) {
        monitors = await response.json();
        //console.log(">>>>>>----  SubscribeMenuV2:129 ", monitors);
      }
    } catch (e) {
      console.error("Failed to fetch monitors:", e);
    }
  }

  // Fetch incidents info
  async function fetchIncidents() {
    if (incident_ids.length === 0) return;
    try {
      const response = await fetch(`${base}dashboard-apis/incident-info?ids=${incident_ids.join(",")}`);
      if (response.ok) {
        incidents = await response.json();
      }
    } catch (e) {
      console.error("Failed to fetch incidents:", e);
    }
  }

  // Fetch maintenances info
  async function fetchMaintenances() {
    if (maintenance_ids.length === 0) return;
    try {
      const response = await fetch(`${base}dashboard-apis/maintenance-info?ids=${maintenance_ids.join(",")}`);
      if (response.ok) {
        maintenances = await response.json();
      }
    } catch (e) {
      console.error("Failed to fetch maintenances:", e);
    }
  }

  // Handle login
  async function handleLogin() {
    if (!email.trim()) {
      error = "Please enter your email";
      return;
    }

    loading = true;
    error = "";

    try {
      const res = await fetch(`${base}dashboard-apis/subscription-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: email.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      verificationToken = data.token;
      step = "verify";
      success = "Verification code sent to your email";
    } catch (e) {
      error = e instanceof Error ? e.message : "Login failed";
    } finally {
      loading = false;
    }
  }

  // Handle verification
  async function handleVerify() {
    if (verificationCode.length !== 6) {
      error = "Please enter the 6-digit code";
      return;
    }

    loading = true;
    error = "";
    success = "";

    try {
      const res = await fetch(`${base}dashboard-apis/subscription-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          token: verificationToken,
          code: verificationCode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Verification failed");
      }

      authToken = data.token;
      localStorage.setItem("kener_subscription_token", data.token);
      await fetchUserData();
    } catch (e) {
      error = e instanceof Error ? e.message : "Verification failed";
    } finally {
      loading = false;
    }
  }

  // Fetch user data
  async function fetchUserData() {
    loading = true;
    error = "";

    try {
      // Fetch user profile
      const userRes = await fetch(`${base}dashboard-apis/subscription-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetchUser", token: authToken })
      });

      if (!userRes.ok) {
        const data = await userRes.json();
        if (userRes.status === 401) {
          // Token expired, clear and go to login
          localStorage.removeItem("kener_subscription_token");
          authToken = "";
          step = "login";
          return;
        }
        throw new Error(data.message || "Failed to fetch user");
      }

      const userData = await userRes.json();
      userEmail = userData.user.email;
      methods = userData.methods;

      // Fetch subscriptions
      const subRes = await fetch(`${base}dashboard-apis/subscription-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetchSubscriptions", token: authToken })
      });

      if (subRes.ok) {
        const subData = await subRes.json();
        subscriptions = subData.subscriptions;
      }

      step = "dashboard";
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load data";
      step = "login";
    } finally {
      loading = false;
    }
  }

  // Add notification method
  async function handleAddMethod() {
    if (!newMethodValue.trim()) {
      error = "Please enter a URL";
      return;
    }

    loading = true;
    error = "";

    try {
      const res = await fetch(`${base}dashboard-apis/subscription-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addMethod",
          token: authToken,
          method_type: newMethodType,
          method_value: newMethodValue.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add method");
      }

      methods = [...methods, data.method];
      newMethodValue = "";
      step = "dashboard";
      success = "Notification method added";
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to add method";
    } finally {
      loading = false;
    }
  }

  // Remove notification method
  async function handleRemoveMethod(methodId: number) {
    if (!confirm("Remove this notification method? Any subscriptions using it will be deleted.")) {
      return;
    }

    loading = true;
    error = "";

    try {
      const res = await fetch(`${base}dashboard-apis/subscription-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "removeMethod",
          token: authToken,
          method_id: methodId
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove method");
      }

      methods = methods.filter((m) => m.id !== methodId);
      subscriptions = subscriptions.filter((s) => s.method.id !== methodId);
      success = "Method removed";
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to remove method";
    } finally {
      loading = false;
    }
  }

  // Open select items for a method
  function openSelectItems(method: SubscriberMethod) {
    selectedMethod = method;
    error = "";
    success = "";

    // Pre-populate selections based on existing subscriptions for this method
    const methodSubs = subscriptions.filter((s) => s.method.id === method.id);
    selectedMonitorTags = methodSubs
      .filter((s) => s.entity_type === "monitor" && s.entity_id)
      .map((s) => s.entity_id as string);
    selectedIncidentIds = methodSubs
      .filter((s) => s.entity_type === "incident" && s.entity_id)
      .map((s) => s.entity_id as string);
    selectedMaintenanceIds = methodSubs
      .filter((s) => s.entity_type === "maintenance" && s.entity_id)
      .map((s) => s.entity_id as string);

    step = "select-items";
  }

  // Toggle monitor selection
  function toggleMonitor(tag: string) {
    if (selectedMonitorTags.includes(tag)) {
      selectedMonitorTags = selectedMonitorTags.filter((t) => t !== tag);
    } else {
      selectedMonitorTags = [...selectedMonitorTags, tag];
    }
  }

  // Toggle incident selection
  function toggleIncident(id: string) {
    if (selectedIncidentIds.includes(id)) {
      selectedIncidentIds = selectedIncidentIds.filter((i) => i !== id);
    } else {
      selectedIncidentIds = [...selectedIncidentIds, id];
    }
  }

  // Toggle maintenance selection
  function toggleMaintenance(id: string) {
    if (selectedMaintenanceIds.includes(id)) {
      selectedMaintenanceIds = selectedMaintenanceIds.filter((i) => i !== id);
    } else {
      selectedMaintenanceIds = [...selectedMaintenanceIds, id];
    }
  }

  // Save preferences - handles both subscribing and unsubscribing
  async function handleSavePreferences() {
    if (!selectedMethod) return;

    const method = selectedMethod;
    loading = true;
    error = "";

    try {
      const methodSubs = subscriptions.filter((s) => s.method.id === method.id);

      // Find items to subscribe (selected but not currently subscribed)
      const toSubscribe: Array<{
        method_id: number;
        event_type: "incidentUpdatesAll" | "maintenanceUpdatesAll" | "monitorUpdatesAll";
        entity_type: "monitor" | "incident" | "maintenance";
        entity_id: string;
      }> = [];

      // Find subscriptions to remove (currently subscribed but not selected)
      const toUnsubscribe: number[] = [];

      // Check monitors
      for (const tag of selectedMonitorTags) {
        const existing = methodSubs.find((s) => s.entity_type === "monitor" && s.entity_id === tag);
        if (!existing) {
          toSubscribe.push({
            method_id: method.id,
            event_type: "monitorUpdatesAll",
            entity_type: "monitor",
            entity_id: tag
          });
        }
      }
      for (const sub of methodSubs.filter((s) => s.entity_type === "monitor")) {
        if (sub.entity_id && !selectedMonitorTags.includes(sub.entity_id)) {
          toUnsubscribe.push(sub.id);
        }
      }

      // Check incidents
      for (const id of selectedIncidentIds) {
        const existing = methodSubs.find((s) => s.entity_type === "incident" && s.entity_id === id);
        if (!existing) {
          toSubscribe.push({
            method_id: method.id,
            event_type: "incidentUpdatesAll",
            entity_type: "incident",
            entity_id: id
          });
        }
      }
      for (const sub of methodSubs.filter((s) => s.entity_type === "incident")) {
        if (sub.entity_id && !selectedIncidentIds.includes(sub.entity_id)) {
          toUnsubscribe.push(sub.id);
        }
      }

      // Check maintenances
      for (const id of selectedMaintenanceIds) {
        const existing = methodSubs.find((s) => s.entity_type === "maintenance" && s.entity_id === id);
        if (!existing) {
          toSubscribe.push({
            method_id: method.id,
            event_type: "maintenanceUpdatesAll",
            entity_type: "maintenance",
            entity_id: id
          });
        }
      }
      for (const sub of methodSubs.filter((s) => s.entity_type === "maintenance")) {
        if (sub.entity_id && !selectedMaintenanceIds.includes(sub.entity_id)) {
          toUnsubscribe.push(sub.id);
        }
      }

      // Perform unsubscribes
      for (const subId of toUnsubscribe) {
        await fetch(`${base}dashboard-apis/subscription-v2`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unsubscribe",
            token: authToken,
            subscription_id: subId
          })
        });
      }

      // Perform subscribes
      if (toSubscribe.length > 0) {
        const res = await fetch(`${base}dashboard-apis/subscription-v2`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "subscribe",
            token: authToken,
            subscriptions: toSubscribe
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to save preferences");
        }
      }

      // Refresh subscriptions
      await fetchUserData();

      const changes = toSubscribe.length + toUnsubscribe.length;
      if (changes > 0) {
        success = "Preferences saved";
      } else {
        success = "No changes to save";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to save preferences";
    } finally {
      loading = false;
    }
  }

  // Subscribe to selected items
  async function handleSubscribeToSelected() {
    if (!selectedMethod) return;

    const subs: Array<{
      method_id: number;
      event_type: "incidentUpdatesAll" | "maintenanceUpdatesAll" | "monitorUpdatesAll";
      entity_type: "monitor" | "incident" | "maintenance";
      entity_id: string;
    }> = [];

    // Add monitor subscriptions
    for (const tag of selectedMonitorTags) {
      subs.push({
        method_id: selectedMethod.id,
        event_type: "monitorUpdatesAll",
        entity_type: "monitor",
        entity_id: tag
      });
    }

    // Add incident subscriptions
    for (const id of selectedIncidentIds) {
      subs.push({
        method_id: selectedMethod.id,
        event_type: "incidentUpdatesAll",
        entity_type: "incident",
        entity_id: id
      });
    }

    // Add maintenance subscriptions
    for (const id of selectedMaintenanceIds) {
      subs.push({
        method_id: selectedMethod.id,
        event_type: "maintenanceUpdatesAll",
        entity_type: "maintenance",
        entity_id: id
      });
    }

    if (subs.length === 0) {
      error = "Please select at least one item to subscribe to";
      return;
    }

    loading = true;
    error = "";

    try {
      const res = await fetch(`${base}dashboard-apis/subscription-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          token: authToken,
          subscriptions: subs
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to subscribe");
      }

      // Refresh subscriptions
      await fetchUserData();
      success = `Subscribed to ${subs.length} item${subs.length > 1 ? "s" : ""}`;
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to subscribe";
    } finally {
      loading = false;
    }
  }

  // Unsubscribe
  async function handleUnsubscribe(subscriptionId: number) {
    loading = true;
    error = "";

    try {
      const res = await fetch(`${base}dashboard-apis/subscription-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unsubscribe",
          token: authToken,
          subscription_id: subscriptionId
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to unsubscribe");
      }

      subscriptions = subscriptions.filter((s) => s.id !== subscriptionId);
      success = "Unsubscribed";
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to unsubscribe";
    } finally {
      loading = false;
    }
  }

  // Logout
  function handleLogout() {
    localStorage.removeItem("kener_subscription_token");
    authToken = "";
    userEmail = "";
    methods = [];
    subscriptions = [];
    email = "";
    verificationCode = "";
    step = "login";
  }

  // Delete account
  async function handleDeleteAccount() {
    if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) {
      return;
    }

    loading = true;
    error = "";

    try {
      const res = await fetch(`${base}dashboard-apis/subscription-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteAccount", token: authToken })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete account");
      }

      handleLogout();
      success = "Account deleted";
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to delete account";
    } finally {
      loading = false;
    }
  }

  // Format method type for display
  function formatMethodType(methodType: string): string {
    switch (methodType) {
      case "email":
        return "Email";
      case "webhook":
        return "Webhook";
      case "slack":
        return "Slack";
      case "discord":
        return "Discord";
      default:
        return methodType;
    }
  }

  // Get method icon
  function getMethodIcon(methodType: string) {
    switch (methodType) {
      case "email":
        return Mail;
      case "webhook":
        return Webhook;
      case "slack":
      case "discord":
        return MessageSquare;
      default:
        return Bell;
    }
  }

  // Check if already subscribed to an entity via a specific method
  function isAlreadySubscribed(methodId: number, entityType: string, entityId: string): boolean {
    return subscriptions.some(
      (s) => s.method.id === methodId && s.entity_type === entityType && s.entity_id === entityId
    );
  }

  // Format entity display
  function formatEntityDisplay(sub: Subscription): string {
    if (!sub.entity_type || !sub.entity_id) {
      return "All";
    }
    if (sub.entity_type === "monitor") {
      const monitor = monitors.find((m) => m.tag === sub.entity_id);
      return monitor ? monitor.name : sub.entity_id;
    }
    if (sub.entity_type === "incident") {
      const incident = incidents.find((i) => i.id === sub.entity_id);
      return incident ? incident.title : `Incident #${sub.entity_id}`;
    }
    if (sub.entity_type === "maintenance") {
      const maintenance = maintenances.find((m) => m.id === sub.entity_id);
      return maintenance ? maintenance.title : `Maintenance #${sub.entity_id}`;
    }
    return sub.entity_id;
  }

  // Get subscriptions for a specific method
  function getSubscriptionsForMethod(methodId: number): Subscription[] {
    return subscriptions.filter((s) => s.method.id === methodId);
  }

  // Derived: total selected items
  let totalSelected = $derived(selectedMonitorTags.length + selectedIncidentIds.length + selectedMaintenanceIds.length);

  // Derived: can subscribe to these items
  let canSubscribeToMonitors = $derived(config?.events_enabled?.monitorUpdatesAll && monitors.length > 0);
  let canSubscribeToIncidents = $derived(config?.events_enabled?.incidentUpdatesAll && incidents.length > 0);
  let canSubscribeToMaintenances = $derived(config?.events_enabled?.maintenanceUpdatesAll && maintenances.length > 0);
  let hasAnythingToSubscribe = $derived(
    canSubscribeToMonitors || canSubscribeToIncidents || canSubscribeToMaintenances
  );

  $effect(() => {
    console.log(">>>>>>----  SubscribeMenuV2:615 ", canSubscribeToMonitors);
    if (open) {
      const initializeDialog = async () => {
        step = "loading";
        error = "";

        try {
          // Fetch monitors/incidents/maintenances in parallel with config
          await Promise.all([fetchMonitors(), fetchIncidents(), fetchMaintenances()]);

          // Load config
          const configRes = await fetch(`/dashboard-apis/subscription-v2`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "getConfig" })
          });
          config = await configRes.json();
          console.log(">>>>>>----  SubscribeMenuV2:631 ", config);

          if (!config?.enabled) {
            error = "Subscriptions are not enabled";
            step = "login";
            return;
          }

          // Check for existing token
          const storedToken = localStorage.getItem("kener_subscription_token");
          if (storedToken) {
            authToken = storedToken;
            await fetchUserData();
          } else {
            step = "login";
          }
        } catch (e) {
          console.error("Init error:", e);
          error = "Failed to load configuration";
          step = "login";
        }
      };

      initializeDialog();
    }
  });
</script>

<Sheet.Root bind:open>
  <Sheet.Content side="right" class="w-[600px] max-w-[600px] sm:w-[600px] sm:max-w-[600px]">
    <Sheet.Header class="border-b">
      <Sheet.Title>
        {#if step === "select-items"}
          Configure Notifications
        {:else}
          Notifications
        {/if}
      </Sheet.Title>
      <Sheet.Description>
        {#if step === "select-items" && selectedMethod}
          Select items to receive notifications via {formatMethodType(selectedMethod.method_type)}
        {:else}
          Get notified about incidents, maintenance, and status changes
        {/if}
      </Sheet.Description>
    </Sheet.Header>
    <div class="p-4 pt-0">
      {#if error}
        <div class="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md p-3 text-sm">
          <MessageCircleWarning class="h-4 w-4 shrink-0" />
          {error}
        </div>
      {/if}

      {#if success}
        <div
          class="mb-2 flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400"
        >
          <CircleCheckBig class="h-4 w-4 shrink-0" />
          {success}
        </div>
      {/if}

      <!-- Loading -->
      {#if step === "loading"}
        <div class="flex items-center justify-center py-8">
          <LoaderCircle class="text-muted-foreground h-8 w-8 animate-spin" />
        </div>

        <!-- Login -->
      {:else if step === "login"}
        <div class="space-y-4">
          {#if !config?.enabled}
            <p class="text-muted-foreground text-sm">Subscriptions are currently disabled.</p>
          {:else}
            <div class="space-y-2">
              <Label for="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                bind:value={email}
                onkeydown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button class="w-full" onclick={handleLogin} disabled={loading}>
              {#if loading}
                <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Continue
            </Button>
          {/if}
        </div>

        <!-- Verify -->
      {:else if step === "verify"}
        <div class="space-y-4">
          <p class="text-muted-foreground text-sm">
            Enter the 6-digit code sent to <strong>{email}</strong>
          </p>
          <div class="space-y-2">
            <Label>Verification Code</Label>
            <InputOTP.Root maxlength={6} bind:value={verificationCode} onComplete={handleVerify}>
              {#snippet children({ cells })}
                <InputOTP.Group>
                  {#each cells as cell}
                    <InputOTP.Slot {cell} />
                  {/each}
                </InputOTP.Group>
              {/snippet}
            </InputOTP.Root>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" onclick={() => (step = "login")} disabled={loading}>
              <ArrowLeft class="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button class="flex-1" onclick={handleVerify} disabled={loading}>
              {#if loading}
                <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Verify
            </Button>
          </div>
        </div>

        <!-- Dashboard -->
      {:else if step === "dashboard"}
        <div class="space-y-4">
          <div class="bg-muted flex items-center justify-between rounded-md p-3">
            <div class="text-sm">
              <span class="text-muted-foreground">Signed in as</span>
              <strong class="ml-1">{userEmail}</strong>
            </div>
            <Button variant="ghost" size="sm" onclick={handleLogout}>
              <LogOut class="h-4 w-4" />
            </Button>
          </div>

          <!-- Notification Methods -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium">Notification Methods</h4>
              <Button variant="outline" size="sm" onclick={() => (step = "add-method")}>
                <Plus class="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
            <p class="text-muted-foreground text-xs">Click on a method to configure what you receive</p>
            <div class="space-y-2">
              {#each methods as method (method.id)}
                {@const Icon = getMethodIcon(method.method_type)}
                {@const methodSubs = getSubscriptionsForMethod(method.id)}
                <div class="rounded-md border">
                  <button
                    class="hover:bg-muted/50 flex w-full items-center justify-between p-3 transition-colors"
                    onclick={() => openSelectItems(method)}
                  >
                    <div class="flex items-center gap-2">
                      <Icon class="text-muted-foreground h-4 w-4" />
                      <div class="text-left">
                        <div class="text-sm font-medium">{formatMethodType(method.method_type)}</div>
                        <div class="text-muted-foreground text-xs">{method.method_value}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-muted-foreground text-xs"
                        >{methodSubs.length} subscription{methodSubs.length !== 1 ? "s" : ""}</span
                      >
                      {#if method.method_type !== "email"}
                        <Button
                          variant="ghost"
                          size="sm"
                          onclick={(e) => {
                            e.stopPropagation();
                            handleRemoveMethod(method.id);
                          }}
                          disabled={loading}
                        >
                          <Trash2 class="text-destructive h-4 w-4" />
                        </Button>
                      {/if}
                    </div>
                  </button>
                </div>
              {/each}
              {#if methods.length === 0}
                <p class="text-muted-foreground py-4 text-center text-sm">
                  No notification methods. Add one to get started.
                </p>
              {/if}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            class="text-destructive hover:text-destructive w-full"
            onclick={handleDeleteAccount}
            disabled={loading}
          >
            Delete Account
          </Button>
        </div>

        <!-- Add Method -->
      {:else if step === "add-method"}
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>Method Type</Label>
            <div class="grid grid-cols-3 gap-2">
              {#if config?.methods_enabled?.webhook}
                <Button
                  variant={newMethodType === "webhook" ? "default" : "outline"}
                  size="sm"
                  onclick={() => (newMethodType = "webhook")}
                >
                  Webhook
                </Button>
              {/if}
              {#if config?.methods_enabled?.slack}
                <Button
                  variant={newMethodType === "slack" ? "default" : "outline"}
                  size="sm"
                  onclick={() => (newMethodType = "slack")}
                >
                  Slack
                </Button>
              {/if}
              {#if config?.methods_enabled?.discord}
                <Button
                  variant={newMethodType === "discord" ? "default" : "outline"}
                  size="sm"
                  onclick={() => (newMethodType = "discord")}
                >
                  Discord
                </Button>
              {/if}
            </div>
          </div>
          <div class="space-y-2">
            <Label for="method-url">
              {newMethodType === "slack"
                ? "Slack Webhook URL"
                : newMethodType === "discord"
                  ? "Discord Webhook URL"
                  : "Webhook URL"}
            </Label>
            <Input id="method-url" type="url" placeholder="https://..." bind:value={newMethodValue} />
          </div>
          <div class="flex gap-2">
            <Button variant="outline" onclick={() => (step = "dashboard")} disabled={loading}>
              <ArrowLeft class="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button class="flex-1" onclick={handleAddMethod} disabled={loading}>
              {#if loading}
                <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Add Method
            </Button>
          </div>
        </div>

        <!-- Select Items for Method -->
      {:else if step === "select-items" && selectedMethod}
        {@const MethodIcon = getMethodIcon(selectedMethod.method_type)}
        <div class="space-y-4">
          <!-- Method info -->
          <div class="bg-muted flex items-center gap-2 rounded-md p-2">
            <MethodIcon class="text-muted-foreground h-4 w-4" />
            <span class="text-sm">{selectedMethod.method_value}</span>
          </div>

          {#if !hasAnythingToSubscribe}
            <p class="text-muted-foreground py-4 text-center text-sm">
              No items available for subscription on this page.
            </p>
          {:else}
            <!-- Monitors Section -->
            {#if canSubscribeToMonitors}
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <Activity class="text-muted-foreground h-4 w-4" />
                  <span class="text-sm font-medium">Monitors</span>
                </div>
                <div class="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {#each monitors as monitor (monitor.tag)}
                    {@const isSelected = selectedMonitorTags.includes(monitor.tag)}
                    <button
                      type="button"
                      class="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-3 rounded p-2 transition-colors"
                      onclick={() => toggleMonitor(monitor.tag)}
                    >
                      <Checkbox checked={isSelected} />
                      {#if monitor.image}
                        <img src={monitor.image} class="size-5 rounded object-cover" alt={monitor.name} />
                      {:else}
                        <SquareChartGantt class="size-5" />
                      {/if}
                      <span class="text-sm">{monitor.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Incidents Section -->
            {#if canSubscribeToIncidents}
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <MessageCircleWarning class="text-muted-foreground h-4 w-4" />
                  <span class="text-sm font-medium">Incidents</span>
                </div>
                <div class="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {#each incidents as incident (incident.id)}
                    {@const isSelected = selectedIncidentIds.includes(incident.id)}
                    <button
                      type="button"
                      class="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-3 rounded p-2 transition-colors"
                      onclick={() => toggleIncident(incident.id)}
                    >
                      <Checkbox checked={isSelected} />
                      <MessageCircleWarning class="size-5" />
                      <span class="text-sm">{incident.title}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Maintenances Section -->
            {#if canSubscribeToMaintenances}
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <Wrench class="text-muted-foreground h-4 w-4" />
                  <span class="text-sm font-medium">Scheduled Maintenance</span>
                </div>
                <div class="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {#each maintenances as maintenance (maintenance.id)}
                    {@const isSelected = selectedMaintenanceIds.includes(maintenance.id)}
                    <button
                      type="button"
                      class="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-3 rounded p-2 transition-colors"
                      onclick={() => toggleMaintenance(maintenance.id)}
                    >
                      <Checkbox checked={isSelected} />
                      <Wrench class="size-5" />
                      <span class="text-sm">{maintenance.title}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          {/if}

          <div class="flex gap-2">
            <Button variant="outline" onclick={() => (step = "dashboard")} disabled={loading}>
              <ArrowLeft class="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button class="flex-1" onclick={handleSavePreferences} disabled={loading}>
              {#if loading}
                <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Save Preferences
            </Button>
          </div>
        </div>
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>

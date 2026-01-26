<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import BellIcon from "@lucide/svelte/icons/bell";
  import MailIcon from "@lucide/svelte/icons/mail";
  import WebhookIcon from "@lucide/svelte/icons/webhook";
  import HashIcon from "@lucide/svelte/icons/hash";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import WrenchIcon from "@lucide/svelte/icons/wrench";
  import ActivityIcon from "@lucide/svelte/icons/activity";
  import SaveIcon from "@lucide/svelte/icons/save";
  import UsersIcon from "@lucide/svelte/icons/users";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import { toast } from "svelte-sonner";

  // Types
  interface EventsEnabled {
    incidentUpdatesAll: boolean;
    maintenanceUpdatesAll: boolean;
    monitorUpdatesAll: boolean;
  }

  interface MethodsEnabled {
    email: boolean;
    webhook: boolean;
    slack: boolean;
    discord: boolean;
  }

  interface MethodTriggers {
    email: number | null;
    webhook: number | null;
    slack: number | null;
    discord: number | null;
  }

  interface TriggerRecord {
    id: number;
    name: string;
    trigger_type: string;
    trigger_desc: string | null;
    trigger_status: string | null;
  }

  interface MethodCounts {
    email: number;
    webhook: number;
    slack: number;
    discord: number;
  }

  // State
  let loading = $state(true);
  let saving = $state(false);
  let triggers = $state<TriggerRecord[]>([]);
  let methodCounts = $state<MethodCounts>({ email: 0, webhook: 0, slack: 0, discord: 0 });

  let eventsEnabled = $state<EventsEnabled>({
    incidentUpdatesAll: false,
    maintenanceUpdatesAll: false,
    monitorUpdatesAll: false
  });

  let methodsEnabled = $state<MethodsEnabled>({
    email: false,
    webhook: false,
    slack: false,
    discord: false
  });

  let methodTriggers = $state<MethodTriggers>({
    email: null,
    webhook: null,
    slack: null,
    discord: null
  });

  // Computed values
  let emailTriggers = $derived(triggers.filter((t) => t.trigger_type === "email"));
  let webhookTriggers = $derived(triggers.filter((t) => t.trigger_type === "webhook"));
  let slackTriggers = $derived(triggers.filter((t) => t.trigger_type === "slack"));
  let discordTriggers = $derived(triggers.filter((t) => t.trigger_type === "discord"));

  let hasAnyEventEnabled = $derived(
    eventsEnabled.incidentUpdatesAll || eventsEnabled.maintenanceUpdatesAll || eventsEnabled.monitorUpdatesAll
  );

  let hasAnyMethodEnabled = $derived(
    methodsEnabled.email || methodsEnabled.webhook || methodsEnabled.slack || methodsEnabled.discord
  );

  // Check if each enabled method has a trigger assigned
  let methodsWithMissingTriggers = $derived(() => {
    const missing: string[] = [];
    if (methodsEnabled.email && !methodTriggers.email) missing.push("Email");
    if (methodsEnabled.webhook && !methodTriggers.webhook) missing.push("Webhook");
    if (methodsEnabled.slack && !methodTriggers.slack) missing.push("Slack");
    if (methodsEnabled.discord && !methodTriggers.discord) missing.push("Discord");
    return missing;
  });

  // API functions
  async function loadConfig() {
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getSubscriptionConfig" })
      });
      const result = await res.json();
      if (result && !result.error) {
        eventsEnabled = result.events_enabled;
        methodsEnabled = result.methods_enabled;
        methodTriggers = result.method_triggers;
      }
    } catch (error) {
      console.error("Error loading subscription config:", error);
      toast.error("Failed to load subscription configuration");
    }
  }

  async function loadTriggers() {
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getTriggers" })
      });
      const result = await res.json();
      if (!result.error && Array.isArray(result)) {
        triggers = result;
      }
    } catch (error) {
      console.error("Error loading triggers:", error);
      toast.error("Failed to load triggers");
    }
  }

  async function loadMethodCounts() {
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getSubscriberCountsByMethod" })
      });
      const result = await res.json();
      if (!result.error) {
        methodCounts = result;
      }
    } catch (error) {
      console.error("Error loading subscriber counts:", error);
    }
  }

  async function saveConfig() {
    saving = true;
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateSubscriptionConfig",
          data: {
            events_enabled: eventsEnabled,
            methods_enabled: methodsEnabled,
            method_triggers: methodTriggers
          }
        })
      });
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Subscription configuration saved successfully");
      }
    } catch (error) {
      console.error("Error saving subscription config:", error);
      toast.error("Failed to save subscription configuration");
    } finally {
      saving = false;
    }
  }

  function handleTriggerChange(method: keyof MethodTriggers, value: string) {
    methodTriggers[method] = value === "none" ? null : parseInt(value);
  }

  function getTriggerName(triggerId: number | null, triggerList: TriggerRecord[]): string {
    if (!triggerId) return "Not selected";
    const trigger = triggerList.find((t) => t.id === triggerId);
    return trigger?.name || "Unknown trigger";
  }

  // Initial load
  $effect(() => {
    (async () => {
      await Promise.all([loadConfig(), loadTriggers(), loadMethodCounts()]);
      loading = false;
    })();
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <BellIcon class="text-muted-foreground size-6" />
      <div>
        <h1 class="text-2xl font-bold">Subscriptions</h1>
        <p class="text-muted-foreground text-sm">Configure subscription settings and view subscribers</p>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="flex h-96 items-center justify-center">
      <Spinner class="size-8" />
    </div>
  {:else}
    <!-- Combined Configuration Card -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-2">
          <BellIcon class="text-muted-foreground size-5" />
          <div>
            <Card.Title>Subscription Configuration</Card.Title>
            <Card.Description>Configure which events users can subscribe to and notification methods</Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Subscribable Events Section -->
        <div>
          <h3 class="mb-4 text-sm font-medium">Subscribable Events</h3>
          <div class="grid gap-4 md:grid-cols-3">
            <!-- Incident Updates -->
            <div class="flex items-start gap-4 rounded-lg border p-4">
              <div class="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                <AlertCircleIcon class="size-5 text-red-600 dark:text-red-400" />
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <Label class="font-medium">Incident Updates</Label>
                  <Switch
                    checked={eventsEnabled.incidentUpdatesAll}
                    onCheckedChange={(checked) => (eventsEnabled.incidentUpdatesAll = checked)}
                  />
                </div>
                <p class="text-muted-foreground mt-1 text-xs">
                  Notify when incidents are created, updated, or resolved
                </p>
              </div>
            </div>

            <!-- Maintenance Updates -->
            <div class="flex items-start gap-4 rounded-lg border p-4">
              <div class="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
                <WrenchIcon class="size-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <Label class="font-medium">Maintenance Updates</Label>
                  <Switch
                    checked={eventsEnabled.maintenanceUpdatesAll}
                    onCheckedChange={(checked) => (eventsEnabled.maintenanceUpdatesAll = checked)}
                  />
                </div>
                <p class="text-muted-foreground mt-1 text-xs">
                  Notify when maintenance is scheduled, started, or completed
                </p>
              </div>
            </div>

            <!-- Monitor Updates -->
            <div class="flex items-start gap-4 rounded-lg border p-4">
              <div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <ActivityIcon class="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <Label class="font-medium">Monitor Status Changes</Label>
                  <Switch
                    checked={eventsEnabled.monitorUpdatesAll}
                    onCheckedChange={(checked) => (eventsEnabled.monitorUpdatesAll = checked)}
                  />
                </div>
                <p class="text-muted-foreground mt-1 text-xs">
                  Notify when monitor status changes (up, down, degraded)
                </p>
              </div>
            </div>
          </div>

          {#if !hasAnyEventEnabled}
            <Alert.Root class="mt-4" variant="default">
              <Alert.Description>
                No events are enabled. Users won't be able to subscribe to any notifications until you enable at least
                one event type.
              </Alert.Description>
            </Alert.Root>
          {/if}
        </div>

        <Separator />

        <!-- Notification Methods Section -->
        <div>
          <h3 class="mb-4 text-sm font-medium">Notification Methods</h3>
          <div class="space-y-4">
            <!-- Email Method -->
            <div class="rounded-lg border p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="bg-primary/10 rounded-lg p-2">
                    <MailIcon class="text-primary size-5" />
                  </div>
                  <div>
                    <Label class="font-medium">Email</Label>
                    <p class="text-muted-foreground text-xs">Send notifications via email</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <a
                    href="/manage/app/subscriptions/email"
                    class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                  >
                    <UsersIcon class="size-3" />
                    <span>{methodCounts.email} subscribers</span>
                    <ChevronRightIcon class="size-3" />
                  </a>
                  <Switch
                    checked={methodsEnabled.email}
                    onCheckedChange={(checked) => (methodsEnabled.email = checked)}
                  />
                </div>
              </div>
              {#if methodsEnabled.email}
                <Separator class="my-4" />
                <div class="flex items-center gap-4">
                  <Label class="min-w-32 text-sm">Trigger</Label>
                  <Select.Root
                    type="single"
                    value={methodTriggers.email ? String(methodTriggers.email) : "none"}
                    onValueChange={(v) => handleTriggerChange("email", v)}
                  >
                    <Select.Trigger class="w-full">
                      {getTriggerName(methodTriggers.email, emailTriggers)}
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="none">Not selected</Select.Item>
                      {#each emailTriggers as trigger}
                        <Select.Item value={String(trigger.id)}>{trigger.name}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>
                {#if emailTriggers.length === 0}
                  <p class="text-muted-foreground mt-2 text-xs">
                    No email triggers available. <a href="/manage/app/triggers/new" class="text-primary underline"
                      >Create one</a
                    >
                  </p>
                {/if}
              {/if}
            </div>

            <!-- Webhook Method -->
            <div class="rounded-lg border p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="bg-primary/10 rounded-lg p-2">
                    <WebhookIcon class="text-primary size-5" />
                  </div>
                  <div>
                    <Label class="font-medium">Webhook</Label>
                    <p class="text-muted-foreground text-xs">Send notifications to a webhook endpoint</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <a
                    href="/manage/app/subscriptions/webhook"
                    class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                  >
                    <UsersIcon class="size-3" />
                    <span>{methodCounts.webhook} subscribers</span>
                    <ChevronRightIcon class="size-3" />
                  </a>
                  <Switch
                    checked={methodsEnabled.webhook}
                    onCheckedChange={(checked) => (methodsEnabled.webhook = checked)}
                  />
                </div>
              </div>
              {#if methodsEnabled.webhook}
                <Separator class="my-4" />
                <div class="flex items-center gap-4">
                  <Label class="min-w-32 text-sm">Trigger</Label>
                  <Select.Root
                    type="single"
                    value={methodTriggers.webhook ? String(methodTriggers.webhook) : "none"}
                    onValueChange={(v) => handleTriggerChange("webhook", v)}
                  >
                    <Select.Trigger class="w-full">
                      {getTriggerName(methodTriggers.webhook, webhookTriggers)}
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="none">Not selected</Select.Item>
                      {#each webhookTriggers as trigger}
                        <Select.Item value={String(trigger.id)}>{trigger.name}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>
                {#if webhookTriggers.length === 0}
                  <p class="text-muted-foreground mt-2 text-xs">
                    No webhook triggers available. <a href="/manage/app/triggers/new" class="text-primary underline"
                      >Create one</a
                    >
                  </p>
                {/if}
              {/if}
            </div>

            <!-- Slack Method -->
            <div class="rounded-lg border p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="bg-primary/10 rounded-lg p-2">
                    <HashIcon class="text-primary size-5" />
                  </div>
                  <div>
                    <Label class="font-medium">Slack</Label>
                    <p class="text-muted-foreground text-xs">Send notifications to a Slack channel</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <a
                    href="/manage/app/subscriptions/slack"
                    class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                  >
                    <UsersIcon class="size-3" />
                    <span>{methodCounts.slack} subscribers</span>
                    <ChevronRightIcon class="size-3" />
                  </a>
                  <Switch
                    checked={methodsEnabled.slack}
                    onCheckedChange={(checked) => (methodsEnabled.slack = checked)}
                  />
                </div>
              </div>
              {#if methodsEnabled.slack}
                <Separator class="my-4" />
                <div class="flex items-center gap-4">
                  <Label class="min-w-32 text-sm">Trigger</Label>
                  <Select.Root
                    type="single"
                    value={methodTriggers.slack ? String(methodTriggers.slack) : "none"}
                    onValueChange={(v) => handleTriggerChange("slack", v)}
                  >
                    <Select.Trigger class="w-full">
                      {getTriggerName(methodTriggers.slack, slackTriggers)}
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="none">Not selected</Select.Item>
                      {#each slackTriggers as trigger}
                        <Select.Item value={String(trigger.id)}>{trigger.name}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>
                {#if slackTriggers.length === 0}
                  <p class="text-muted-foreground mt-2 text-xs">
                    No Slack triggers available. <a href="/manage/app/triggers/new" class="text-primary underline"
                      >Create one</a
                    >
                  </p>
                {/if}
              {/if}
            </div>

            <!-- Discord Method -->
            <div class="rounded-lg border p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="bg-primary/10 rounded-lg p-2">
                    <MessageSquareIcon class="text-primary size-5" />
                  </div>
                  <div>
                    <Label class="font-medium">Discord</Label>
                    <p class="text-muted-foreground text-xs">Send notifications to a Discord channel</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <a
                    href="/manage/app/subscriptions/discord"
                    class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                  >
                    <UsersIcon class="size-3" />
                    <span>{methodCounts.discord} subscribers</span>
                    <ChevronRightIcon class="size-3" />
                  </a>
                  <Switch
                    checked={methodsEnabled.discord}
                    onCheckedChange={(checked) => (methodsEnabled.discord = checked)}
                  />
                </div>
              </div>
              {#if methodsEnabled.discord}
                <Separator class="my-4" />
                <div class="flex items-center gap-4">
                  <Label class="min-w-32 text-sm">Trigger</Label>
                  <Select.Root
                    type="single"
                    value={methodTriggers.discord ? String(methodTriggers.discord) : "none"}
                    onValueChange={(v) => handleTriggerChange("discord", v)}
                  >
                    <Select.Trigger class="w-full">
                      {getTriggerName(methodTriggers.discord, discordTriggers)}
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="none">Not selected</Select.Item>
                      {#each discordTriggers as trigger}
                        <Select.Item value={String(trigger.id)}>{trigger.name}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>
                {#if discordTriggers.length === 0}
                  <p class="text-muted-foreground mt-2 text-xs">
                    No Discord triggers available. <a href="/manage/app/triggers/new" class="text-primary underline"
                      >Create one</a
                    >
                  </p>
                {/if}
              {/if}
            </div>

            {#if !hasAnyMethodEnabled}
              <Alert.Root variant="default">
                <Alert.Description>
                  No notification methods are enabled. Users won't be able to subscribe until you enable at least one
                  method.
                </Alert.Description>
              </Alert.Root>
            {:else if methodsWithMissingTriggers().length > 0}
              <Alert.Root variant="default">
                <Alert.Description>
                  The following enabled methods don't have a trigger assigned: <strong
                    >{methodsWithMissingTriggers().join(", ")}</strong
                  >. Users won't receive notifications via these methods until triggers are assigned.
                </Alert.Description>
              </Alert.Root>
            {/if}
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveConfig} disabled={saving || loading}>
          {#if saving}
            <Spinner class="mr-2 size-4" />
          {:else}
            <SaveIcon class="mr-2 size-4" />
          {/if}
          Save Configuration
        </Button>
      </Card.Footer>
    </Card.Root>
  {/if}
</div>

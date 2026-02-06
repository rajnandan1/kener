<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import XIcon from "@lucide/svelte/icons/x";
  import WebhookIcon from "@lucide/svelte/icons/webhook";
  import MailIcon from "@lucide/svelte/icons/mail";
  import ZapIcon from "@lucide/svelte/icons/zap";
  import Loader from "@lucide/svelte/icons/loader";
  import CheckIcon from "@lucide/svelte/icons/check";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { toast } from "svelte-sonner";
  import { mode } from "mode-watcher";
  import { IsValidURL } from "$lib/clientTools";
  import CodeMirror from "svelte-codemirror-editor";
  import { json } from "@codemirror/lang-json";
  import { html } from "@codemirror/lang-html";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
  import type { TriggerMeta } from "$lib/server/types/db";
  let { data } = page;
  // Types

  // State
  let loading = $state(true);
  let saving = $state(false);
  let testing = $state<"idle" | "loading" | "success" | "error">("idle");
  let invalidFormMessage = $state("");
  let deleteDialogOpen = $state(false);
  let deleteConfirmName = $state("");
  let isDeleting = $state(false);

  // Get trigger ID from URL params
  const triggerId = $derived(data.trigger_id);
  const isNew = $derived(triggerId === "new");

  // Form state
  let trigger = $state<{
    id: number;
    name: string;
    trigger_type: string;
    trigger_desc: string;
    trigger_status: string;
    trigger_meta: TriggerMeta;
  }>({
    id: 0,
    name: "",
    trigger_type: "webhook",
    trigger_desc: "",
    trigger_status: "ACTIVE",
    trigger_meta: {
      url: "",
      headers: [],
      to: "",
      from: "",
      webhook_body: data.webhook_template.webhook_body,
      discord_body: data.discord_template.discord_body,
      slack_body: data.slack_template.slack_body,
      email_body: data.email_template.email_body,
      email_subject: data.email_template.email_subject
    }
  });

  async function fetchTrigger() {
    if (isNew) {
      loading = false;
      return;
    }

    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getTriggers",
          data: {}
        })
      });
      const result = await response.json();
      const foundTrigger = result.find((t: { id: number }) => t.id === parseInt(triggerId || "0"));
      if (foundTrigger) {
        const meta = JSON.parse(foundTrigger.trigger_meta) as TriggerMeta;
        trigger = {
          id: foundTrigger.id,
          name: foundTrigger.name,
          trigger_type: foundTrigger.trigger_type,
          trigger_desc: foundTrigger.trigger_desc || "",
          trigger_status: foundTrigger.trigger_status || "ACTIVE",
          trigger_meta: {
            url: meta.url || "",
            headers: meta.headers || [],
            to: meta.to || "",
            from: meta.from || "",
            webhook_body: meta.webhook_body || data.webhook_template.webhook_body,
            discord_body: meta.discord_body || data.discord_template.discord_body,
            slack_body: meta.slack_body || data.slack_template.slack_body,
            email_body: meta.email_body || data.email_template.email_body,
            email_subject: meta.email_subject || data.email_template.email_subject
          }
        };
      } else {
        toast.error("Trigger not found");
        goto(clientResolver(resolve, "/manage/app/triggers"));
      }
    } catch (error) {
      console.error("Error fetching trigger:", error);
      toast.error("Failed to load trigger");
    } finally {
      loading = false;
    }
  }

  // Validation
  function validateNameEmailPattern(input: string): { isValid: boolean; name: string | null; email: string | null } {
    const pattern = /^([\w\s]+)\s*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>$/;
    const match = input.match(pattern);
    if (match) {
      return { isValid: true, name: match[1].trim(), email: match[2] };
    }
    return { isValid: false, name: null, email: null };
  }

  async function saveTrigger() {
    invalidFormMessage = "";

    // Validation
    if (!trigger.name.trim()) {
      invalidFormMessage = "Trigger Name is required";
      return;
    }

    if (!trigger.trigger_type) {
      invalidFormMessage = "Trigger Type is required";
      return;
    }

    if (trigger.trigger_type === "email") {
      if (!trigger.trigger_meta.to.trim()) {
        invalidFormMessage = "To Email Address is required";
        return;
      }
      if (!validateNameEmailPattern(trigger.trigger_meta.from).isValid) {
        invalidFormMessage = "Invalid Sender. Format: Name <email@example.com>";
        return;
      }
    } else {
      // URL validation for non-email triggers
      if (!trigger.trigger_meta.url.trim()) {
        invalidFormMessage = "Trigger URL is required";
        return;
      }
      if (!IsValidURL(trigger.trigger_meta.url)) {
        invalidFormMessage = "Invalid URL";
        return;
      }
    }

    saving = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createUpdateTrigger",
          data: {
            id: trigger.id || undefined,
            name: trigger.name,
            trigger_type: trigger.trigger_type,
            trigger_status: trigger.trigger_status,
            trigger_desc: trigger.trigger_desc,
            trigger_meta: JSON.stringify(trigger.trigger_meta)
          }
        })
      });
      const result = await response.json();
      if (result.error) {
        invalidFormMessage = result.error;
      } else {
        toast.success(trigger.id ? "Trigger updated successfully" : "Trigger created successfully");
        if (isNew) {
          goto(clientResolver(resolve, "/manage/app/triggers"));
        }
      }
    } catch (error) {
      invalidFormMessage = "Failed to save trigger";
    } finally {
      saving = false;
    }
  }

  async function testTrigger() {
    if (!trigger.id) {
      toast.error("Please save the trigger first");
      return;
    }

    testing = "loading";
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "testTrigger",
          data: { trigger_id: trigger.id, status: "TRIGGERED" }
        })
      });
      const result = await response.json();
      if (result.error) {
        testing = "error";
        toast.error(result.error);
      } else {
        testing = "success";
        toast.success("Test trigger sent successfully");
      }
    } catch (error) {
      testing = "error";
      toast.error("Failed to test trigger");
    } finally {
      setTimeout(() => {
        testing = "idle";
      }, 3000);
    }
  }

  function addHeader() {
    trigger.trigger_meta.headers = [...trigger.trigger_meta.headers, { key: "", value: "" }];
  }

  function removeHeader(index: number) {
    trigger.trigger_meta.headers = trigger.trigger_meta.headers.filter((_, i) => i !== index);
  }

  async function deleteTrigger() {
    if (!trigger.id || deleteConfirmName !== trigger.name) return;

    isDeleting = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteTrigger",
          data: { trigger_id: trigger.id }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Trigger deleted successfully");
        goto(clientResolver(resolve, "/manage/app/triggers"));
      }
    } catch (error) {
      toast.error("Failed to delete trigger");
    } finally {
      isDeleting = false;
      deleteDialogOpen = false;
      deleteConfirmName = "";
    }
  }

  $effect(() => {
    fetchTrigger();
  });
</script>

<div class="container space-y-6 py-6">
  <!-- Breadcrumb -->
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Link href={clientResolver(resolve, "/manage/app")}>Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Link href={clientResolver(resolve, "/manage/app/triggers")}>Triggers</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>{isNew ? "New Trigger" : trigger.name || "Edit Trigger"}</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="size-8" />
    </div>
  {:else}
    <Card.Root>
      <Card.Header>
        <Card.Title>{isNew ? "New Trigger" : "Edit Trigger"}</Card.Title>
        <Card.Description>Configure notification triggers for your monitors</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Error Message -->
        {#if invalidFormMessage}
          <div class="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">{invalidFormMessage}</div>
        {/if}

        <!-- Trigger Type Selection -->
        <div class="space-y-3">
          <Label>Trigger Type</Label>
          <p class="text-muted-foreground text-sm">Select the type of notification to send</p>
          <div class="grid grid-cols-4 gap-3">
            {#each ["webhook", "discord", "slack", "email"] as type}
              <Button
                variant={trigger.trigger_type === type ? "default" : "outline"}
                class="h-20 flex-col gap-2"
                onclick={() => (trigger.trigger_type = type)}
              >
                {#if type === "webhook"}
                  <img src="/webhooks.svg" class="size-6" alt="webhook" />
                {:else if type === "slack"}
                  <img src="/slack.svg" class="size-6" alt="slack" />
                {:else if type === "discord"}
                  <img src="/discord.svg" class="size-6" alt="discord" />
                {:else if type === "email"}
                  <img src="/email.png" class="size-6" alt="email" />
                {:else}
                  <ZapIcon class="size-6" />
                {/if}
                <span class="capitalize">{type}</span>
              </Button>
            {/each}
          </div>
        </div>

        <!-- Status Toggle -->
        <div class="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Status</Label>
            <p class="text-muted-foreground text-sm">Enable or disable this trigger</p>
          </div>
          <Switch
            checked={trigger.trigger_status === "ACTIVE"}
            onCheckedChange={(checked) => (trigger.trigger_status = checked ? "ACTIVE" : "INACTIVE")}
          />
        </div>

        <!-- Name -->
        <div class="space-y-2">
          <Label for="trigger-name">
            Name <span class="text-destructive">*</span>
          </Label>
          <Input id="trigger-name" bind:value={trigger.name} placeholder="My Trigger" />
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <Label for="trigger-desc">Description</Label>
          <Input id="trigger-desc" bind:value={trigger.trigger_desc} placeholder="Optional description" />
        </div>

        <!-- URL (for non-email) -->
        {#if trigger.trigger_type !== "email"}
          <div class="space-y-2">
            <Label for="trigger-url">
              URL <span class="text-destructive">*</span>
            </Label>
            <Input id="trigger-url" bind:value={trigger.trigger_meta.url} placeholder="https://example.com/webhook" />
            <p class="text-muted-foreground text-xs">The URL to send notifications to</p>
          </div>
        {/if}

        <!-- Webhook Specific -->
        {#if trigger.trigger_type === "webhook"}
          <!-- Headers -->
          <div class="space-y-3">
            <Label>Headers</Label>
            <div class="space-y-2">
              {#each trigger.trigger_meta.headers as header, index}
                <div class="flex gap-2">
                  <Input bind:value={header.key} placeholder="Header Key" class="flex-1" />
                  <Input bind:value={header.value} placeholder="Header Value" class="flex-1" />
                  <Button variant="ghost" size="icon" onclick={() => removeHeader(index)}>
                    <XIcon class="size-4" />
                  </Button>
                </div>
              {/each}
            </div>
            <Button variant="outline" size="sm" onclick={addHeader}>
              <PlusIcon class="mr-2 size-4" />
              Add Header
            </Button>
          </div>

          <!-- Custom Body -->
          <div class="space-y-3">
            <div>
              <Label>Custom Webhook Body</Label>
              <p class="text-muted-foreground text-sm">Override the default JSON payload</p>
            </div>
            <p class="text-muted-foreground text-xs">
              Use Mustache variables like <code class="bg-muted rounded px-1">{"{{variable}}"}</code>. Available: id,
              alert_name, severity, status, source, timestamp, description, metric, current_value, threshold,
              action_text, action_url
            </p>
            <div class="overflow-hidden rounded-md border">
              <Textarea bind:value={trigger.trigger_meta.webhook_body} />
            </div>
          </div>
        {/if}

        <!-- Discord Specific -->
        {#if trigger.trigger_type === "discord"}
          <div class="space-y-3">
            <div>
              <Label>Custom Discord Payload</Label>
              <p class="text-muted-foreground text-sm">Override the default Discord message</p>
            </div>
            <p class="text-muted-foreground text-xs">
              Use Mustache variables. Available: site_name, logo_url, alert_name, status, is_triggered, is_resolved,
              description, metric, severity, id, current_value, threshold, source, action_text, action_url
            </p>
            <div class="overflow-hidden rounded-md border">
              <Textarea bind:value={trigger.trigger_meta.discord_body} />
            </div>
          </div>
        {/if}

        <!-- Slack Specific -->
        {#if trigger.trigger_type === "slack"}
          <div class="space-y-3">
            <div>
              <Label>Custom Slack Payload</Label>
              <p class="text-muted-foreground text-sm">Override the default Slack message</p>
            </div>
            <p class="text-muted-foreground text-xs">
              Use Mustache variables. Available: site_name, logo_url, alert_name, status, is_triggered, is_resolved,
              description, metric, severity, id, current_value, threshold, source, action_text, action_url
            </p>
            <div class="overflow-hidden rounded-md border">
              <Textarea bind:value={trigger.trigger_meta.slack_body} />
            </div>
          </div>
        {/if}

        <!-- Email Specific -->
        {#if trigger.trigger_type === "email"}
          <!-- Email Recipients -->
          <div class="space-y-2">
            <Label for="email-to">
              To (comma separated) <span class="text-destructive">*</span>
            </Label>
            <Input
              id="email-to"
              bind:value={trigger.trigger_meta.to}
              placeholder="john@example.com, jane@example.com"
            />
          </div>
          <div class="space-y-2">
            <Label for="email-from">
              From <span class="text-destructive">*</span>
            </Label>
            <Input id="email-from" bind:value={trigger.trigger_meta.from} placeholder="Alerts <alert@example.com>" />
            <p class="text-muted-foreground text-xs">Format: Name &lt;email@example.com&gt;</p>
          </div>

          <!-- Custom Email Template -->
          <div class="space-y-3">
            <div>
              <Label>Custom HTML Template</Label>
              <p class="text-muted-foreground text-sm">Create your own email design</p>
            </div>
            <p class="text-muted-foreground text-xs">
              Use Mustache variables. Available: site_name, site_url, logo_url, alert_name, status, severity,
              description, metric, current_value, threshold, action_text, action_url, is_triggered, is_resolved,
              color_up, color_down, color_degraded, color_maintenance
            </p>
            <div class="overflow-hidden rounded-md border">
              <CodeMirror
                bind:value={trigger.trigger_meta.email_body}
                lang={html()}
                theme={mode.current === "dark" ? githubDark : githubLight}
                styles={{ "&": { width: "100%", height: "400px" } }}
              />
            </div>
          </div>
        {/if}
      </Card.Content>
      <Card.Footer class="flex justify-end gap-2">
        {#if !isNew}
          <Button variant="outline" onclick={testTrigger} disabled={testing === "loading"}>
            {#if testing === "loading"}
              <Loader class="mr-2 size-4 animate-spin" />
            {:else if testing === "success"}
              <CheckIcon class="mr-2 size-4 text-green-500" />
            {:else if testing === "error"}
              <XIcon class="mr-2 size-4 text-red-500" />
            {/if}
            Test Trigger
          </Button>
        {/if}
        <Button onclick={saveTrigger} disabled={saving}>
          {#if saving}
            <Loader class="mr-2 size-4 animate-spin" />
          {:else}
            <SaveIcon class="mr-2 size-4" />
          {/if}
          {isNew ? "Create" : "Save"} Trigger
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Delete Trigger Card -->
    {#if !isNew}
      <Card.Root class="border-destructive">
        <Card.Header>
          <Card.Title class="text-destructive">Danger Zone</Card.Title>
          <Card.Description>Permanently delete this trigger. This action cannot be undone.</Card.Description>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground text-sm">
            Deleting this trigger will also remove it from all alert configurations that use it.
          </p>
        </Card.Content>
        <Card.Footer class="flex justify-end">
          <Button variant="destructive" onclick={() => (deleteDialogOpen = true)}>
            <Trash2Icon class="mr-2 size-4" />
            Delete Trigger
          </Button>
        </Card.Footer>
      </Card.Root>
    {/if}
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Trigger</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete the trigger and remove it from all alert
        configurations.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <div class="space-y-4 py-4">
      <p class="text-sm">
        To confirm, type <span class="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">{trigger.name}</span> below:
      </p>
      <Input bind:value={deleteConfirmName} placeholder="Type trigger name to confirm" />
    </div>
    <AlertDialog.Footer>
      <AlertDialog.Cancel
        disabled={isDeleting}
        onclick={() => {
          deleteConfirmName = "";
        }}>Cancel</AlertDialog.Cancel
      >
      <Button variant="destructive" onclick={deleteTrigger} disabled={isDeleting || deleteConfirmName !== trigger.name}>
        {#if isDeleting}
          <Loader class="mr-2 size-4 animate-spin" />
        {:else}
          <Trash2Icon class="mr-2 size-4" />
        {/if}
        Delete Trigger
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

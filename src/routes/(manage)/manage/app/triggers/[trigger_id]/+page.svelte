<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT, editorPhrases: adminEditorPhrases } = getAdminI18n();
  const editorLocale = $derived(EditorState.phrases.of($adminEditorPhrases));

  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import * as Alert from "$lib/components/ui/alert/index.js";

  import { Button } from "$lib/components/ui/button/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import XIcon from "@lucide/svelte/icons/x";
  import AlertCircleIcon from "@lucide/svelte/icons/octagon-alert";
  import Loader from "@lucide/svelte/icons/loader";
  import CheckIcon from "@lucide/svelte/icons/check";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { toast } from "svelte-sonner";
  import { onMount } from "svelte";
  import { mode } from "mode-watcher";
  import { IsValidURL } from "$lib/clientTools";
  import { EditorState } from "@codemirror/state";
  import CodeMirror from "$lib/components/manage/CodeEditor.svelte";
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
        toast.error($adminT("Trigger not found"));
        goto(clientResolver(resolve, "/manage/app/triggers"));
      }
    } catch (error) {
      console.error("Error fetching trigger:", error);
      toast.error($adminT("Failed to load trigger"));
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
        toast.success($adminT(trigger.id ? "Trigger updated successfully" : "Trigger created successfully"));
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
      toast.error($adminT("Please save the trigger first"));
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
        toast.error($adminT(result.error));
      } else {
        testing = "success";
        toast.success($adminT("Test trigger sent successfully"));
      }
    } catch (error) {
      testing = "error";
      toast.error($adminT("Failed to test trigger"));
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
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT("Trigger deleted successfully"));
        goto(clientResolver(resolve, "/manage/app/triggers"));
      }
    } catch (error) {
      toast.error($adminT("Failed to delete trigger"));
    } finally {
      isDeleting = false;
      deleteDialogOpen = false;
      deleteConfirmName = "";
    }
  }

  onMount(() => {
    fetchTrigger();
  });
</script>

<div class="container space-y-6 py-6">
  <!-- Breadcrumb -->
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Link href={clientResolver(resolve, "/manage/app/triggers")}>{$adminT("Triggers")}</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>{isNew ? $adminT("New Trigger") : trigger.name || $adminT("Edit Trigger")}</Breadcrumb.Page>
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
        <Card.Title>{isNew ? $adminT("New Trigger") : $adminT("Edit Trigger")}</Card.Title>
        <Card.Description>{$adminT("Configure notification triggers for your monitors")}</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Error Message -->
        {#if invalidFormMessage}
          <div class="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
            {$adminT(String(invalidFormMessage ?? ""))}
          </div>
        {/if}

        <!-- Trigger Type Selection -->
        <div class="space-y-3">
          <Label>{$adminT("Trigger Type")}</Label>
          <p class="text-muted-foreground text-sm">{$adminT("Select the type of notification to send")}</p>
          <Select.Root
            type="single"
            value={trigger.trigger_type}
            onValueChange={(value) => {
              if (value) trigger.trigger_type = value;
            }}
          >
            <Select.Trigger class="w-full max-w-sm">{$adminT(String(trigger.trigger_type ?? ""))}</Select.Trigger>
            <Select.Content>
              <Select.Item value="webhook">{$adminT("Webhook")}</Select.Item>
              <Select.Item value="discord">{$adminT("Discord")}</Select.Item>
              <Select.Item value="slack">{$adminT("Slack")}</Select.Item>
              <Select.Item value="email">{$adminT("Email")}</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Status Toggle -->
        <div class="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>{$adminT("Status")}</Label>
            <p class="text-muted-foreground text-sm">{$adminT("Enable or disable this trigger")}</p>
          </div>
          <Switch
            checked={trigger.trigger_status === "ACTIVE"}
            onCheckedChange={(checked) => (trigger.trigger_status = checked ? "ACTIVE" : "INACTIVE")}
          />
        </div>

        <!-- Name -->
        <div class="space-y-2">
          <Label for="trigger-name">
            {$adminT("Name")} <span class="text-destructive">*</span>
          </Label>
          <Input id="trigger-name" bind:value={trigger.name} placeholder={$adminT("My Trigger")} />
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <Label for="trigger-desc">{$adminT("Description")}</Label>
          <Input id="trigger-desc" bind:value={trigger.trigger_desc} placeholder={$adminT("Optional description")} />
        </div>

        <!-- URL (for non-email) -->
        {#if trigger.trigger_type !== "email"}
          <div class="space-y-2">
            <Label for="trigger-url">
              {$adminT("URL")} <span class="text-destructive">*</span>
            </Label>
            <Input id="trigger-url" bind:value={trigger.trigger_meta.url} placeholder="https://example.com/webhook" />
            <p class="text-muted-foreground text-xs">{$adminT("The URL to send notifications to")}</p>
          </div>
        {/if}

        <!-- Webhook Specific -->
        {#if trigger.trigger_type === "webhook"}
          <!-- Headers -->
          <div class="space-y-3">
            <Label>{$adminT("Headers")}</Label>
            <div class="space-y-2">
              {#each trigger.trigger_meta.headers as header, index}
                <div class="flex gap-2">
                  <Input bind:value={header.key} placeholder={$adminT("Header Key")} class="flex-1" />
                  <Input bind:value={header.value} placeholder={$adminT("Header Value")} class="flex-1" />
                  <Button
                    aria-label={$adminT("Remove header")}
                    variant="ghost"
                    size="icon"
                    onclick={() => removeHeader(index)}
                  >
                    <XIcon class="size-4" />
                  </Button>
                </div>
              {/each}
            </div>
            <Button variant="outline" size="sm" onclick={addHeader}>
              <PlusIcon class="size-4" />
              {$adminT("Add Header")}
            </Button>
          </div>

          <!-- Custom Body -->
          <div class="space-y-3">
            <div>
              <Label>{$adminT("Custom Webhook Body")}</Label>
              <p class="text-muted-foreground text-sm">{$adminT("Override the default JSON payload")}</p>
            </div>
            <p class="text-muted-foreground text-xs">
              {$adminT("Use Mustache variables like")}
              <code class="bg-muted rounded px-1">{"{{variable}}"}</code>{$adminT(
                ". Available: alert_id, alert_name, alert_for, alert_value, alert_status, alert_severity, alert_message, alert_source, alert_timestamp, alert_cta_url, alert_cta_text, alert_incident_id, alert_incident_url, alert_failure_threshold, alert_success_threshold, is_resolved, is_triggered, site_url, site_name, site_logo_url, colors_up, colors_down, colors_degraded, colors_maintenance"
              )}
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
              <Label>{$adminT("Custom Discord Payload")}</Label>
              <p class="text-muted-foreground text-sm">{$adminT("Override the default Discord message")}</p>
            </div>
            <p class="text-muted-foreground text-xs">
              {$adminT(
                "Use Mustache variables. Available: alert_id, alert_name, alert_for, alert_value, alert_status, alert_severity, alert_message, alert_source, alert_timestamp, alert_cta_url, alert_cta_text, alert_incident_id, alert_incident_url, alert_failure_threshold, alert_success_threshold, is_resolved, is_triggered, site_url, site_name, site_logo_url, colors_up, colors_down, colors_degraded, colors_maintenance"
              )}
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
              <Label>{$adminT("Custom Slack Payload")}</Label>
              <p class="text-muted-foreground text-sm">{$adminT("Override the default Slack message")}</p>
            </div>
            <p class="text-muted-foreground text-xs">
              {$adminT(
                "Use Mustache variables. Available: alert_id, alert_name, alert_for, alert_value, alert_status, alert_severity, alert_message, alert_source, alert_timestamp, alert_cta_url, alert_cta_text, alert_incident_id, alert_incident_url, alert_failure_threshold, alert_success_threshold, is_resolved, is_triggered, site_url, site_name, site_logo_url, colors_up, colors_down, colors_degraded, colors_maintenance"
              )}
            </p>
            <div class="overflow-hidden rounded-md border">
              <Textarea bind:value={trigger.trigger_meta.slack_body} />
            </div>
          </div>
        {/if}

        <!-- Email Specific -->
        {#if trigger.trigger_type === "email"}
          <!-- Email Recipients -->
          {#if page.data.canSendEmail === false}
            <Alert.Root variant="destructive">
              <AlertCircleIcon />
              <Alert.Title>{$adminT("Email is not setup")}</Alert.Title>
              <Alert.Description>
                <p>
                  {$adminT("Please visit the email set up documentation")}
                  <a class="underline" href={clientResolver(resolve, "https://kener.ing/docs/v4/setup/email-setup")}
                    >{$adminT("here")}</a
                  >.
                </p>
              </Alert.Description>
            </Alert.Root>
          {/if}
          <div class="space-y-2">
            <Label for="email-to">
              {$adminT("To (comma separated)")} <span class="text-destructive">*</span>
            </Label>
            <Input
              id="email-to"
              bind:value={trigger.trigger_meta.to}
              placeholder={$adminT("john@example.com, jane@example.com")}
            />
          </div>
          <div class="space-y-2">
            <Label for="email-from">
              {$adminT("From")} <span class="text-destructive">*</span>
            </Label>
            <Input
              id="email-from"
              bind:value={trigger.trigger_meta.from}
              placeholder={$adminT("Alerts <alert@example.com>")}
            />
            <p class="text-muted-foreground text-xs">{$adminT("Format: Name <email@example.com>")}</p>
          </div>

          <!-- Custom Email Template -->
          <div class="space-y-3">
            <div>
              <Label>{$adminT("Custom HTML Template")}</Label>
              <p class="text-muted-foreground text-sm">{$adminT("Create your own email design")}</p>
            </div>
            <p class="text-muted-foreground text-xs">
              {$adminT(
                "Use Mustache variables. Available: alert_id, alert_name, alert_for, alert_value, alert_status, alert_severity, alert_message, alert_source, alert_timestamp, alert_cta_url, alert_cta_text, alert_incident_id, alert_incident_url, alert_failure_threshold, alert_success_threshold, is_resolved, is_triggered, site_url, site_name, site_logo_url, colors_up, colors_down, colors_degraded, colors_maintenance"
              )}
            </p>
            <div class="overflow-hidden rounded-md border">
              <CodeMirror
                extensions={[editorLocale]}
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
              <Loader class="size-4 animate-spin" />
            {:else if testing === "success"}
              <CheckIcon class="size-4 text-green-500" />
            {:else if testing === "error"}
              <XIcon class="size-4 text-red-500" />
            {/if}
            {$adminT("Test Trigger")}
          </Button>
        {/if}
        <Button onclick={saveTrigger} disabled={saving}>
          {#if saving}
            <Loader class="size-4 animate-spin" />
          {:else}
            <SaveIcon class="size-4" />
          {/if}
          {isNew ? $adminT("Create Trigger") : $adminT("Save Trigger")}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Delete Trigger Card -->
    {#if !isNew}
      <Card.Root class="border-destructive">
        <Card.Header>
          <Card.Title class="text-destructive">{$adminT("Danger Zone")}</Card.Title>
          <Card.Description
            >{$adminT("Permanently delete this trigger. This action cannot be undone.")}</Card.Description
          >
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground text-sm">
            {$adminT("Deleting this trigger will also remove it from all alert configurations that use it.")}
          </p>
        </Card.Content>
        <Card.Footer class="flex justify-end">
          <Button variant="destructive" onclick={() => (deleteDialogOpen = true)}>
            <Trash2Icon class="size-4" />
            {$adminT("Delete Trigger")}
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
      <AlertDialog.Title>{$adminT("Delete Trigger")}</AlertDialog.Title>
      <AlertDialog.Description>
        {$adminT(
          "This action cannot be undone. This will permanently delete the trigger and remove it from all alert configurations."
        )}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <div class="space-y-4 py-4">
      <p class="text-sm">
        {$adminT("To confirm, type")}
        <span class="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">{trigger.name}</span>
        {$adminT("below:")}
      </p>
      <Input bind:value={deleteConfirmName} placeholder={$adminT("Type trigger name to confirm")} />
    </div>
    <AlertDialog.Footer>
      <AlertDialog.Cancel
        disabled={isDeleting}
        onclick={() => {
          deleteConfirmName = "";
        }}>{$adminT("Cancel")}</AlertDialog.Cancel
      >
      <Button variant="destructive" onclick={deleteTrigger} disabled={isDeleting || deleteConfirmName !== trigger.name}>
        {#if isDeleting}
          <Loader class="size-4 animate-spin" />
        {:else}
          <Trash2Icon class="size-4" />
        {/if}
        {$adminT("Delete Trigger")}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

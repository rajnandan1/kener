<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
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
  import { toast } from "svelte-sonner";
  import { mode } from "mode-watcher";
  import { DiscordJSONTemplate, WebhookJSONTemplate, SlackJSONTemplate, EmailHTMLTemplate } from "$lib/anywhere";
  import { IsValidURL } from "$lib/clientTools";
  import CodeMirror from "svelte-codemirror-editor";
  import { json } from "@codemirror/lang-json";
  import { html } from "@codemirror/lang-html";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";

  // Types
  interface TriggerHeader {
    key: string;
    value: string;
  }

  interface TriggerMeta {
    url: string;
    headers: TriggerHeader[];
    to: string;
    from: string;
    webhook_body: string;
    has_webhook_body: boolean;
    has_discord_body: boolean;
    discord_body: string;
    has_slack_body: boolean;
    slack_body: string;
    has_email_body: boolean;
    email_body: string;
    email_type: "resend" | "smtp";
    smtp_host: string;
    smtp_port: string;
    smtp_user: string;
    smtp_pass: string;
    smtp_secure: boolean;
  }

  // State
  let loading = $state(true);
  let saving = $state(false);
  let testing = $state<"idle" | "loading" | "success" | "error">("idle");
  let invalidFormMessage = $state("");

  // Get trigger ID from URL params
  const triggerId = $derived($page.params.trigger_id);
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
      webhook_body: WebhookJSONTemplate,
      has_webhook_body: false,
      has_discord_body: false,
      discord_body: DiscordJSONTemplate,
      has_slack_body: false,
      slack_body: SlackJSONTemplate,
      has_email_body: false,
      email_body: EmailHTMLTemplate,
      email_type: "resend",
      smtp_host: "",
      smtp_port: "",
      smtp_user: "",
      smtp_pass: "",
      smtp_secure: false
    }
  });

  async function fetchTrigger() {
    if (isNew) {
      loading = false;
      return;
    }

    loading = true;
    try {
      const response = await fetch("/manage/api", {
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
            webhook_body: meta.webhook_body || WebhookJSONTemplate,
            has_webhook_body: meta.has_webhook_body || false,
            has_discord_body: meta.has_discord_body || false,
            discord_body: meta.discord_body || DiscordJSONTemplate,
            has_slack_body: meta.has_slack_body || false,
            slack_body: meta.slack_body || SlackJSONTemplate,
            has_email_body: meta.has_email_body || false,
            email_body: meta.email_body || EmailHTMLTemplate,
            email_type: meta.email_type || "resend",
            smtp_host: meta.smtp_host || "",
            smtp_port: meta.smtp_port || "",
            smtp_user: meta.smtp_user || "",
            smtp_pass: meta.smtp_pass || "",
            smtp_secure: meta.smtp_secure || false
          }
        };
      } else {
        toast.error("Trigger not found");
        goto("/manage/app/triggers");
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

    // Type-specific validation
    if (trigger.trigger_type === "discord") {
      if (trigger.trigger_meta.has_discord_body) {
        try {
          JSON.parse(trigger.trigger_meta.discord_body);
        } catch {
          invalidFormMessage = "Invalid JSON in Discord Body";
          return;
        }
      }
    }

    if (trigger.trigger_type === "slack") {
      if (trigger.trigger_meta.has_slack_body) {
        try {
          JSON.parse(trigger.trigger_meta.slack_body);
        } catch {
          invalidFormMessage = "Invalid JSON in Slack Body";
          return;
        }
      }
    }

    if (trigger.trigger_type === "webhook") {
      if (trigger.trigger_meta.has_webhook_body) {
        try {
          JSON.parse(trigger.trigger_meta.webhook_body);
        } catch {
          invalidFormMessage = "Invalid JSON in Webhook Body";
          return;
        }
      }
      // Validate headers
      for (const header of trigger.trigger_meta.headers) {
        if (!header.key.trim() || !header.value.trim()) {
          invalidFormMessage = "All header keys and values are required";
          return;
        }
      }
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
      if (trigger.trigger_meta.email_type === "smtp") {
        if (!trigger.trigger_meta.smtp_host.trim()) {
          invalidFormMessage = "SMTP Host is required";
          return;
        }
        if (!trigger.trigger_meta.smtp_port.trim()) {
          invalidFormMessage = "SMTP Port is required";
          return;
        }
        if (!trigger.trigger_meta.smtp_user.trim()) {
          invalidFormMessage = "SMTP User is required";
          return;
        }
        if (!trigger.trigger_meta.smtp_pass.trim()) {
          invalidFormMessage = "SMTP Password is required";
          return;
        }
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
      const response = await fetch("/manage/api", {
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
          goto("/manage/app/triggers");
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
      const response = await fetch("/manage/api", {
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

  $effect(() => {
    fetchTrigger();
  });
</script>

<div class="container space-y-6 py-6">
  <!-- Breadcrumb -->

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="size-8" />
    </div>
  {:else}
    <!-- Header -->
    <div class="flex items-center justify-between">
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/manage/app">Dashboard</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/manage/app/triggers">Triggers</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>{isNew ? "New Trigger" : trigger.name || "Edit Trigger"}</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
      <div class="flex items-center gap-2">
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
      </div>
    </div>

    <!-- Error Message -->
    {#if invalidFormMessage}
      <div class="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">{invalidFormMessage}</div>
    {/if}

    <!-- Trigger Type Selection -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Trigger Type</Card.Title>
        <Card.Description>Select the type of notification to send</Card.Description>
      </Card.Header>
      <Card.Content>
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
      </Card.Content>
    </Card.Root>

    <!-- Basic Info -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Basic Information</Card.Title>
        <Card.Description>Name and description for this trigger</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
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
      </Card.Content>
    </Card.Root>

    <!-- URL (for non-email) -->
    {#if trigger.trigger_type !== "email"}
      <Card.Root>
        <Card.Header>
          <Card.Title>Endpoint URL</Card.Title>
          <Card.Description>The URL to send notifications to</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            <Label for="trigger-url">
              URL <span class="text-destructive">*</span>
            </Label>
            <Input id="trigger-url" bind:value={trigger.trigger_meta.url} placeholder="https://example.com/webhook" />
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Webhook Specific -->
    {#if trigger.trigger_type === "webhook"}
      <Card.Root>
        <Card.Header>
          <Card.Title>Webhook Configuration</Card.Title>
          <Card.Description>Configure headers and custom body for webhook</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-6">
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
            <div class="flex items-center justify-between">
              <div>
                <Label>Custom Webhook Body</Label>
                <p class="text-muted-foreground text-sm">Override the default JSON payload</p>
              </div>
              <Switch
                checked={trigger.trigger_meta.has_webhook_body}
                onCheckedChange={(checked) => (trigger.trigger_meta.has_webhook_body = checked)}
              />
            </div>
            {#if trigger.trigger_meta.has_webhook_body}
              <p class="text-muted-foreground text-xs">
                Use Mustache variables like <code class="bg-muted rounded px-1">{"{{variable}}"}</code>. Available: id,
                alert_name, severity, status, source, timestamp, description, metric, current_value, threshold,
                action_text, action_url
              </p>
              <div class="overflow-hidden rounded-md border">
                <CodeMirror
                  bind:value={trigger.trigger_meta.webhook_body}
                  lang={json()}
                  theme={mode.current === "dark" ? githubDark : githubLight}
                  styles={{ "&": { width: "100%", height: "300px" } }}
                />
              </div>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Discord Specific -->
    {#if trigger.trigger_type === "discord"}
      <Card.Root>
        <Card.Header>
          <Card.Title>Discord Configuration</Card.Title>
          <Card.Description>Configure custom payload for Discord</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <Label>Custom Discord Payload</Label>
              <p class="text-muted-foreground text-sm">Override the default Discord message</p>
            </div>
            <Switch
              checked={trigger.trigger_meta.has_discord_body}
              onCheckedChange={(checked) => (trigger.trigger_meta.has_discord_body = checked)}
            />
          </div>
          {#if trigger.trigger_meta.has_discord_body}
            <p class="text-muted-foreground text-xs">
              Use Mustache variables. Available: site_name, logo_url, alert_name, status, is_triggered, is_resolved,
              description, metric, severity, id, current_value, threshold, source, action_text, action_url
            </p>
            <div class="overflow-hidden rounded-md border">
              <CodeMirror
                bind:value={trigger.trigger_meta.discord_body}
                lang={json()}
                theme={mode.current === "dark" ? githubDark : githubLight}
                styles={{ "&": { width: "100%", height: "300px" } }}
              />
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Slack Specific -->
    {#if trigger.trigger_type === "slack"}
      <Card.Root>
        <Card.Header>
          <Card.Title>Slack Configuration</Card.Title>
          <Card.Description>Configure custom payload for Slack</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <Label>Custom Slack Payload</Label>
              <p class="text-muted-foreground text-sm">Override the default Slack message</p>
            </div>
            <Switch
              checked={trigger.trigger_meta.has_slack_body}
              onCheckedChange={(checked) => (trigger.trigger_meta.has_slack_body = checked)}
            />
          </div>
          {#if trigger.trigger_meta.has_slack_body}
            <p class="text-muted-foreground text-xs">
              Use Mustache variables. Available: site_name, logo_url, alert_name, status, is_triggered, is_resolved,
              description, metric, severity, id, current_value, threshold, source, action_text, action_url
            </p>
            <div class="overflow-hidden rounded-md border">
              <CodeMirror
                bind:value={trigger.trigger_meta.slack_body}
                lang={json()}
                theme={mode.current === "dark" ? githubDark : githubLight}
                styles={{ "&": { width: "100%", height: "300px" } }}
              />
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Email Specific -->
    {#if trigger.trigger_type === "email"}
      <Card.Root>
        <Card.Header>
          <Card.Title>Email Provider</Card.Title>
          <Card.Description>Select your email sending method</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <RadioGroup.Root bind:value={trigger.trigger_meta.email_type} class="flex gap-6">
            <div class="flex items-center gap-2">
              <RadioGroup.Item value="resend" id="email-resend" />
              <Label for="email-resend" class="cursor-pointer">Resend</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroup.Item value="smtp" id="email-smtp" />
              <Label for="email-smtp" class="cursor-pointer">SMTP</Label>
            </div>
          </RadioGroup.Root>

          {#if trigger.trigger_meta.email_type === "resend"}
            <p class="text-muted-foreground text-sm">
              Make sure <code class="bg-muted rounded px-1">RESEND_API_KEY</code> environment variable is set.
            </p>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- SMTP Settings -->
      {#if trigger.trigger_meta.email_type === "smtp"}
        <Card.Root>
          <Card.Header>
            <Card.Title>SMTP Settings</Card.Title>
            <Card.Description>Configure your SMTP server</Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="smtp-host">
                  Host <span class="text-destructive">*</span>
                </Label>
                <Input id="smtp-host" bind:value={trigger.trigger_meta.smtp_host} placeholder="smtp.example.com" />
              </div>
              <div class="space-y-2">
                <Label for="smtp-port">
                  Port <span class="text-destructive">*</span>
                </Label>
                <Input id="smtp-port" bind:value={trigger.trigger_meta.smtp_port} placeholder="587" />
              </div>
              <div class="space-y-2">
                <Label for="smtp-user">
                  Username <span class="text-destructive">*</span>
                </Label>
                <Input id="smtp-user" bind:value={trigger.trigger_meta.smtp_user} placeholder="user@example.com" />
              </div>
              <div class="space-y-2">
                <Label for="smtp-pass">
                  Password <span class="text-destructive">*</span>
                </Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  bind:value={trigger.trigger_meta.smtp_pass}
                  placeholder="********"
                />
              </div>
            </div>
            <div class="mt-4 flex items-center gap-2">
              <Switch
                id="smtp-secure"
                checked={trigger.trigger_meta.smtp_secure}
                onCheckedChange={(checked) => (trigger.trigger_meta.smtp_secure = checked)}
              />
              <Label for="smtp-secure">Use Secure Connection (TLS)</Label>
            </div>
            <p class="text-muted-foreground mt-2 text-xs">
              Generally, port 465 expects implicit SSL (secure: on), while port 587 and port 25 usually use STARTTLS
              (secure: off). If you are using SMTP on port 465, enable secure connection; otherwise, for ports 25 or
              587, leave it disabled.
            </p>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Email Recipients -->
      <Card.Root>
        <Card.Header>
          <Card.Title>Email Recipients</Card.Title>
          <Card.Description>Configure sender and recipient addresses</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
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
        </Card.Content>
      </Card.Root>

      <!-- Custom Email Template -->
      <Card.Root>
        <Card.Header>
          <Card.Title>Custom Email Template</Card.Title>
          <Card.Description>Override the default HTML email template</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <Label>Use Custom HTML Template</Label>
              <p class="text-muted-foreground text-sm">Create your own email design</p>
            </div>
            <Switch
              checked={trigger.trigger_meta.has_email_body}
              onCheckedChange={(checked) => (trigger.trigger_meta.has_email_body = checked)}
            />
          </div>
          {#if trigger.trigger_meta.has_email_body}
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
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}
  {/if}
</div>

<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import XIcon from "@lucide/svelte/icons/x";
  import Loader from "@lucide/svelte/icons/loader";
  import CheckIcon from "@lucide/svelte/icons/check";
  import { toast } from "svelte-sonner";
  import { IsValidURL } from "$lib/clientTools";

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
    email_type: "resend" | "smtp";
    smtp_host: string;
    smtp_port: string;
    smtp_user: string;
    smtp_pass: string;
    smtp_secure: boolean;
  }

  interface TemplateRecord {
    id: number;
    template_name: string;
    template_type: string;
    template_usage: string;
    template_json: string;
    created_at: string;
    updated_at: string;
  }

  // State
  let loading = $state(true);
  let saving = $state(false);
  let testing = $state<"idle" | "loading" | "success" | "error">("idle");
  let invalidFormMessage = $state("");
  let templates = $state<TemplateRecord[]>([]);
  let loadingTemplates = $state(false);

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
    template_id: number | null;
    trigger_meta: TriggerMeta;
  }>({
    id: 0,
    name: "",
    trigger_type: "webhook",
    trigger_desc: "",
    trigger_status: "ACTIVE",
    template_id: null,
    trigger_meta: {
      url: "",
      headers: [],
      to: "",
      from: "",
      email_type: "resend",
      smtp_host: "",
      smtp_port: "",
      smtp_user: "",
      smtp_pass: "",
      smtp_secure: false
    }
  });

  const triggerTypes = [
    { value: "webhook", label: "Webhook", icon: "/webhooks.svg" },
    { value: "discord", label: "Discord", icon: "/discord.svg" },
    { value: "slack", label: "Slack", icon: "/slack.svg" },
    { value: "email", label: "Email", icon: "/email.png" }
  ];

  async function fetchTemplates(triggerType: string) {
    loadingTemplates = true;
    try {
      const templateType = triggerType.toUpperCase();
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getTemplatesByTypeAndUsage",
          data: { template_type: templateType, template_usages: ["ALERT", "SUBSCRIPTION"] }
        })
      });
      const result = await response.json();
      if (result.error) {
        templates = [];
      } else {
        templates = result;
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      templates = [];
    } finally {
      loadingTemplates = false;
    }
  }

  async function fetchTrigger() {
    if (isNew) {
      loading = false;
      await fetchTemplates(trigger.trigger_type);
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
          template_id: foundTrigger.template_id || null,
          trigger_meta: {
            url: meta.url || "",
            headers: meta.headers || [],
            to: meta.to || "",
            from: meta.from || "",
            email_type: meta.email_type || "resend",
            smtp_host: meta.smtp_host || "",
            smtp_port: meta.smtp_port || "",
            smtp_user: meta.smtp_user || "",
            smtp_pass: meta.smtp_pass || "",
            smtp_secure: meta.smtp_secure || false
          }
        };
        await fetchTemplates(trigger.trigger_type);
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

    if (!trigger.name.trim()) {
      invalidFormMessage = "Trigger Name is required";
      return;
    }

    if (!trigger.trigger_type) {
      invalidFormMessage = "Trigger Type is required";
      return;
    }

    if (trigger.trigger_type === "webhook") {
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
      if (!trigger.trigger_meta.url.trim()) {
        invalidFormMessage = "URL is required";
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
            template_id: trigger.template_id,
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

  async function handleTriggerTypeChange(value: string | undefined) {
    if (!value) return;
    trigger.trigger_type = value;
    trigger.template_id = null;
    await fetchTemplates(value);
  }

  function handleTemplateChange(value: string | undefined) {
    trigger.template_id = value ? parseInt(value) : null;
  }

  $effect(() => {
    fetchTrigger();
  });
</script>

<div class="container max-w-2xl space-y-6 py-6">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="size-8" />
    </div>
  {:else}
    <!-- Header -->
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

    <!-- Error Message -->
    {#if invalidFormMessage}
      <div class="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">{invalidFormMessage}</div>
    {/if}

    <Card.Root>
      <Card.Header>
        <Card.Title>{isNew ? "Create Trigger" : "Edit Trigger"}</Card.Title>
        <Card.Description>Configure how alerts are sent when monitors fail</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Trigger Type -->
        <div class="space-y-2">
          <Label>Type <span class="text-destructive">*</span></Label>
          <Select.Root type="single" value={trigger.trigger_type} onValueChange={handleTriggerTypeChange}>
            <Select.Trigger class="w-full">
              <div class="flex items-center gap-2">
                {#if trigger.trigger_type}
                  <img src={triggerTypes.find((t) => t.value === trigger.trigger_type)?.icon} class="size-5" alt="" />
                {/if}
                <span>{triggerTypes.find((t) => t.value === trigger.trigger_type)?.label || "Select trigger type"}</span
                >
              </div>
            </Select.Trigger>
            <Select.Content>
              {#each triggerTypes as type}
                <Select.Item value={type.value}>
                  <div class="flex items-center gap-2">
                    <img src={type.icon} class="size-5" alt="" />
                    {type.label}
                  </div>
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Basic Info -->
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="trigger-name">Name <span class="text-destructive">*</span></Label>
            <Input id="trigger-name" bind:value={trigger.name} placeholder="My Trigger" />
          </div>
          <div class="space-y-2">
            <Label for="trigger-desc">Description</Label>
            <Input id="trigger-desc" bind:value={trigger.trigger_desc} placeholder="Optional description" />
          </div>
        </div>

        <!-- Status -->
        <div class="flex items-center justify-between rounded-lg border p-3">
          <Label>Active</Label>
          <Switch
            checked={trigger.trigger_status === "ACTIVE"}
            onCheckedChange={(checked) => (trigger.trigger_status = checked ? "ACTIVE" : "INACTIVE")}
          />
        </div>

        <!-- URL (for non-email types) -->
        {#if trigger.trigger_type !== "email"}
          <div class="space-y-2">
            <Label for="trigger-url">
              {trigger.trigger_type === "discord"
                ? "Discord Webhook URL"
                : trigger.trigger_type === "slack"
                  ? "Slack Webhook URL"
                  : "Webhook URL"}
              <span class="text-destructive">*</span>
            </Label>
            <Input
              id="trigger-url"
              bind:value={trigger.trigger_meta.url}
              placeholder={trigger.trigger_type === "discord"
                ? "https://discord.com/api/webhooks/..."
                : trigger.trigger_type === "slack"
                  ? "https://hooks.slack.com/services/..."
                  : "https://example.com/webhook"}
            />
          </div>
        {/if}

        <!-- Webhook Headers -->
        {#if trigger.trigger_type === "webhook"}
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
        {/if}

        <!-- Email Settings -->
        {#if trigger.trigger_type === "email"}
          <!-- Email Provider -->
          <div class="space-y-2">
            <Label>Email Provider</Label>
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
              <p class="text-muted-foreground text-xs">
                Make sure <code class="bg-muted rounded px-1">RESEND_API_KEY</code> environment variable is set.
              </p>
            {/if}
          </div>

          <!-- SMTP Settings -->
          {#if trigger.trigger_meta.email_type === "smtp"}
            <div class="space-y-3 rounded-lg border p-4">
              <Label class="text-sm font-medium">SMTP Settings</Label>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-2">
                  <Label for="smtp-host" class="text-xs">Host <span class="text-destructive">*</span></Label>
                  <Input id="smtp-host" bind:value={trigger.trigger_meta.smtp_host} placeholder="smtp.example.com" />
                </div>
                <div class="space-y-2">
                  <Label for="smtp-port" class="text-xs">Port <span class="text-destructive">*</span></Label>
                  <Input id="smtp-port" bind:value={trigger.trigger_meta.smtp_port} placeholder="587" />
                </div>
                <div class="space-y-2">
                  <Label for="smtp-user" class="text-xs">Username <span class="text-destructive">*</span></Label>
                  <Input id="smtp-user" bind:value={trigger.trigger_meta.smtp_user} placeholder="user@example.com" />
                </div>
                <div class="space-y-2">
                  <Label for="smtp-pass" class="text-xs">Password <span class="text-destructive">*</span></Label>
                  <Input
                    id="smtp-pass"
                    type="password"
                    bind:value={trigger.trigger_meta.smtp_pass}
                    placeholder="********"
                  />
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Switch
                  id="smtp-secure"
                  checked={trigger.trigger_meta.smtp_secure}
                  onCheckedChange={(checked) => (trigger.trigger_meta.smtp_secure = checked)}
                />
                <Label for="smtp-secure" class="text-xs">Use Secure Connection (TLS)</Label>
              </div>
            </div>
          {/if}

          <!-- Email Recipients -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="email-to">To (comma separated) <span class="text-destructive">*</span></Label>
              <Input
                id="email-to"
                bind:value={trigger.trigger_meta.to}
                placeholder="john@example.com, jane@example.com"
              />
            </div>
            <div class="space-y-2">
              <Label for="email-from">From <span class="text-destructive">*</span></Label>
              <Input id="email-from" bind:value={trigger.trigger_meta.from} placeholder="Alerts <alert@example.com>" />
              <p class="text-muted-foreground text-xs">Format: Name &lt;email@example.com&gt;</p>
            </div>
          </div>
        {/if}

        <!-- Template Selection -->
        <div class="space-y-2">
          <Label>Template</Label>
          {#if loadingTemplates}
            <div class="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader class="size-4 animate-spin" />
              Loading templates...
            </div>
          {:else if templates.length === 0}
            <p class="text-muted-foreground text-sm">
              No ALERT templates available for {trigger.trigger_type}.
              <a href="/manage/app/templates/new" class="text-primary underline">Create one</a>
            </p>
          {:else}
            <Select.Root
              type="single"
              value={trigger.template_id ? String(trigger.template_id) : undefined}
              onValueChange={handleTemplateChange}
            >
              <Select.Trigger class="w-full">
                {trigger.template_id
                  ? templates.find((t) => t.id === trigger.template_id)?.template_name
                  : "Select a template (optional)"}
              </Select.Trigger>
              <Select.Content>
                {#each templates as template}
                  <Select.Item value={String(template.id)}>{template.template_name}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          {/if}
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-between">
        <div class="flex gap-2">
          {#if !isNew}
            <Button variant="outline" onclick={testTrigger} disabled={testing === "loading"}>
              {#if testing === "loading"}
                <Loader class="mr-2 size-4 animate-spin" />
              {:else if testing === "success"}
                <CheckIcon class="mr-2 size-4 text-green-500" />
              {:else if testing === "error"}
                <XIcon class="mr-2 size-4 text-red-500" />
              {/if}
              Test
            </Button>
          {/if}
        </div>
        <Button onclick={saveTrigger} disabled={saving}>
          {#if saving}
            <Loader class="mr-2 size-4 animate-spin" />
          {:else}
            <SaveIcon class="mr-2 size-4" />
          {/if}
          {isNew ? "Create" : "Save"}
        </Button>
      </Card.Footer>
    </Card.Root>
  {/if}
</div>

<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import WebhookIcon from "@lucide/svelte/icons/webhook";
  import MailIcon from "@lucide/svelte/icons/mail";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import HashIcon from "@lucide/svelte/icons/hash";
  import { toast } from "svelte-sonner";
  import { mode } from "mode-watcher";
  import { DiscordJSONTemplate, WebhookJSONTemplate, SlackJSONTemplate, EmailHTMLTemplate } from "$lib/anywhere";
  import CodeMirror from "svelte-codemirror-editor";
  import { json } from "@codemirror/lang-json";
  import { html } from "@codemirror/lang-html";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";

  // Types
  type TemplateType = "EMAIL" | "WEBHOOK" | "SLACK" | "DISCORD";
  type TemplateUsage = "ALERT" | "SUBSCRIPTION";

  interface EmailTemplateJson {
    email_subject: string;
    email_body: string;
  }

  interface WebhookTemplateJson {
    webhook_body: string;
  }

  interface SlackTemplateJson {
    slack_body: string;
  }

  interface DiscordTemplateJson {
    discord_body: string;
  }

  // State
  let loading = $state(true);
  let saving = $state(false);
  let invalidFormMessage = $state("");

  // Get template ID from URL params
  const templateId = $derived($page.params.template_id);
  const isNew = $derived(templateId === "new");

  // Form state
  let template = $state<{
    id: number;
    template_name: string;
    template_type: TemplateType;
    template_usage: TemplateUsage;
    email_subject: string;
    email_body: string;
    webhook_body: string;
    slack_body: string;
    discord_body: string;
  }>({
    id: 0,
    template_name: "",
    template_type: "EMAIL",
    template_usage: "ALERT",
    email_subject: "",
    email_body: EmailHTMLTemplate,
    webhook_body: WebhookJSONTemplate,
    slack_body: SlackJSONTemplate,
    discord_body: DiscordJSONTemplate
  });

  async function fetchTemplate() {
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
          action: "getTemplateById",
          data: { id: parseInt(templateId || "0") }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
        goto("/manage/app/templates");
        return;
      }

      const parsedJson = JSON.parse(result.template_json);
      template = {
        id: result.id,
        template_name: result.template_name,
        template_type: result.template_type,
        template_usage: result.template_usage,
        email_subject: parsedJson.email_subject || "",
        email_body: parsedJson.email_body || EmailHTMLTemplate,
        webhook_body: parsedJson.webhook_body || WebhookJSONTemplate,
        slack_body: parsedJson.slack_body || SlackJSONTemplate,
        discord_body: parsedJson.discord_body || DiscordJSONTemplate
      };
    } catch (error) {
      console.error("Error fetching template:", error);
      toast.error("Failed to load template");
      goto("/manage/app/templates");
    } finally {
      loading = false;
    }
  }

  function getTemplateJson(): string {
    switch (template.template_type) {
      case "EMAIL":
        return JSON.stringify({
          email_subject: template.email_subject,
          email_body: template.email_body
        } as EmailTemplateJson);
      case "WEBHOOK":
        return JSON.stringify({
          webhook_body: template.webhook_body
        } as WebhookTemplateJson);
      case "SLACK":
        return JSON.stringify({
          slack_body: template.slack_body
        } as SlackTemplateJson);
      case "DISCORD":
        return JSON.stringify({
          discord_body: template.discord_body
        } as DiscordTemplateJson);
      default:
        return "{}";
    }
  }

  async function saveTemplate() {
    invalidFormMessage = "";

    // Validation
    if (!template.template_name.trim()) {
      invalidFormMessage = "Template Name is required";
      return;
    }

    if (!template.template_type) {
      invalidFormMessage = "Template Type is required";
      return;
    }

    if (!template.template_usage) {
      invalidFormMessage = "Template Usage is required";
      return;
    }

    saving = true;
    try {
      const action = isNew ? "createTemplate" : "updateTemplate";
      const data = isNew
        ? {
            template_name: template.template_name,
            template_type: template.template_type,
            template_usage: template.template_usage,
            template_json: getTemplateJson()
          }
        : {
            id: template.id,
            template_name: template.template_name,
            template_type: template.template_type,
            template_usage: template.template_usage,
            template_json: getTemplateJson()
          };

      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data })
      });
      const result = await response.json();
      if (result.error) {
        invalidFormMessage = result.error;
      } else {
        toast.success(isNew ? "Template created successfully" : "Template updated successfully");
        if (isNew) {
          goto("/manage/app/templates");
        }
      }
    } catch (error) {
      invalidFormMessage = "Failed to save template";
    } finally {
      saving = false;
    }
  }

  function getTemplateIcon(type: TemplateType) {
    switch (type) {
      case "WEBHOOK":
        return WebhookIcon;
      case "EMAIL":
        return MailIcon;
      case "SLACK":
        return HashIcon;
      case "DISCORD":
        return MessageSquareIcon;
      default:
        return FileTextIcon;
    }
  }

  $effect(() => {
    fetchTemplate();
  });
</script>

<div class="container space-y-6 py-6">
  <!-- Breadcrumb -->
  {#if loading}
    <div class="flex h-96 items-center justify-center">
      <Spinner class="size-8" />
    </div>
  {:else}
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/manage/app/templates">Templates</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Page>{isNew ? "New Template" : template.template_name}</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" onclick={() => goto("/manage/app/templates")}>
          <ArrowLeftIcon class="size-5" />
        </Button>
        {#if template.template_type === "WEBHOOK"}
          <WebhookIcon class="text-muted-foreground size-6" />
        {:else if template.template_type === "EMAIL"}
          <MailIcon class="text-muted-foreground size-6" />
        {:else if template.template_type === "SLACK"}
          <HashIcon class="text-muted-foreground size-6" />
        {:else if template.template_type === "DISCORD"}
          <MessageSquareIcon class="text-muted-foreground size-6" />
        {:else}
          <FileTextIcon class="text-muted-foreground size-6" />
        {/if}
        <div>
          <h1 class="text-2xl font-bold">{isNew ? "New Template" : "Edit Template"}</h1>
          <p class="text-muted-foreground text-sm">
            {isNew ? "Create a new notification template" : `Editing ${template.template_name}`}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button onclick={saveTemplate} disabled={saving}>
          {#if saving}
            <Spinner class="mr-2 size-4" />
          {:else}
            <SaveIcon class="mr-2 size-4" />
          {/if}
          {isNew ? "Create Template" : "Save Changes"}
        </Button>
      </div>
    </div>

    <!-- Error Message -->
    {#if invalidFormMessage}
      <div class="bg-destructive/10 text-destructive rounded-lg border p-4">{invalidFormMessage}</div>
    {/if}

    <!-- Template Type Selection -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Template Type</Card.Title>
        <Card.Description>Select the type of notification template</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-4 gap-3">
          {#each ["EMAIL", "WEBHOOK", "SLACK", "DISCORD"] as type}
            <Button
              variant={template.template_type === type ? "default" : "outline"}
              class="h-20 flex-col gap-2"
              onclick={() => (template.template_type = type as TemplateType)}
            >
              {#if type === "WEBHOOK"}
                <WebhookIcon class="size-6" />
              {:else if type === "SLACK"}
                <HashIcon class="size-6" />
              {:else if type === "DISCORD"}
                <MessageSquareIcon class="size-6" />
              {:else if type === "EMAIL"}
                <MailIcon class="size-6" />
              {:else}
                <FileTextIcon class="size-6" />
              {/if}
              <span class="capitalize">{type.toLowerCase()}</span>
            </Button>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Basic Info -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Basic Information</Card.Title>
        <Card.Description>Name and usage for this template</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- Name -->
        <div class="space-y-2">
          <Label for="template-name">
            Template Name <span class="text-destructive">*</span>
          </Label>
          <Input id="template-name" bind:value={template.template_name} placeholder="My Template" />
        </div>

        <!-- Usage -->
        <div class="space-y-2">
          <Label>Template Usage <span class="text-destructive">*</span></Label>
          <div class="flex gap-3">
            <Button
              variant={template.template_usage === "ALERT" ? "default" : "outline"}
              onclick={() => (template.template_usage = "ALERT")}
            >
              Alert
            </Button>
            <Button
              variant={template.template_usage === "SUBSCRIPTION" ? "default" : "outline"}
              onclick={() => (template.template_usage = "SUBSCRIPTION")}
            >
              Subscription
            </Button>
          </div>
          <p class="text-muted-foreground text-xs">
            {template.template_usage === "ALERT"
              ? "Used for alert notifications sent to triggers"
              : "Used for subscription notifications sent to subscribers"}
          </p>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Email Template -->
    {#if template.template_type === "EMAIL"}
      <Card.Root>
        <Card.Header>
          <Card.Title>Email Template</Card.Title>
          <Card.Description>Configure the email subject and body</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <!-- Subject -->
          <div class="space-y-2">
            <Label for="email-subject">Email Subject</Label>
            <Input
              id="email-subject"
              bind:value={template.email_subject}
              placeholder={"Alert: {{alert_name}} is {{status}}"}
            />
            <p class="text-muted-foreground text-xs">
              Use Mustache variables like <code class="bg-muted rounded px-1">{"{{variable}}"}</code>. Available:
              alert_name, status, severity, description, etc.
            </p>
          </div>

          <!-- Body -->
          <div class="space-y-2">
            <Label>Email Body (HTML)</Label>
            <p class="text-muted-foreground text-xs">
              Use Mustache variables. Available: site_name, logo_url, alert_name, status, is_triggered, is_resolved,
              description, metric, severity, id, current_value, threshold, source, action_text, action_url
            </p>
            <div class="overflow-hidden rounded-md border">
              <CodeMirror
                bind:value={template.email_body}
                lang={html()}
                theme={mode.current === "dark" ? githubDark : githubLight}
                styles={{ "&": { width: "100%", height: "400px" } }}
              />
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Webhook Template -->
    {#if template.template_type === "WEBHOOK"}
      <Card.Root>
        <Card.Header>
          <Card.Title>Webhook Template</Card.Title>
          <Card.Description>Configure the webhook payload template</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <p class="text-muted-foreground text-xs">
            Use Mustache variables like <code class="bg-muted rounded px-1">{"{{variable}}"}</code>. Available: id,
            alert_name, severity, status, source, timestamp, description, metric, current_value, threshold, action_text,
            action_url
          </p>
          <div class="space-y-2">
            <Label>Webhook Body Template</Label>
            <textarea
              bind:value={template.webhook_body}
              class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[400px] w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter webhook body template"
            ></textarea>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Slack Template -->
    {#if template.template_type === "SLACK"}
      <Card.Root>
        <Card.Header>
          <Card.Title>Slack Template</Card.Title>
          <Card.Description>Configure the Slack payload template</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <p class="text-muted-foreground text-xs">
            Use Mustache variables like <code class="bg-muted rounded px-1">{"{{variable}}"}}</code>. Available:
            site_name, logo_url, alert_name, status, is_triggered, is_resolved, description, metric, severity, id,
            current_value, threshold, source, action_text, action_url
          </p>
          <div class="space-y-2">
            <Label>Slack Body Template</Label>
            <textarea
              bind:value={template.slack_body}
              class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[400px] w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter Slack body template"
            ></textarea>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Discord Template -->
    {#if template.template_type === "DISCORD"}
      <Card.Root>
        <Card.Header>
          <Card.Title>Discord Template</Card.Title>
          <Card.Description>Configure the Discord payload template</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <p class="text-muted-foreground text-xs">
            Use Mustache variables like <code class="bg-muted rounded px-1">{"{{variable}}"}}</code>. Available:
            site_name, logo_url, alert_name, status, is_triggered, is_resolved, description, metric, severity, id,
            current_value, threshold, source, action_text, action_url
          </p>
          <div class="space-y-2">
            <Label>Discord Body Template</Label>
            <textarea
              bind:value={template.discord_body}
              class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[400px] w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter Discord body template"
            ></textarea>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  {/if}
</div>

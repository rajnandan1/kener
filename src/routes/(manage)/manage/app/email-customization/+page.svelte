<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import MailIcon from "@lucide/svelte/icons/mail";
  import KeyIcon from "@lucide/svelte/icons/key";
  import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
  import LockIcon from "@lucide/svelte/icons/lock";
  import SaveIcon from "@lucide/svelte/icons/save";
  import { toast } from "svelte-sonner";
  import { onMount } from "svelte";

  // Types
  interface EmailTemplateConfig {
    id: number;
    email_type: string;
    email_template_id: number | null;
    is_active: string;
    template_name: string | null;
    label: string;
    description: string;
    created_at: string;
    updated_at: string;
  }

  interface TemplateRecord {
    id: number;
    template_name: string;
    template_type: string;
  }

  // State
  let loading = $state(true);
  let saving = $state(false);
  let configs = $state<EmailTemplateConfig[]>([]);
  let emailTemplates = $state<TemplateRecord[]>([]);

  // Icon mapping for email types
  const emailTypeIcons: Record<string, typeof MailIcon> = {
    email_code: KeyIcon,
    forgot_password: LockIcon,
    verify_email: ShieldCheckIcon
  };

  // API functions
  async function loadConfigs() {
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getEmailTemplateConfigs" })
      });
      const result = await res.json();
      if (!result.error && Array.isArray(result)) {
        configs = result;
      }
    } catch (error) {
      console.error("Error loading email template configs:", error);
      toast.error("Failed to load email configurations");
    }
  }

  async function loadTemplates() {
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getEmailTemplates" })
      });
      const result = await res.json();
      if (!result.error && Array.isArray(result)) {
        emailTemplates = result;
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load email templates");
    }
  }

  async function saveConfigs() {
    saving = true;
    try {
      const configsToSave = configs.map((c) => ({
        email_type: c.email_type,
        email_template_id: c.email_template_id,
        is_active: c.is_active
      }));

      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateEmailTemplateConfigs",
          data: { configs: configsToSave }
        })
      });
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Email configurations saved successfully");
      }
    } catch (error) {
      console.error("Error saving email configs:", error);
      toast.error("Failed to save email configurations");
    } finally {
      saving = false;
    }
  }

  function handleTemplateChange(emailType: string, value: string) {
    const configIndex = configs.findIndex((c) => c.email_type === emailType);
    if (configIndex !== -1) {
      configs[configIndex].email_template_id = value === "none" ? null : parseInt(value);
    }
  }

  function handleActiveChange(emailType: string, checked: boolean) {
    const configIndex = configs.findIndex((c) => c.email_type === emailType);
    if (configIndex !== -1) {
      configs[configIndex].is_active = checked ? "YES" : "NO";
    }
  }

  function getTemplateName(templateId: number | null): string {
    if (!templateId) return "Not selected";
    const template = emailTemplates.find((t) => t.id === templateId);
    return template?.template_name || "Unknown template";
  }

  // Initial load
  onMount(async () => {
    await Promise.all([loadConfigs(), loadTemplates()]);
    loading = false;
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <MailIcon class="text-muted-foreground size-6" />
      <div>
        <h1 class="text-2xl font-bold">Email Customization</h1>
        <p class="text-muted-foreground text-sm">Configure email templates for different email types</p>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="flex h-96 items-center justify-center">
      <Spinner class="size-8" />
    </div>
  {:else}
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-2">
          <MailIcon class="text-muted-foreground size-5" />
          <div>
            <Card.Title>Email Template Configuration</Card.Title>
            <Card.Description>
              Select which email template to use for each email type and enable/disable them
            </Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#if emailTemplates.length === 0}
          <Alert.Root variant="default">
            <Alert.Description>
              No email templates available. <a href="/manage/app/templates/new" class="text-primary underline"
                >Create an email template</a
              > first before configuring email customization.
            </Alert.Description>
          </Alert.Root>
        {/if}

        {#each configs as config (config.id)}
          {@const IconComponent = emailTypeIcons[config.email_type] || MailIcon}
          <div class="rounded-lg border p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="bg-primary/10 rounded-lg p-2">
                  <IconComponent class="text-primary size-5" />
                </div>
                <div>
                  <Label class="font-medium">{config.label}</Label>
                  <p class="text-muted-foreground text-xs">{config.description}</p>
                </div>
              </div>
              <Switch
                checked={config.is_active === "YES"}
                onCheckedChange={(checked) => handleActiveChange(config.email_type, checked)}
              />
            </div>

            <div class="mt-4 flex items-center gap-4">
              <Label class="min-w-32 text-sm">Email Template</Label>
              <Select.Root
                type="single"
                value={config.email_template_id ? String(config.email_template_id) : "none"}
                onValueChange={(v) => handleTemplateChange(config.email_type, v)}
                disabled={emailTemplates.length === 0}
              >
                <Select.Trigger class="w-full">
                  {getTemplateName(config.email_template_id)}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="none">Not selected</Select.Item>
                  {#each emailTemplates as template (template.id)}
                    <Select.Item value={String(template.id)}>{template.template_name}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>

            {#if config.is_active === "YES" && !config.email_template_id}
              <p class="text-muted-foreground mt-2 text-xs">
                ⚠️ This email type is enabled but no template is selected. Emails won't be sent until a template is
                configured.
              </p>
            {/if}
          </div>
        {/each}

        {#if configs.length === 0}
          <div class="text-muted-foreground py-8 text-center">
            No email configurations found. Please run database migrations.
          </div>
        {/if}
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveConfigs} disabled={saving || loading}>
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

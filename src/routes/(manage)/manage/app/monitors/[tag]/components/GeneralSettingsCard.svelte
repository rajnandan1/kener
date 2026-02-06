<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import UploadIcon from "@lucide/svelte/icons/upload";
  import XIcon from "@lucide/svelte/icons/x";
  import ImageIcon from "@lucide/svelte/icons/image";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import { toast } from "svelte-sonner";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  interface Props {
    monitor: MonitorRecord;
    typeData: Record<string, unknown>;
    isNew: boolean;
  }

  let { monitor = $bindable(), typeData, isNew }: Props = $props();

  let savingGeneral = $state(false);
  let uploadingImage = $state(false);

  async function handleImageUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Allowed: PNG, JPG, SVG, WebP");
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 2MB");
      return;
    }

    uploadingImage = true;

    try {
      const base64 = await fileToBase64(file);

      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "uploadImage",
          data: {
            base64,
            mimeType: file.type,
            fileName: file.name,
            maxWidth: 128,
            maxHeight: 128,
            prefix: "monitor_"
          }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        monitor.image = result.url;
        toast.success("Image uploaded successfully");
      }
    } catch (e) {
      toast.error("Failed to upload image");
    } finally {
      uploadingImage = false;
      input.value = "";
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  function clearImage() {
    monitor.image = "";
  }

  async function saveGeneralSettings() {
    savingGeneral = true;

    try {
      const payload: Record<string, unknown> = {
        ...monitor,
        type_data: JSON.stringify(typeData)
      };

      // Include default uptime settings when creating a new monitor
      if (isNew) {
        payload.monitor_settings_json = JSON.stringify({
          uptime_formula_numerator: "up + maintenance",
          uptime_formula_denominator: "up + maintenance + down + degraded"
        });
      }

      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "storeMonitorData", data: payload })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else if (isNew) {
        toast.success("Monitor created successfully");
        goto(clientResolver(resolve, `/manage/app/monitors/${monitor.tag}`));
      } else {
        toast.success("General settings saved successfully");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save general settings";
      toast.error(message);
    } finally {
      savingGeneral = false;
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>General Settings</Card.Title>
    <Card.Description>Basic information about this monitor</Card.Description>
  </Card.Header>
  <Card.Content class="space-y-4">
    <div class="grid grid-cols-2 gap-4">
      <div class="flex flex-col gap-2">
        <Label for="monitor-name">Name <span class="text-destructive">*</span></Label>
        <Input id="monitor-name" bind:value={monitor.name} placeholder="My API Monitor" />
      </div>
      <div class="flex flex-col gap-2">
        <Label for="monitor-tag">Tag <span class="text-destructive">*</span></Label>
        <Input id="monitor-tag" bind:value={monitor.tag} placeholder="my-api-monitor" disabled={!isNew} />
        <p class="text-muted-foreground mt-1 text-xs">Unique identifier (cannot be changed after creation)</p>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <Label for="monitor-description">Description</Label>
      <Textarea
        id="monitor-description"
        bind:value={monitor.description}
        placeholder="A brief description of what this monitor checks"
        rows={3}
      />
    </div>
    <div class="flex flex-col gap-2">
      <Label for="monitor-external_url">Service URL</Label>
      <Input id="monitor-external_url" bind:value={monitor.external_url} placeholder="https://example.com/api/health" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="flex flex-col gap-2">
        <Label>Monitor Image</Label>
        <div class="flex items-center gap-3">
          <div class="bg-muted flex h-12 w-12 items-center justify-center rounded-md border">
            {#if monitor.image}
              <img src={monitor.image} alt="Monitor" class="max-h-10 max-w-10 object-contain" />
            {:else}
              <ImageIcon class="text-muted-foreground h-5 w-5" />
            {/if}
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={uploadingImage}
              onclick={() => document.getElementById("monitor-image-input")?.click()}
            >
              {#if uploadingImage}
                <Loader class="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              {:else}
                <UploadIcon class="mr-2 h-4 w-4" />
                Upload
              {/if}
            </Button>
            <input
              id="monitor-image-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              class="hidden"
              onchange={handleImageUpload}
              disabled={uploadingImage}
            />
            {#if monitor.image}
              <Button variant="ghost" size="icon" onclick={clearImage}>
                <XIcon class="h-4 w-4" />
              </Button>
            {/if}
          </div>
        </div>
        <p class="text-muted-foreground text-xs">Max 128x128px, PNG/JPG/SVG/WebP</p>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="monitor-cron">Cron Schedule</Label>
        <Input id="monitor-cron" bind:value={monitor.cron} placeholder="* * * * *" />
        <p class="text-muted-foreground mt-1 text-xs">How often to check (cron format)</p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="flex flex-col gap-2">
        <Label for="monitor-default-status">Default Status</Label>
        <Select.Root
          type="single"
          value={monitor.default_status}
          onValueChange={(v) => {
            if (v) monitor.default_status = v;
          }}
        >
          <Select.Trigger id="monitor-default-status" class="w-full">
            {monitor.default_status}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="UP">UP</Select.Item>
            <Select.Item value="DOWN">DOWN</Select.Item>
            <Select.Item value="DEGRADED">DEGRADED</Select.Item>
            <Select.Item value="MAINTENANCE">MAINTENANCE</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="hidden-switch">Hidden in Status Page</Label>
        <div class="flex items-center gap-2">
          <Switch
            id="hidden-switch"
            checked={monitor.is_hidden === "YES"}
            onCheckedChange={(checked) => (monitor.is_hidden = checked ? "YES" : "NO")}
          />
          <span class="text-muted-foreground text-xs">
            {monitor.is_hidden === "YES" ? "Hidden" : "Visible"}
          </span>
        </div>
        <p class="text-muted-foreground text-xs">
          Hidden monitors won't appear on any status pages, but monitoring, alerting, and all other features will
          continue to work normally.
        </p>
      </div>
    </div>
  </Card.Content>
  <Card.Footer class="flex justify-end">
    <Button onclick={saveGeneralSettings} disabled={savingGeneral}>
      {#if savingGeneral}
        <Loader class="mr-2 size-4 animate-spin" />
      {:else}
        <SaveIcon class="mr-2 size-4" />
      {/if}
      {isNew ? "Create Monitor" : "Save General Settings"}
    </Button>
  </Card.Footer>
</Card.Root>

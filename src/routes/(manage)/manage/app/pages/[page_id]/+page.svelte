<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { toast } from "svelte-sonner";
  import Loader from "@lucide/svelte/icons/loader";
  import SaveIcon from "@lucide/svelte/icons/save";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import XIcon from "@lucide/svelte/icons/x";
  import UploadIcon from "@lucide/svelte/icons/upload";
  import ImageIcon from "@lucide/svelte/icons/image";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import type { PageRecord, MonitorRecord, PageSettingsType } from "$lib/server/types/db.js";
  import { mode } from "mode-watcher";
  import CodeMirror from "svelte-codemirror-editor";
  import { onMount } from "svelte";
  import { markdown } from "@codemirror/lang-markdown";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import GC from "$lib/global-constants.js";

  // Default page settings
  const defaultPageSettings: PageSettingsType = {
    monitor_status_history_days: {
      desktop: 90,
      mobile: 30
    },
    monitor_layout_style: "default-list"
  };

  interface PageWithMonitors extends PageRecord {
    monitors?: { monitor_tag: string }[];
  }

  // Get page ID from URL params
  const pageId = $derived(page.params.page_id);
  const isNew = $derived(pageId === "new");

  // State
  let loading = $state(true);
  let saving = $state(false);
  let savingMonitors = $state(false);
  let uploadingLogo = $state(false);

  // Page data
  let currentPage = $state<PageWithMonitors | null>(null);
  let monitors = $state<MonitorRecord[]>([]);

  // Form state
  let formData = $state({
    page_path: "",
    page_title: "",
    page_header: "",
    page_subheader: "",
    page_logo: ""
  });

  // Monitor selection
  let selectedMonitorTag = $state("");
  let selectedMonitors = $state<string[]>([]);
  let addingMonitor = $state(false);
  let removingMonitor = $state<string | null>(null);

  // Delete state
  let deleteConfirmText = $state("");
  let deleting = $state(false);
  const canDelete = $derived(
    !isNew &&
      currentPage &&
      currentPage.page_path !== "" &&
      deleteConfirmText === `delete ${currentPage?.page_path || "home"}`
  );

  // Page settings state
  let pageSettings = $state<PageSettingsType>(structuredClone(defaultPageSettings));
  let savingSettings = $state(false);

  // Validation
  const isFormValid = $derived(formData.page_title.trim().length > 0 && formData.page_header.trim().length > 0);

  async function fetchPage() {
    if (isNew) {
      loading = false;
      return;
    }

    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getPages" })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
        goto(clientResolver(resolve, "/manage/app/pages"));
        return;
      }

      const foundPage = result.find((p: PageWithMonitors) => p.id === parseInt(pageId || "0"));
      if (foundPage) {
        currentPage = foundPage;
        formData = {
          page_path: foundPage.page_path,
          page_title: foundPage.page_title,
          page_header: foundPage.page_header,
          page_subheader: foundPage.page_subheader || "",
          page_logo: foundPage.page_logo || ""
        };
        selectedMonitors = foundPage.monitors?.map((m: { monitor_tag: string }) => m.monitor_tag) || [];
        // Load page settings with defaults
        if (foundPage.page_settings_json) {
          try {
            const parsed =
              typeof foundPage.page_settings_json === "string"
                ? JSON.parse(foundPage.page_settings_json)
                : foundPage.page_settings_json;
            pageSettings = { ...structuredClone(defaultPageSettings), ...parsed };
          } catch {
            pageSettings = structuredClone(defaultPageSettings);
          }
        } else {
          pageSettings = structuredClone(defaultPageSettings);
        }
      } else {
        toast.error("Page not found");
        goto(clientResolver(resolve, "/manage/app/pages"));
      }
    } catch (e) {
      toast.error("Failed to load page");
      goto(clientResolver(resolve, "/manage/app/pages"));
    } finally {
      loading = false;
    }
  }

  async function fetchMonitors() {
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getMonitors", data: {} })
      });
      const result = await response.json();
      if (!result.error) {
        monitors = result;
      }
    } catch (e) {
      console.error("Failed to fetch monitors", e);
    }
  }

  async function savePage() {
    if (!isFormValid) return;

    saving = true;
    try {
      const action = isNew ? "createPage" : "updatePage";
      // Make page_path URL-friendly: lowercase, replace spaces with hyphens, remove special chars
      const sanitizedPath = formData.page_path
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9_-]/g, "");
      const data: Record<string, unknown> = {
        page_path: sanitizedPath,
        page_title: formData.page_title,
        page_header: formData.page_header,
        page_subheader: formData.page_subheader || null,
        page_logo: formData.page_logo || null
      };

      if (!isNew && currentPage) {
        data.id = currentPage.id;
      }

      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isNew ? "Page created successfully" : "Page updated successfully");
        if (isNew && result.id) {
          // Navigate to the newly created page
          goto(clientResolver(resolve, `/manage/app/pages/${result.id}`));
        } else if (isNew) {
          // Fallback: go back to pages list
          goto(clientResolver(resolve, "/manage/app/pages"));
        }
      }
    } catch (e) {
      toast.error(isNew ? "Failed to create page" : "Failed to update page");
    } finally {
      saving = false;
    }
  }

  async function addMonitorToPage() {
    if (!currentPage || !selectedMonitorTag) return;

    addingMonitor = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addMonitorToPage",
          data: {
            page_id: currentPage.id,
            monitor_tag: selectedMonitorTag
          }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Monitor added to page");
        selectedMonitors = [selectedMonitorTag, ...selectedMonitors.filter((tag) => tag !== selectedMonitorTag)];
        selectedMonitorTag = "";
      }
    } catch (e) {
      toast.error("Failed to add monitor");
    } finally {
      addingMonitor = false;
    }
  }

  async function deletePage() {
    if (!currentPage || !canDelete) return;

    deleting = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deletePage",
          data: { id: currentPage.id }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Page deleted successfully");
        goto(clientResolver(resolve, "/manage/app/pages"));
      }
    } catch (e) {
      toast.error("Failed to delete page");
    } finally {
      deleting = false;
    }
  }

  async function removeMonitorFromPage(monitorTag: string) {
    if (!currentPage) return;

    removingMonitor = monitorTag;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "removeMonitorFromPage",
          data: {
            page_id: currentPage.id,
            monitor_tag: monitorTag
          }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Monitor removed from page");
        selectedMonitors = selectedMonitors.filter((t) => t !== monitorTag);
      }
    } catch (e) {
      toast.error("Failed to remove monitor");
    } finally {
      removingMonitor = null;
    }
  }

  // Get available monitors (not already on the current page)
  const availableMonitors = $derived(monitors.filter((m) => !selectedMonitors.includes(m.tag)));

  // Image upload functions
  async function handleLogoUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Allowed: PNG, JPG, SVG, WebP");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > GC.MAX_UPLOAD_BYTES) {
      toast.error(`File too large. Maximum size is ${GC.MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
      return;
    }

    uploadingLogo = true;

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
            maxWidth: 256,
            maxHeight: 256,
            prefix: "page_logo_"
          }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        formData.page_logo = result.url;
        toast.success("Logo uploaded successfully");
      }
    } catch (e) {
      toast.error("Failed to upload logo");
    } finally {
      uploadingLogo = false;
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

  function clearLogo() {
    formData.page_logo = "";
  }

  async function savePageSettings() {
    if (!currentPage) return;

    savingSettings = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePage",
          data: {
            id: currentPage.id,
            page_settings_json: JSON.stringify(pageSettings)
          }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Page settings saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save page settings");
    } finally {
      savingSettings = false;
    }
  }

  onMount(() => {
    void fetchPage();
    void fetchMonitors();
  });
</script>

<div class="container space-y-6 py-6">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="size-8" />
    </div>
  {:else}
    <!-- Breadcrumb & Header -->
    <div class="flex items-center justify-between">
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href={clientResolver(resolve, "/manage/app/pages")}>Pages</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>{isNew ? "New Page" : currentPage?.page_title || "Edit Page"}</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
      <div>
        {#if !isNew}
          <Button
            variant="outline"
            target="_blank"
            size="sm"
            href={clientResolver(resolve, `/${currentPage?.page_path}`)}
          >
            View
          </Button>
        {/if}
      </div>
    </div>

    <!-- General Information Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>General Information</Card.Title>
        <Card.Description>
          {isNew ? "Create a new status page" : "Update page settings"}
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- Path -->
        <div class="space-y-2">
          <Label for="page-path">
            Path <span class="text-destructive">*</span>
          </Label>
          <Input
            id="page-path"
            type="text"
            bind:value={formData.page_path}
            disabled={!isNew && currentPage?.page_path === ""}
          />
          <p class="text-muted-foreground text-xs">
            {!isNew && currentPage?.page_path === ""
              ? "Home page path cannot be changed"
              : "URL path for the page (e.g., services, infrastructure). Will be made URL-friendly."}
          </p>
        </div>

        <!-- Title -->
        <div class="space-y-2">
          <Label for="page-title">
            Title <span class="text-destructive">*</span>
          </Label>
          <Input id="page-title" type="text" bind:value={formData.page_title} placeholder="Services Status" />
          <p class="text-muted-foreground text-xs">Page title shown in browser tab</p>
        </div>

        <!-- Header -->
        <div class="space-y-2">
          <Label for="page-header">
            Header <span class="text-destructive">*</span>
          </Label>
          <Input id="page-header" type="text" bind:value={formData.page_header} placeholder="Services Status" />
          <p class="text-muted-foreground text-xs">Main heading displayed on the page</p>
        </div>

        <!-- Subheader -->
        <div class="space-y-2">
          <Label for="page-subheader">Page Content</Label>
          <div class="overflow-hidden rounded-md border">
            <CodeMirror
              bind:value={formData.page_subheader}
              lang={markdown()}
              theme={mode.current === "dark" ? githubDark : githubLight}
              styles={{
                "&": {
                  width: "100%",
                  maxWidth: "100%",
                  height: "160px"
                }
              }}
            />
          </div>
          <p class="text-muted-foreground text-xs">Supports Markdown. Optional content below the header.</p>
        </div>

        <!-- Logo Upload -->
        <div class="space-y-2">
          <Label>Page Logo</Label>
          <div class="flex items-start gap-4">
            <div class="bg-muted flex h-16 w-16 items-center justify-center rounded-lg border">
              {#if formData.page_logo}
                <img
                  src={clientResolver(resolve, formData.page_logo)}
                  alt="Logo"
                  class="max-h-14 max-w-14 object-contain"
                />
              {:else}
                <ImageIcon class="text-muted-foreground h-6 w-6" />
              {/if}
            </div>
            <div class="flex flex-1 flex-col gap-2">
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  onclick={() => document.getElementById("page-logo-input")?.click()}
                >
                  {#if uploadingLogo}
                    <Loader class="h-4 w-4 animate-spin" />
                    Uploading...
                  {:else}
                    <UploadIcon class="h-4 w-4" />
                    Upload
                  {/if}
                </Button>
                <input
                  id="page-logo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  class="hidden"
                  onchange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
                {#if formData.page_logo}
                  <Button variant="ghost" size="sm" onclick={clearLogo}>
                    <XIcon class="h-4 w-4" />
                  </Button>
                {/if}
              </div>
              <p class="text-muted-foreground text-xs">Optional logo for this page (max 256x256px)</p>
            </div>
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={savePage} disabled={saving || !isFormValid}>
          {#if saving}
            <Loader class="h-4 w-4 animate-spin" />
            {isNew ? "Creating..." : "Saving..."}
          {:else}
            <SaveIcon class="h-4 w-4" />
            {isNew ? "Create Page" : "Save Changes"}
          {/if}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Monitors Card (only shown for existing pages) -->
    {#if !isNew && currentPage}
      <Card.Root>
        <Card.Header>
          <Card.Title>Page Monitors</Card.Title>
          <Card.Description>Select which monitors to display on this page</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <!-- Add Monitor -->
          <div class="flex gap-2">
            <Select.Root type="single" bind:value={selectedMonitorTag}>
              <Select.Trigger class="flex-1">
                {#if selectedMonitorTag}
                  {monitors.find((m) => m.tag === selectedMonitorTag)?.name || selectedMonitorTag}
                {:else}
                  Select a monitor to add
                {/if}
              </Select.Trigger>
              <Select.Content>
                {#each availableMonitors as monitor (monitor.tag)}
                  <Select.Item value={monitor.tag}>{monitor.name} ({monitor.tag})</Select.Item>
                {/each}
                {#if availableMonitors.length === 0}
                  <div class="text-muted-foreground px-2 py-1 text-sm">No available monitors</div>
                {/if}
              </Select.Content>
            </Select.Root>
            <Button onclick={addMonitorToPage} disabled={addingMonitor || !selectedMonitorTag}>
              {#if addingMonitor}
                <Loader class="h-4 w-4 animate-spin" />
              {:else}
                <PlusIcon class="h-4 w-4" />
                Add
              {/if}
            </Button>
          </div>

          <!-- Current Monitors -->
          <div class="space-y-2">
            <Label>Current Monitors</Label>
            {#if selectedMonitors.length > 0}
              <div class="space-y-2">
                {#each selectedMonitors as monitorTag (monitorTag)}
                  {@const monitor = monitors.find((m) => m.tag === monitorTag)}
                  <div class="bg-muted flex items-center justify-between rounded-lg p-3">
                    <div>
                      <p class="font-medium">{monitor?.name || monitorTag}</p>
                      <p class="text-muted-foreground text-xs">{monitorTag}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => removeMonitorFromPage(monitorTag)}
                      disabled={removingMonitor === monitorTag}
                    >
                      {#if removingMonitor === monitorTag}
                        <Loader class="h-4 w-4 animate-spin" />
                      {:else}
                        <XIcon class="h-4 w-4" />
                      {/if}
                    </Button>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-muted-foreground bg-muted rounded-lg p-4 text-center text-sm">
                No monitors added to this page yet
              </div>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Page Settings Card -->
      <Card.Root>
        <Card.Header>
          <Card.Title>Display Settings</Card.Title>
          <Card.Description>Configure what content is shown on this status page</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-6">
          <!-- Monitor Status History Days -->
          <div class="space-y-4">
            <div>
              <Label class="text-base font-medium">Monitor Status History</Label>
              <p class="text-muted-foreground text-sm">
                Configure how many days of status history to display on the status page
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="history-desktop">Desktop (days)</Label>
                <Input
                  id="history-desktop"
                  type="number"
                  min="1"
                  max="365"
                  bind:value={pageSettings.monitor_status_history_days.desktop}
                />
                <p class="text-muted-foreground text-xs">Number of days shown on desktop screens</p>
              </div>
              <div class="space-y-2">
                <Label for="history-mobile">Mobile (days)</Label>
                <Input
                  id="history-mobile"
                  type="number"
                  min="1"
                  max="365"
                  bind:value={pageSettings.monitor_status_history_days.mobile}
                />
                <p class="text-muted-foreground text-xs">Number of days shown on mobile screens</p>
              </div>
            </div>
          </div>

          <hr class="border-muted" />

          <!-- Monitor Layout Style -->
          <div class="space-y-4">
            <div>
              <Label class="text-base font-medium">Monitor Layout Style</Label>
              <p class="text-muted-foreground text-sm">Choose how monitors are displayed on the status page</p>
            </div>
            <Select.Root type="single" bind:value={pageSettings.monitor_layout_style}>
              <Select.Trigger class="w-full">
                {#if pageSettings.monitor_layout_style === "default-list"}
                  Default List
                {:else if pageSettings.monitor_layout_style === "default-grid"}
                  Default Grid
                {:else if pageSettings.monitor_layout_style === "compact-list"}
                  Compact List
                {:else}
                  Compact Grid
                {/if}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="default-list">Default List</Select.Item>
                <Select.Item value="default-grid">Default Grid</Select.Item>
                <Select.Item value="compact-list">Compact List</Select.Item>
                <Select.Item value="compact-grid">Compact Grid</Select.Item>
              </Select.Content>
            </Select.Root>
            <p class="text-muted-foreground text-xs">
              Default is <code class="bg-muted rounded px-1 font-mono">default-list</code>
            </p>
          </div>
        </Card.Content>
        <Card.Footer class="flex justify-end">
          <Button onclick={savePageSettings} disabled={savingSettings}>
            {#if savingSettings}
              <Loader class="h-4 w-4 animate-spin" />
              Saving...
            {:else}
              <SaveIcon class="h-4 w-4" />
              Save Preferences
            {/if}
          </Button>
        </Card.Footer>
      </Card.Root>

      <!-- Danger Zone Card (only for non-home pages) -->
      {#if currentPage.page_path !== ""}
        <Card.Root class="border-destructive">
          <Card.Header>
            <Card.Title class="text-destructive">Danger Zone</Card.Title>
            <Card.Description>Irreversible actions for this page</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div class="space-y-2">
              <Label for="delete-confirm">Delete Page</Label>
              <p class="text-muted-foreground text-sm">
                Once you delete a page, there is no going back. Please be certain.
              </p>
              <p class="text-muted-foreground text-sm">
                Type <code class="bg-muted rounded px-1 font-mono">delete {currentPage.page_path || "home"}</code> to confirm:
              </p>
              <Input
                id="delete-confirm"
                type="text"
                bind:value={deleteConfirmText}
                placeholder="delete {currentPage.page_path || 'home'}"
              />
            </div>
          </Card.Content>
          <Card.Footer class="flex justify-end">
            <Button variant="destructive" onclick={deletePage} disabled={!canDelete || deleting}>
              {#if deleting}
                <Loader class="h-4 w-4 animate-spin" />
                Deleting...
              {:else}
                <TrashIcon class="h-4 w-4" />
                Delete Page
              {/if}
            </Button>
          </Card.Footer>
        </Card.Root>
      {/if}
    {/if}
  {/if}
</div>

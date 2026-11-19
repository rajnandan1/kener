<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT, editorPhrases: adminEditorPhrases } = getAdminI18n();
  const editorLocale = $derived(EditorState.phrases.of($adminEditorPhrases));

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
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { toast } from "svelte-sonner";
  import Loader from "@lucide/svelte/icons/loader";
  import SaveIcon from "@lucide/svelte/icons/save";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import XIcon from "@lucide/svelte/icons/x";
  import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
  import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
  import UploadIcon from "@lucide/svelte/icons/upload";
  import ImageIcon from "@lucide/svelte/icons/image";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import type { PageRecord, MonitorRecord, PageSettingsType } from "$lib/server/types/db.js";
  import { mode } from "mode-watcher";
  import { EditorState } from "@codemirror/state";
  import CodeMirror from "$lib/components/manage/CodeEditor.svelte";
  import { onMount } from "svelte";
  import { markdown } from "@codemirror/lang-markdown";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import GC from "$lib/global-constants.js";

  // Default page settings
  const defaultPageSettings: PageSettingsType = {
    monitor_status_history_days: {
      desktop: GC.DEFAULT_STATUS_HISTORY_DAYS_DESKTOP,
      mobile: GC.DEFAULT_STATUS_HISTORY_DAYS_MOBILE
    },
    monitor_layout_style: GC.DEFAULT_MONITOR_LAYOUT_STYLE
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
  let uploadingSocialPreview = $state(false);

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
  let reordering = $state(false);

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
  const isHistoryDesktopValid = $derived(
    Number.isInteger(pageSettings.monitor_status_history_days.desktop) &&
      pageSettings.monitor_status_history_days.desktop >= GC.STATUS_HISTORY_DAYS_MIN &&
      pageSettings.monitor_status_history_days.desktop <= GC.STATUS_HISTORY_DAYS_MAX
  );
  const isHistoryMobileValid = $derived(
    Number.isInteger(pageSettings.monitor_status_history_days.mobile) &&
      pageSettings.monitor_status_history_days.mobile >= GC.STATUS_HISTORY_DAYS_MIN &&
      pageSettings.monitor_status_history_days.mobile <= GC.STATUS_HISTORY_DAYS_MAX
  );
  let savingDisplaySettings = $state(false);
  let savingSeoSettings = $state(false);

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
        toast.error($adminT(result.error));
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
        toast.error($adminT("Page not found"));
        goto(clientResolver(resolve, "/manage/app/pages"));
      }
    } catch (e) {
      toast.error($adminT("Failed to load page"));
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
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT(isNew ? "Page created successfully" : "Page updated successfully"));
        if (isNew && result.id) {
          // Navigate to the newly created page
          goto(clientResolver(resolve, `/manage/app/pages/${result.id}`));
        } else if (isNew) {
          // Fallback: go back to pages list
          goto(clientResolver(resolve, "/manage/app/pages"));
        }
      }
    } catch (e) {
      toast.error($adminT(isNew ? "Failed to create page" : "Failed to update page"));
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
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT("Monitor added to page"));
        selectedMonitors = [...selectedMonitors, selectedMonitorTag];
        selectedMonitorTag = "";
      }
    } catch (e) {
      toast.error($adminT("Failed to add monitor"));
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
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT("Page deleted successfully"));
        goto(clientResolver(resolve, "/manage/app/pages"));
      }
    } catch (e) {
      toast.error($adminT("Failed to delete page"));
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
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT("Monitor removed from page"));
        selectedMonitors = selectedMonitors.filter((t) => t !== monitorTag);
      }
    } catch (e) {
      toast.error($adminT("Failed to remove monitor"));
    } finally {
      removingMonitor = null;
    }
  }

  // Get available monitors (not already on the current page)
  const availableMonitors = $derived(monitors.filter((m) => !selectedMonitors.includes(m.tag)));

  async function moveMonitor(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedMonitors.length) return;

    const updated = [...selectedMonitors];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    selectedMonitors = updated;

    if (!currentPage) return;
    reordering = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorderPageMonitors",
          data: {
            page_id: currentPage.id,
            monitor_tags: selectedMonitors
          }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error($adminT(result.error));
      }
    } catch (e) {
      toast.error($adminT("Failed to reorder monitors"));
    } finally {
      reordering = false;
    }
  }

  // Image upload functions
  async function handleLogoUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error($adminT("Invalid file type. Allowed: PNG, JPG, SVG, WebP"));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > GC.MAX_UPLOAD_BYTES) {
      toast.error(
        $adminT("File too large. Maximum size is {value1}MB", { value1: GC.MAX_UPLOAD_BYTES / (1024 * 1024) })
      );
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
            maxHeight: 256
          }
        })
      });

      if (!response.ok) {
        toast.error($adminT("Failed to upload logo"));
        return;
      }
      const result = await response.json();
      if (result.error) {
        toast.error($adminT(result.error));
      } else {
        formData.page_logo = result.url;
        toast.success($adminT("Logo uploaded successfully"));
      }
    } catch (e) {
      toast.error($adminT("Failed to upload logo"));
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

  function clearSocialPreview() {
    pageSettings.socialPagePreviewImage = "";
  }

  async function handleSocialPreviewUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error($adminT("Invalid file type. Allowed: PNG, JPG, WebP"));
      return;
    }

    if (file.size > GC.MAX_UPLOAD_BYTES) {
      toast.error(
        $adminT("File too large. Maximum size is {value1}MB", { value1: GC.MAX_UPLOAD_BYTES / (1024 * 1024) })
      );
      return;
    }

    uploadingSocialPreview = true;
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
            maxWidth: 1200,
            maxHeight: 630
          }
        })
      });

      if (!response.ok) {
        toast.error($adminT("Failed to upload social preview image"));
        return;
      }
      const result = await response.json();
      if (result.error) {
        toast.error($adminT(result.error));
      } else {
        pageSettings.socialPagePreviewImage = result.url;
        toast.success($adminT("Social preview image uploaded"));
      }
    } catch (e) {
      toast.error($adminT("Failed to upload social preview image"));
    } finally {
      uploadingSocialPreview = false;
      input.value = "";
    }
  }

  async function savePageSettings(source: "display" | "seo") {
    if (!currentPage) return;

    if (source === "display" && (!isHistoryDesktopValid || !isHistoryMobileValid)) {
      toast.error(
        $adminT("Days must be a whole number between {STATUS_HISTORY_DAYS_MIN} and {STATUS_HISTORY_DAYS_MAX}", {
          STATUS_HISTORY_DAYS_MIN: GC.STATUS_HISTORY_DAYS_MIN,
          STATUS_HISTORY_DAYS_MAX: GC.STATUS_HISTORY_DAYS_MAX
        })
      );
      return;
    }

    if (source === "display") savingDisplaySettings = true;
    else savingSeoSettings = true;
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
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT("Page settings saved successfully"));
      }
    } catch (e) {
      toast.error($adminT("Failed to save page settings"));
    } finally {
      if (source === "display") savingDisplaySettings = false;
      else savingSeoSettings = false;
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
            <Breadcrumb.Link href={clientResolver(resolve, "/manage/app/pages")}>{$adminT("Pages")}</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page
              >{isNew ? $adminT("New Page") : currentPage?.page_title || $adminT("Edit Page")}</Breadcrumb.Page
            >
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
            {$adminT("View")}
          </Button>
        {/if}
      </div>
    </div>

    <!-- General Information Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>{$adminT("General Information")}</Card.Title>
        <Card.Description>
          {isNew ? $adminT("Create a new status page") : $adminT("Update page settings")}
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- Path -->
        <div class="space-y-2">
          <Label for="page-path">
            {$adminT("Path")} <span class="text-destructive">*</span>
          </Label>
          <Input
            id="page-path"
            type="text"
            bind:value={formData.page_path}
            disabled={!isNew && currentPage?.page_path === ""}
          />
          <p class="text-muted-foreground text-xs">
            {!isNew && currentPage?.page_path === ""
              ? $adminT("Home page path cannot be changed")
              : $adminT("URL path for the page (e.g., services, infrastructure). Will be made URL-friendly.")}
          </p>
        </div>

        <!-- Title -->
        <div class="space-y-2">
          <Label for="page-title">
            {$adminT("Title")} <span class="text-destructive">*</span>
          </Label>
          <Input
            id="page-title"
            type="text"
            bind:value={formData.page_title}
            placeholder={$adminT("Services Status")}
          />
          <p class="text-muted-foreground text-xs">{$adminT("Page title shown in browser tab")}</p>
        </div>

        <!-- Header -->
        <div class="space-y-2">
          <Label for="page-header">
            {$adminT("Header")} <span class="text-destructive">*</span>
          </Label>
          <Input
            id="page-header"
            type="text"
            bind:value={formData.page_header}
            placeholder={$adminT("Services Status")}
          />
          <p class="text-muted-foreground text-xs">{$adminT("Main heading displayed on the page")}</p>
        </div>

        <!-- Subheader -->
        <div class="space-y-2">
          <Label for="page-subheader">{$adminT("Page Content")}</Label>
          <div class="overflow-hidden rounded-md border">
            <CodeMirror
              extensions={[editorLocale]}
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
          <p class="text-muted-foreground text-xs">
            {$adminT("Supports Markdown. Optional content below the header.")}
          </p>
        </div>

        <!-- Logo Upload -->
        <div class="space-y-2">
          <Label>{$adminT("Page Logo")}</Label>
          <div class="flex items-start gap-4">
            <div class="bg-muted flex h-16 w-16 items-center justify-center rounded-lg border">
              {#if formData.page_logo}
                <img
                  src={clientResolver(resolve, formData.page_logo)}
                  alt={$adminT("Logo")}
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
                    {$adminT("Uploading...")}
                  {:else}
                    <UploadIcon class="h-4 w-4" />
                    {$adminT("Upload")}
                  {/if}
                </Button>
                <input
                  id="page-logo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/heic,image/heif"
                  class="hidden"
                  onchange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
                {#if formData.page_logo}
                  <Button aria-label={$adminT("Remove page logo")} variant="ghost" size="sm" onclick={clearLogo}>
                    <XIcon class="h-4 w-4" />
                  </Button>
                {/if}
              </div>
              <p class="text-muted-foreground text-xs">{$adminT("Optional logo for this page (max 256x256px)")}</p>
            </div>
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={savePage} disabled={saving || !isFormValid}>
          {#if saving}
            <Loader class="h-4 w-4 animate-spin" />
            {isNew ? $adminT("Creating...") : $adminT("Saving...")}
          {:else}
            <SaveIcon class="h-4 w-4" />
            {isNew ? $adminT("Create Page") : $adminT("Save Changes")}
          {/if}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Monitors Card (only shown for existing pages) -->
    {#if !isNew && currentPage}
      <Card.Root>
        <Card.Header>
          <Card.Title>{$adminT("Page Monitors")}</Card.Title>
          <Card.Description>{$adminT("Select which monitors to display on this page")}</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <!-- Add Monitor -->
          <div class="flex gap-2">
            <Select.Root type="single" bind:value={selectedMonitorTag}>
              <Select.Trigger class="flex-1">
                {#if selectedMonitorTag}
                  {monitors.find((m) => m.tag === selectedMonitorTag)?.name || selectedMonitorTag}
                {:else}
                  {$adminT("Select a monitor to add")}
                {/if}
              </Select.Trigger>
              <Select.Content>
                {#each availableMonitors as monitor (monitor.tag)}
                  <Select.Item value={monitor.tag}>{monitor.name} ({monitor.tag})</Select.Item>
                {/each}
                {#if availableMonitors.length === 0}
                  <div class="text-muted-foreground px-2 py-1 text-sm">{$adminT("No available monitors")}</div>
                {/if}
              </Select.Content>
            </Select.Root>
            <Button onclick={addMonitorToPage} disabled={addingMonitor || !selectedMonitorTag}>
              {#if addingMonitor}
                <Loader class="h-4 w-4 animate-spin" />
              {:else}
                <PlusIcon class="h-4 w-4" />
                {$adminT("Add")}
              {/if}
            </Button>
          </div>

          <!-- Current Monitors -->
          <div class="space-y-2">
            <Label>{$adminT("Current Monitors")}</Label>
            {#if selectedMonitors.length > 0}
              <div class="space-y-2">
                {#each selectedMonitors as monitorTag, i (monitorTag)}
                  {@const monitor = monitors.find((m) => m.tag === monitorTag)}
                  <div class="bg-muted flex items-center justify-between rounded-lg p-3">
                    <div>
                      <p class="font-medium">{monitor?.name || monitorTag}</p>
                      <p class="text-muted-foreground text-xs">{monitorTag}</p>
                    </div>
                    <div class="flex items-center gap-1">
                      <Button
                        aria-label={$adminT("Move monitor up")}
                        variant="ghost"
                        size="sm"
                        onclick={() => moveMonitor(i, "up")}
                        disabled={i === 0 || reordering}
                      >
                        <ArrowUpIcon class="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={$adminT("Move monitor down")}
                        variant="ghost"
                        size="sm"
                        onclick={() => moveMonitor(i, "down")}
                        disabled={i === selectedMonitors.length - 1 || reordering}
                      >
                        <ArrowDownIcon class="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label={$adminT("Remove monitor from page")}
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
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-muted-foreground bg-muted rounded-lg p-4 text-center text-sm">
                {$adminT("No monitors added to this page yet")}
              </div>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Page Settings Card -->
      <Card.Root>
        <Card.Header>
          <Card.Title>{$adminT("Display Settings")}</Card.Title>
          <Card.Description>{$adminT("Configure what content is shown on this status page")}</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-6">
          <!-- Monitor Status History Days -->
          <div class="space-y-4">
            <div>
              <Label class="text-base font-medium">{$adminT("Monitor Status History")}</Label>
              <p class="text-muted-foreground text-sm">
                {$adminT("Configure how many days of status history to display on the status page")}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="history-desktop">{$adminT("Desktop (days)")}</Label>
                <Input
                  id="history-desktop"
                  type="number"
                  step="1"
                  min={GC.STATUS_HISTORY_DAYS_MIN}
                  max={GC.STATUS_HISTORY_DAYS_MAX}
                  bind:value={pageSettings.monitor_status_history_days.desktop}
                  class={isHistoryDesktopValid ? "" : "border-destructive"}
                />
                <p class="text-muted-foreground text-xs">{$adminT("Number of days shown on desktop screens")}</p>
              </div>
              <div class="space-y-2">
                <Label for="history-mobile">{$adminT("Mobile (days)")}</Label>
                <Input
                  id="history-mobile"
                  type="number"
                  step="1"
                  min={GC.STATUS_HISTORY_DAYS_MIN}
                  max={GC.STATUS_HISTORY_DAYS_MAX}
                  bind:value={pageSettings.monitor_status_history_days.mobile}
                  class={isHistoryMobileValid ? "" : "border-destructive"}
                />
                <p class="text-muted-foreground text-xs">{$adminT("Number of days shown on mobile screens")}</p>
              </div>
            </div>
          </div>

          <hr class="border-muted" />

          <!-- Monitor Layout Style -->
          <div class="space-y-4">
            <div>
              <Label class="text-base font-medium">{$adminT("Monitor Layout Style")}</Label>
              <p class="text-muted-foreground text-sm">
                {$adminT("Choose how monitors are displayed on the status page")}
              </p>
            </div>
            <Select.Root type="single" bind:value={pageSettings.monitor_layout_style}>
              <Select.Trigger class="w-full">
                {#if pageSettings.monitor_layout_style === "default-list"}
                  {$adminT("Default List")}
                {:else if pageSettings.monitor_layout_style === "default-grid"}
                  {$adminT("Default Grid")}
                {:else if pageSettings.monitor_layout_style === "compact-list"}
                  {$adminT("Compact List")}
                {:else}
                  {$adminT("Compact Grid")}
                {/if}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="default-list">{$adminT("Default List")}</Select.Item>
                <Select.Item value="default-grid">{$adminT("Default Grid")}</Select.Item>
                <Select.Item value="compact-list">{$adminT("Compact List")}</Select.Item>
                <Select.Item value="compact-grid">{$adminT("Compact Grid")}</Select.Item>
              </Select.Content>
            </Select.Root>
            <p class="text-muted-foreground text-xs">
              {$adminT("Default is")} <code class="bg-muted rounded px-1 font-mono">default-list</code>
            </p>
          </div>
        </Card.Content>
        <Card.Footer class="flex justify-end">
          <Button onclick={() => savePageSettings("display")} disabled={savingDisplaySettings}>
            {#if savingDisplaySettings}
              <Loader class="h-4 w-4 animate-spin" />
              {$adminT("Saving...")}
            {:else}
              <SaveIcon class="h-4 w-4" />
              {$adminT("Save Preferences")}
            {/if}
          </Button>
        </Card.Footer>
      </Card.Root>

      <!-- Social Preview & SEO Card -->
      <Card.Root>
        <Card.Header>
          <Card.Title>{$adminT("Social Preview & SEO")}</Card.Title>
          <Card.Description
            >{$adminT(
              "Optional social preview image and meta tags for this page. Leave empty to use site defaults."
            )}</Card.Description
          >
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="flex items-start gap-4">
            <!-- Preview -->
            <div class="bg-muted flex h-32 w-64 items-center justify-center rounded-lg border">
              {#if pageSettings.socialPagePreviewImage}
                <img
                  src={clientResolver(resolve, pageSettings.socialPagePreviewImage)}
                  alt={$adminT("Social preview")}
                  class="h-full w-full rounded-lg object-cover"
                />
              {:else}
                <ImageIcon class="text-muted-foreground h-8 w-8" />
              {/if}
            </div>

            <!-- Upload Controls -->
            <div class="flex flex-1 flex-col gap-2">
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingSocialPreview}
                  onclick={() => document.getElementById("page-social-preview-input")?.click()}
                >
                  {#if uploadingSocialPreview}
                    <Loader class="h-4 w-4 animate-spin" />
                    {$adminT("Uploading...")}
                  {:else}
                    <UploadIcon class="h-4 w-4" />
                    {$adminT("Upload Social Preview")}
                  {/if}
                </Button>
                <input
                  id="page-social-preview-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
                  class="hidden"
                  onchange={handleSocialPreviewUpload}
                  disabled={uploadingSocialPreview}
                />
                {#if pageSettings.socialPagePreviewImage}
                  <Button
                    aria-label={$adminT("Remove social preview image")}
                    variant="ghost"
                    size="sm"
                    onclick={clearSocialPreview}
                  >
                    <XIcon class="h-4 w-4" />
                  </Button>
                {/if}
              </div>
              {#if pageSettings.socialPagePreviewImage}
                <p class="text-muted-foreground truncate text-xs">{pageSettings.socialPagePreviewImage}</p>
              {:else}
                <p class="text-muted-foreground text-xs">{$adminT("Optional. Leave empty to use site default.")}</p>
              {/if}
            </div>
          </div>

          <div class="space-y-2">
            <Label for="page-metaPageTitle">{$adminT("Meta Title")}</Label>
            <Input
              id="page-metaPageTitle"
              type="text"
              bind:value={pageSettings.metaPageTitle}
              placeholder={$adminT("Custom page title for search engines")}
            />
            <p class="text-muted-foreground text-xs">{$adminT("Overrides the default page title in search results")}</p>
          </div>
          <div class="space-y-2">
            <Label for="page-metaPageDescription">{$adminT("Meta Description")}</Label>
            <Textarea
              id="page-metaPageDescription"
              bind:value={pageSettings.metaPageDescription}
              placeholder={$adminT("Custom description for search engines")}
              rows={3}
            />
            <p class="text-muted-foreground text-xs">{$adminT("Shown as the snippet text in search engine results")}</p>
          </div>
        </Card.Content>
        <Card.Footer class="flex justify-end">
          <Button onclick={() => savePageSettings("seo")} disabled={savingSeoSettings}>
            {#if savingSeoSettings}
              <Loader class="h-4 w-4 animate-spin" />
              {$adminT("Saving...")}
            {:else}
              <SaveIcon class="h-4 w-4" />
              {$adminT("Save")}
            {/if}
          </Button>
        </Card.Footer>
      </Card.Root>

      <!-- Danger Zone Card (only for non-home pages) -->
      {#if currentPage.page_path !== ""}
        <Card.Root class="border-destructive">
          <Card.Header>
            <Card.Title class="text-destructive">{$adminT("Danger Zone")}</Card.Title>
            <Card.Description>{$adminT("Irreversible actions for this page")}</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div class="space-y-2">
              <Label for="delete-confirm">{$adminT("Delete Page")}</Label>
              <p class="text-muted-foreground text-sm">
                {$adminT("Once you delete a page, there is no going back. Please be certain.")}
              </p>
              <p class="text-muted-foreground text-sm">
                {$adminT("To confirm, type")}
                <code class="bg-muted rounded px-1 font-mono">delete {currentPage.page_path || "home"}</code>
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
                {$adminT("Deleting...")}
              {:else}
                <TrashIcon class="h-4 w-4" />
                {$adminT("Delete Page")}
              {/if}
            </Button>
          </Card.Footer>
        </Card.Root>
      {/if}
    {/if}
  {/if}
</div>

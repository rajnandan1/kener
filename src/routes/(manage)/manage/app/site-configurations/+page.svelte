<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import GC from "$lib/global-constants.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import UploadIcon from "@lucide/svelte/icons/upload";
  import XIcon from "@lucide/svelte/icons/x";
  import ImageIcon from "@lucide/svelte/icons/image";
  import Plus from "@lucide/svelte/icons/plus";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import type { DataRetentionPolicy, EventDisplaySettings, GlobalPageVisibilitySettings } from "$lib/types/site.js";

  interface NavItem {
    name: string;
    url: string;
    iconURL: string;
    uploading?: boolean;
  }

  // Form state
  let loading = $state(true);
  let savingSiteInfo = $state(false);
  let savingLogo = $state(false);
  let savingFavicon = $state(false);
  let savingSocialPreviewImage = $state(false);
  let savingNav = $state(false);
  let savingSubMenuOptions = $state(false);
  let savingGlobalPageVisibilitySettings = $state(false);
  let savingDataRetentionPolicy = $state(false);
  let savingEventDisplaySettings = $state(false);
  let uploadingLogo = $state(false);
  let uploadingFavicon = $state(false);
  let uploadingSocialPreviewImage = $state(false);

  const defaultEventDisplaySettings: EventDisplaySettings = {
    incidents: {
      enabled: true,
      ongoing: { show: true },
      resolved: { show: true, maxCount: 5, daysInPast: 7 }
    },
    maintenances: {
      enabled: true,
      ongoing: {
        show: true
      },
      past: { show: true, maxCount: 5, daysInPast: 7 },
      upcoming: { show: true, maxCount: 5, daysInFuture: 7 }
    }
  };

  interface SiteDataForm {
    siteName: string;
    siteURL: string;
    logo: string;
    favicon: string;
    socialPreviewImage: string | null;
  }

  // Site data
  let siteData = $state<SiteDataForm>({
    siteName: "",
    siteURL: "",
    logo: "",
    favicon: "",
    socialPreviewImage: null
  });

  // Navigation data
  let nav = $state<NavItem[]>([]);

  // Sub Menu Options
  let subMenuOptions = $state({
    showShareBadgeMonitor: true,
    showShareEmbedMonitor: true
  });

  const defaultGlobalPageVisibilitySettings: GlobalPageVisibilitySettings = {
    showSwitcher: true,
    forceExclusivity: false
  };

  let globalPageVisibilitySettings = $state<GlobalPageVisibilitySettings>(
    structuredClone(defaultGlobalPageVisibilitySettings)
  );

  let dataRetentionPolicy = $state<DataRetentionPolicy>({
    enabled: true,
    retentionDays: 90
  });

  let eventDisplaySettings = $state<EventDisplaySettings>(structuredClone(defaultEventDisplaySettings));
  let currentOrigin = $state("");

  function onForceExclusivityChange(checked: boolean | "indeterminate") {
    const enabled = checked === true;
    globalPageVisibilitySettings.forceExclusivity = enabled;
    if (enabled) {
      globalPageVisibilitySettings.showSwitcher = true;
    }
  }

  function parseOriginOnlyURL(value: string): URL | null {
    try {
      const trimmedValue = value.trim();
      if (!trimmedValue) return null;

      const url = new URL(trimmedValue);
      if (!url.hostname || !["http:", "https:"].includes(url.protocol)) return null;
      if (url.username || url.password) return null;
      if (url.pathname !== "/" || url.search || url.hash) return null;

      return url;
    } catch {
      return null;
    }
  }

  const parsedSiteOriginURL = $derived(parseOriginOnlyURL(siteData.siteURL));
  const isOriginOnlySiteURL = $derived(parsedSiteOriginURL !== null);
  const enteredSiteOrigin = $derived(parsedSiteOriginURL?.origin ?? "");
  const hasOriginMismatch = $derived(
    Boolean(currentOrigin && enteredSiteOrigin && currentOrigin !== enteredSiteOrigin)
  );

  // Validation
  const isValidSiteInfo = $derived(
    siteData.siteName.trim().length > 0 && siteData.siteURL.trim().length > 0 && isOriginOnlySiteURL
  );

  async function fetchSiteData() {
    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getAllSiteData" })
      });
      if (response.ok) {
        const data = await response.json();
        siteData = {
          siteName: data.siteName || "",
          siteURL: data.siteURL || "",
          logo: data.logo || "",
          favicon: data.favicon || "",
          socialPreviewImage: data.socialPreviewImage || null
        };
        if (data.nav) {
          nav = data.nav.map((item: NavItem) => ({
            name: item.name || "",
            url: item.url || "",
            iconURL: item.iconURL || ""
          }));
        }
        if (data.subMenuOptions) {
          subMenuOptions = {
            showShareBadgeMonitor: data.subMenuOptions.showShareBadgeMonitor ?? true,
            showShareEmbedMonitor: data.subMenuOptions.showShareEmbedMonitor ?? true
          };
        }

        if (data.globalPageVisibilitySettings) {
          try {
            const parsed =
              typeof data.globalPageVisibilitySettings === "string"
                ? JSON.parse(data.globalPageVisibilitySettings)
                : data.globalPageVisibilitySettings;

            globalPageVisibilitySettings = {
              ...structuredClone(defaultGlobalPageVisibilitySettings),
              ...parsed,
              showSwitcher: Boolean(parsed?.showSwitcher ?? true),
              forceExclusivity: Boolean(parsed?.forceExclusivity ?? false)
            };
          } catch {
            globalPageVisibilitySettings = structuredClone(defaultGlobalPageVisibilitySettings);
          }
        } else {
          globalPageVisibilitySettings = structuredClone(defaultGlobalPageVisibilitySettings);
        }

        dataRetentionPolicy = {
          enabled: data.dataRetentionPolicy?.enabled ?? true,
          retentionDays: data.dataRetentionPolicy?.retentionDays ?? 90
        };

        if (data.eventDisplaySettings) {
          try {
            const parsed =
              typeof data.eventDisplaySettings === "string"
                ? JSON.parse(data.eventDisplaySettings)
                : data.eventDisplaySettings;
            eventDisplaySettings = { ...structuredClone(defaultEventDisplaySettings), ...parsed };
          } catch {
            eventDisplaySettings = structuredClone(defaultEventDisplaySettings);
          }
        } else {
          eventDisplaySettings = structuredClone(defaultEventDisplaySettings);
        }
      }
    } catch (e) {
      toast.error("Failed to load site data");
    } finally {
      loading = false;
    }
  }

  async function saveSiteInfo() {
    if (!isValidSiteInfo) return;

    savingSiteInfo = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: {
            siteName: siteData.siteName,
            siteURL: siteData.siteURL
          }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Site information saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save site information");
    } finally {
      savingSiteInfo = false;
    }
  }

  async function saveLogo() {
    savingLogo = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { logo: siteData.logo }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Logo saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save logo");
    } finally {
      savingLogo = false;
    }
  }

  async function saveFavicon() {
    savingFavicon = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { favicon: siteData.favicon }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Favicon saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save favicon");
    } finally {
      savingFavicon = false;
    }
  }

  async function saveSocialPreviewImage() {
    savingSocialPreviewImage = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { socialPreviewImage: siteData.socialPreviewImage }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Social preview image saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save social preview image");
    } finally {
      savingSocialPreviewImage = false;
    }
  }

  async function saveNavigation() {
    savingNav = true;
    try {
      const cleanNav = nav.map((item) => ({
        name: item.name,
        url: item.url,
        iconURL: item.iconURL
      }));
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { nav: JSON.stringify(cleanNav) }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Navigation saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save navigation");
    } finally {
      savingNav = false;
    }
  }

  async function saveSubMenuOptions() {
    savingSubMenuOptions = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { subMenuOptions: JSON.stringify(subMenuOptions) }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Sub menu options saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save sub menu options");
    } finally {
      savingSubMenuOptions = false;
    }
  }

  async function saveGlobalPageVisibilitySettings() {
    savingGlobalPageVisibilitySettings = true;
    try {
      const payload: GlobalPageVisibilitySettings = {
        showSwitcher: globalPageVisibilitySettings.forceExclusivity ? true : globalPageVisibilitySettings.showSwitcher,
        forceExclusivity: globalPageVisibilitySettings.forceExclusivity
      };

      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { globalPageVisibilitySettings: JSON.stringify(payload) }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        globalPageVisibilitySettings = payload;
        toast.success("Global page visibility settings saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save global page visibility settings");
    } finally {
      savingGlobalPageVisibilitySettings = false;
    }
  }

  async function saveDataRetentionPolicy() {
    savingDataRetentionPolicy = true;
    try {
      const safeRetentionDays = Math.max(1, Number(dataRetentionPolicy.retentionDays) || 90);
      const payload: DataRetentionPolicy = {
        enabled: dataRetentionPolicy.enabled,
        retentionDays: safeRetentionDays
      };

      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { dataRetentionPolicy: JSON.stringify(payload) }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        dataRetentionPolicy.retentionDays = safeRetentionDays;
        toast.success("Data retention policy saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save data retention policy");
    } finally {
      savingDataRetentionPolicy = false;
    }
  }

  async function saveEventDisplaySettings() {
    savingEventDisplaySettings = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { eventDisplaySettings: JSON.stringify(eventDisplaySettings) }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Event display settings saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save event display settings");
    } finally {
      savingEventDisplaySettings = false;
    }
  }

  async function handleImageUpload(event: Event, type: "logo" | "favicon" | "socialPreviewImage"): Promise<void> {
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

    if (type === "logo") {
      uploadingLogo = true;
    } else if (type === "favicon") {
      uploadingFavicon = true;
    } else {
      uploadingSocialPreviewImage = true;
    }

    try {
      // Convert file to base64
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
            maxWidth: type === "favicon" ? 64 : type === "socialPreviewImage" ? 640 : 256,
            maxHeight: type === "favicon" ? 64 : type === "socialPreviewImage" ? 320 : 256,
            forceDimensions: type === "socialPreviewImage",
            prefix: `${type}_`
          }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        if (type === "logo") {
          siteData.logo = result.url;
        } else if (type === "socialPreviewImage") {
          siteData.socialPreviewImage = result.url;
        } else {
          siteData.favicon = result.url;
        }
        toast.success(
          `${type === "logo" ? "Logo" : type === "favicon" ? "Favicon" : "Social preview image"} uploaded successfully`
        );
      }
    } catch (e) {
      toast.error(`Failed to upload ${type}`);
    } finally {
      if (type === "logo") {
        uploadingLogo = false;
      } else if (type === "favicon") {
        uploadingFavicon = false;
      } else {
        uploadingSocialPreviewImage = false;
      }
      // Reset input
      input.value = "";
    }
  }

  async function handleNavIconUpload(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 102400) {
      toast.error("File size should be less than 100KB");
      return;
    }

    nav[index].uploading = true;
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
            maxWidth: 32,
            maxHeight: 32,
            prefix: "navicon_"
          }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        nav[index].iconURL = result.url;
      }
    } catch (e) {
      toast.error("Failed to upload icon");
    } finally {
      nav[index].uploading = false;
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URI prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  function clearImage(type: "logo" | "favicon" | "socialPreviewImage") {
    if (type === "logo") {
      siteData.logo = "";
    } else if (type === "favicon") {
      siteData.favicon = "";
    } else {
      siteData.socialPreviewImage = null;
    }
  }

  function addNavItem() {
    nav = [...nav, { name: "", url: "", iconURL: "" }];
  }

  function removeNavItem(index: number) {
    nav = nav.filter((_, i) => i !== index);
  }

  onMount(() => {
    currentOrigin = window.location.origin;
    void fetchSiteData();
  });
</script>

<div class="flex w-full flex-col gap-4 p-4">
  <!-- Breadcrumb -->

  {#if loading}
    <div class="flex items-center justify-center py-8">
      <Spinner />
    </div>
  {:else}
    <!-- Site Information Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Site Information</Card.Title>
        <Card.Description>Basic information about your status page</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <!-- Site Name -->
          <div class="space-y-2">
            <Label for="siteName">Site Name *</Label>
            <Input id="siteName" type="text" bind:value={siteData.siteName} placeholder="My Status Page" />
            <p class="text-muted-foreground text-xs">The name displayed in the header and browser tab</p>
          </div>

          <!-- Site URL -->
          <div class="space-y-2">
            <Label for="siteURL">Site URL *</Label>
            <Input id="siteURL" type="url" bind:value={siteData.siteURL} placeholder="https://status.example.com" />
            {#if siteData.siteURL.trim().length > 0 && !isOriginOnlySiteURL}
              <p class="text-destructive text-xs">
                Invalid site URL. Please enter only protocol + domain (no path, query, or hash).
              </p>
            {/if}
            {#if siteData.siteURL.trim().length > 0 && isOriginOnlySiteURL && hasOriginMismatch}
              <p class="text-xs text-amber-600 dark:text-amber-400">
                Warning: Entered origin ({enteredSiteOrigin}) does not match current origin ({currentOrigin}).
              </p>
            {/if}
            <p class="text-muted-foreground text-xs">
              Effective URL: {(isOriginOnlySiteURL ? enteredSiteOrigin : siteData.siteURL) +
                clientResolver(resolve, "/")}
            </p>
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveSiteInfo} disabled={savingSiteInfo || !isValidSiteInfo} class="cursor-pointer">
          {#if savingSiteInfo}
            <Loader class="h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="h-4 w-4" />
            Save
          {/if}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Logo Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Logo</Card.Title>
        <Card.Description>Upload your site logo (max 256x256px, PNG/JPG/SVG/WebP)</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="flex items-start gap-4">
          <!-- Preview -->
          <div class="bg-muted flex h-24 w-24 items-center justify-center rounded-lg border">
            {#if siteData.logo}
              <img src={clientResolver(resolve, siteData.logo)} alt="Logo" class="max-h-20 max-w-20 object-contain" />
            {:else}
              <ImageIcon class="text-muted-foreground h-8 w-8" />
            {/if}
          </div>

          <!-- Upload Controls -->
          <div class="flex flex-1 flex-col gap-2">
            <div class="flex gap-2">
              <Button
                variant="outline"
                disabled={uploadingLogo}
                onclick={() => document.getElementById("logo-input")?.click()}
              >
                {#if uploadingLogo}
                  <Loader class="h-4 w-4 animate-spin" />
                  Uploading...
                {:else}
                  <UploadIcon class="h-4 w-4" />
                  Upload Logo
                {/if}
              </Button>
              <input
                id="logo-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                class="hidden"
                onchange={(e) => handleImageUpload(e, "logo")}
                disabled={uploadingLogo}
              />
              {#if siteData.logo}
                <Button variant="ghost" size="icon" onclick={() => clearImage("logo")}>
                  <XIcon class="h-4 w-4" />
                </Button>
              {/if}
            </div>
            {#if siteData.logo}
              <p class="text-muted-foreground truncate text-xs">{siteData.logo}</p>
            {/if}
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveLogo} disabled={savingLogo} class="cursor-pointer">
          {#if savingLogo}
            <Loader class="h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="h-4 w-4" />
            Save
          {/if}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Favicon Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Favicon</Card.Title>
        <Card.Description>Upload your site favicon (max 64x64px, PNG/JPG/SVG/WebP)</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="flex items-start gap-4">
          <!-- Preview -->
          <div class="bg-muted flex h-16 w-16 items-center justify-center rounded-lg border">
            {#if siteData.favicon}
              <img
                src={clientResolver(resolve, siteData.favicon)}
                alt="Favicon"
                class="max-h-12 max-w-12 object-contain"
              />
            {:else}
              <ImageIcon class="text-muted-foreground h-6 w-6" />
            {/if}
          </div>

          <!-- Upload Controls -->
          <div class="flex flex-1 flex-col gap-2">
            <div class="flex gap-2">
              <Button
                variant="outline"
                disabled={uploadingFavicon}
                onclick={() => document.getElementById("favicon-input")?.click()}
              >
                {#if uploadingFavicon}
                  <Loader class="h-4 w-4 animate-spin" />
                  Uploading...
                {:else}
                  <UploadIcon class="h-4 w-4" />
                  Upload Favicon
                {/if}
              </Button>
              <input
                id="favicon-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                class="hidden"
                onchange={(e) => handleImageUpload(e, "favicon")}
                disabled={uploadingFavicon}
              />
              {#if siteData.favicon}
                <Button variant="ghost" size="icon" onclick={() => clearImage("favicon")}>
                  <XIcon class="h-4 w-4" />
                </Button>
              {/if}
            </div>
            {#if siteData.favicon}
              <p class="text-muted-foreground truncate text-xs">{siteData.favicon}</p>
            {/if}
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveFavicon} disabled={savingFavicon} class="cursor-pointer">
          {#if savingFavicon}
            <Loader class="h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="h-4 w-4" />
            Save
          {/if}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Social Preview Image Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Social Preview Image</Card.Title>
        <Card.Description>Upload an optional social preview image at least 640x320px or similar</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="flex items-start gap-4">
          <!-- Preview -->
          <div class="bg-muted flex h-32 w-64 items-center justify-center rounded-lg border">
            {#if siteData.socialPreviewImage}
              <img
                src={clientResolver(resolve, siteData.socialPreviewImage)}
                alt="Social preview"
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
                disabled={uploadingSocialPreviewImage}
                onclick={() => document.getElementById("social-preview-image-input")?.click()}
              >
                {#if uploadingSocialPreviewImage}
                  <Loader class="h-4 w-4 animate-spin" />
                  Uploading...
                {:else}
                  <UploadIcon class="h-4 w-4" />
                  Upload Social Preview
                {/if}
              </Button>
              <input
                id="social-preview-image-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                class="hidden"
                onchange={(e) => handleImageUpload(e, "socialPreviewImage")}
                disabled={uploadingSocialPreviewImage}
              />
              {#if siteData.socialPreviewImage}
                <Button variant="ghost" size="icon" onclick={() => clearImage("socialPreviewImage")}>
                  <XIcon class="h-4 w-4" />
                </Button>
              {/if}
            </div>
            {#if siteData.socialPreviewImage}
              <p class="text-muted-foreground truncate text-xs">{siteData.socialPreviewImage}</p>
            {:else}
              <p class="text-muted-foreground text-xs">Optional. Leave empty to use no social preview image.</p>
            {/if}
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveSocialPreviewImage} disabled={savingSocialPreviewImage} class="cursor-pointer">
          {#if savingSocialPreviewImage}
            <Loader class="h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="h-4 w-4" />
            Save
          {/if}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Navigation Menu Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Navigation Menu</Card.Title>
        <Card.Description>Add custom navigation links to your status page header</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#each nav as item, index (index)}
          <div class="flex items-end gap-2 rounded-lg border p-3">
            <div class="grid flex-1 gap-2 sm:grid-cols-3">
              <div class="space-y-1">
                <Label for="nav-name-{index}">Name</Label>
                <Input id="nav-name-{index}" type="text" bind:value={item.name} placeholder="Documentation" />
              </div>
              <div class="space-y-1">
                <Label for="nav-url-{index}">URL</Label>
                <Input id="nav-url-{index}" type="text" bind:value={item.url} placeholder="https://docs.example.com" />
              </div>
              <div class="space-y-1">
                <Label for="nav-icon-{index}">Icon</Label>
                <div class="flex items-center gap-2">
                  {#if item.iconURL}
                    <img src={clientResolver(resolve, item.iconURL)} alt="Icon" class="h-6 w-6 object-contain" />
                    <Button variant="ghost" size="sm" onclick={() => (item.iconURL = "")}>
                      <XIcon class="h-4 w-4" />
                    </Button>
                  {:else}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={item.uploading}
                      onclick={() => document.getElementById(`nav-icon-input-${index}`)?.click()}
                    >
                      {#if item.uploading}
                        <Loader class="h-4 w-4 animate-spin" />
                      {:else}
                        <UploadIcon class="h-4 w-4" />
                      {/if}
                    </Button>
                  {/if}
                  <input
                    id="nav-icon-input-{index}"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    class="hidden"
                    onchange={(e) => handleNavIconUpload(e, index)}
                  />
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onclick={() => removeNavItem(index)}>
              <XIcon class="h-4 w-4" />
            </Button>
          </div>
        {/each}
        <Button variant="outline" onclick={addNavItem}>
          <Plus class="h-4 w-4" />
          Add Navigation Item
        </Button>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveNavigation} disabled={savingNav} class="cursor-pointer">
          {#if savingNav}
            <Loader class="h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="h-4 w-4" />
            Save
          {/if}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Sub Menu Options Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Monitor Sub Menu Options</Card.Title>
        <Card.Description>Configure which options appear in the monitor sub menu on the status page</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label>Share Badge</Label>
            <p class="text-muted-foreground text-xs">
              Show option to get embeddable status and uptime badges for the monitor
            </p>
          </div>
          <Switch bind:checked={subMenuOptions.showShareBadgeMonitor} />
        </div>
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label>Share Embed</Label>
            <p class="text-muted-foreground text-xs">Show option to get iframe or script embed code for the monitor</p>
          </div>
          <Switch bind:checked={subMenuOptions.showShareEmbedMonitor} />
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveSubMenuOptions} disabled={savingSubMenuOptions} class="cursor-pointer">
          {#if savingSubMenuOptions}
            <Loader class="h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="h-4 w-4" />
            Save
          {/if}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Global Page Visibility Settings Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Global Page Visibility Settings</Card.Title>
        <Card.Description>
          Configure page switcher visibility and global exclusivity behavior for page-linked content.
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label>Show page switcher</Label>
            <p class="text-muted-foreground text-xs">This will hide the pages dropdown from the menu.</p>
          </div>
          <Switch
            bind:checked={globalPageVisibilitySettings.showSwitcher}
            disabled={globalPageVisibilitySettings.forceExclusivity}
          />
        </div>

        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label>Force exclusivity</Label>
            <p class="text-muted-foreground text-xs">
              This sets <code>showSwitcher</code> to true and makes it read-only. It also enables brand icon link
              overwrite and calendar event updates for affected monitors. Global events (incidents and maintenances with
              <code>is_global=YES</code>) are still shown.
            </p>
          </div>
          <Switch checked={globalPageVisibilitySettings.forceExclusivity} onCheckedChange={onForceExclusivityChange} />
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button
          onclick={saveGlobalPageVisibilitySettings}
          disabled={savingGlobalPageVisibilitySettings}
          class="cursor-pointer"
        >
          {#if savingGlobalPageVisibilitySettings}
            <Loader class="h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="h-4 w-4" />
            Save
          {/if}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Data Retention Policy Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Data Retention Policy</Card.Title>
        <Card.Description>Configure automatic cleanup for old monitor status data</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label>Enable Data Retention</Label>
            <p class="text-muted-foreground text-xs">Automatically remove status data older than retention days</p>
          </div>
          <Switch bind:checked={dataRetentionPolicy.enabled} />
        </div>

        <div class="space-y-2">
          <Label for="retention-days">Retention Days</Label>
          <Input
            id="retention-days"
            type="number"
            min="1"
            bind:value={dataRetentionPolicy.retentionDays}
            disabled={!dataRetentionPolicy.enabled}
          />
          <p class="text-muted-foreground text-xs">Default is 90 days if not configured.</p>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveDataRetentionPolicy} disabled={savingDataRetentionPolicy} class="cursor-pointer">
          {#if savingDataRetentionPolicy}
            <Loader class="h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="h-4 w-4" />
            Save
          {/if}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Event Display Settings Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Event Display Settings</Card.Title>
        <Card.Description>Configure which incidents and maintenances are shown on the site</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Incidents -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Incidents</Label>
              <p class="text-muted-foreground text-xs">Enable or disable incident display globally</p>
            </div>
            <Switch bind:checked={eventDisplaySettings.incidents.enabled} />
          </div>

          {#if eventDisplaySettings.incidents.enabled}
            <div class="border-muted ml-4 space-y-4 border-l-2 pl-4">
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label>Show Ongoing Incidents</Label>
                  <p class="text-muted-foreground text-xs">Display active incidents</p>
                </div>
                <Switch bind:checked={eventDisplaySettings.incidents.ongoing.show} />
              </div>

              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label>Show Resolved Incidents</Label>
                  <p class="text-muted-foreground text-xs">Display recently resolved incidents</p>
                </div>
                <Switch bind:checked={eventDisplaySettings.incidents.resolved.show} />
              </div>

              {#if eventDisplaySettings.incidents.resolved.show}
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-2">
                    <Label for="events-incidents-max-count">Max Resolved Count</Label>
                    <Input
                      id="events-incidents-max-count"
                      type="number"
                      min="1"
                      max="50"
                      bind:value={eventDisplaySettings.incidents.resolved.maxCount}
                    />
                  </div>
                  <div class="space-y-2">
                    <Label for="events-incidents-days-in-past">Days in Past</Label>
                    <Input
                      id="events-incidents-days-in-past"
                      type="number"
                      min="1"
                      max="90"
                      bind:value={eventDisplaySettings.incidents.resolved.daysInPast}
                    />
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <hr class="border-muted" />

        <!-- Maintenances -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Maintenances</Label>
              <p class="text-muted-foreground text-xs">Enable or disable maintenance display globally</p>
            </div>
            <Switch bind:checked={eventDisplaySettings.maintenances.enabled} />
          </div>

          {#if eventDisplaySettings.maintenances.enabled}
            <div class="border-muted ml-4 space-y-4 border-l-2 pl-4">
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label>Show Ongoing Maintenances</Label>
                  <p class="text-muted-foreground text-xs">Display active maintenance windows</p>
                </div>
                <Switch bind:checked={eventDisplaySettings.maintenances.ongoing.show} />
              </div>

              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label>Show Past Maintenances</Label>
                  <p class="text-muted-foreground text-xs">Display completed maintenance windows</p>
                </div>
                <Switch bind:checked={eventDisplaySettings.maintenances.past.show} />
              </div>

              {#if eventDisplaySettings.maintenances.past.show}
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-2">
                    <Label for="events-maint-past-max-count">Max Past Count</Label>
                    <Input
                      id="events-maint-past-max-count"
                      type="number"
                      min="1"
                      max="50"
                      bind:value={eventDisplaySettings.maintenances.past.maxCount}
                    />
                  </div>
                  <div class="space-y-2">
                    <Label for="events-maint-past-days-in-past">Days in Past</Label>
                    <Input
                      id="events-maint-past-days-in-past"
                      type="number"
                      min="1"
                      max="90"
                      bind:value={eventDisplaySettings.maintenances.past.daysInPast}
                    />
                  </div>
                </div>
              {/if}

              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label>Show Upcoming Maintenances</Label>
                  <p class="text-muted-foreground text-xs">Display scheduled maintenance windows</p>
                </div>
                <Switch bind:checked={eventDisplaySettings.maintenances.upcoming.show} />
              </div>

              {#if eventDisplaySettings.maintenances.upcoming.show}
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-2">
                    <Label for="events-maint-upcoming-max-count">Max Upcoming Count</Label>
                    <Input
                      id="events-maint-upcoming-max-count"
                      type="number"
                      min="1"
                      max="50"
                      bind:value={eventDisplaySettings.maintenances.upcoming.maxCount}
                    />
                  </div>
                  <div class="space-y-2">
                    <Label for="events-maint-upcoming-days-in-future">Days in Future</Label>
                    <Input
                      id="events-maint-upcoming-days-in-future"
                      type="number"
                      min="1"
                      max="90"
                      bind:value={eventDisplaySettings.maintenances.upcoming.daysInFuture}
                    />
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveEventDisplaySettings} disabled={savingEventDisplaySettings} class="cursor-pointer">
          {#if savingEventDisplaySettings}
            <Loader class="h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="h-4 w-4" />
            Save
          {/if}
        </Button>
      </Card.Footer>
    </Card.Root>
  {/if}
</div>

<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import UploadIcon from "@lucide/svelte/icons/upload";
  import XIcon from "@lucide/svelte/icons/x";
  import ImageIcon from "@lucide/svelte/icons/image";
  import Plus from "@lucide/svelte/icons/plus";
  import { toast } from "svelte-sonner";
  import { IsValidURL } from "$lib/clientTools";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

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
  let savingNav = $state(false);
  let savingSubMenuOptions = $state(false);
  let uploadingLogo = $state(false);
  let uploadingFavicon = $state(false);

  // Site data
  let siteData = $state({
    siteName: "",
    siteURL: "",
    home: "/",
    logo: "",
    favicon: ""
  });

  // Navigation data
  let nav = $state<NavItem[]>([]);

  // Sub Menu Options
  let subMenuOptions = $state({
    showCopyCurrentPageLink: true,
    showShareBadgeMonitor: true,
    showShareEmbedMonitor: true
  });

  // Validation
  const isValidSiteInfo = $derived(
    siteData.siteName.trim().length > 0 &&
      siteData.siteURL.trim().length > 0 &&
      IsValidURL(siteData.siteURL) &&
      siteData.home.trim().length > 0
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
          home: data.home || "/",
          logo: data.logo || "",
          favicon: data.favicon || ""
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
            showCopyCurrentPageLink: data.subMenuOptions.showCopyCurrentPageLink ?? true,
            showShareBadgeMonitor: data.subMenuOptions.showShareBadgeMonitor ?? true,
            showShareEmbedMonitor: data.subMenuOptions.showShareEmbedMonitor ?? true
          };
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
            siteURL: siteData.siteURL,
            home: siteData.home
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

  async function handleImageUpload(event: Event, type: "logo" | "favicon"): Promise<void> {
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
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 2MB");
      return;
    }

    if (type === "logo") {
      uploadingLogo = true;
    } else {
      uploadingFavicon = true;
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
            maxWidth: type === "favicon" ? 64 : 256,
            maxHeight: type === "favicon" ? 64 : 256,
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
        } else {
          siteData.favicon = result.url;
        }
        toast.success(`${type === "logo" ? "Logo" : "Favicon"} uploaded successfully`);
      }
    } catch (e) {
      toast.error(`Failed to upload ${type}`);
    } finally {
      if (type === "logo") {
        uploadingLogo = false;
      } else {
        uploadingFavicon = false;
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

  function clearImage(type: "logo" | "favicon") {
    if (type === "logo") {
      siteData.logo = "";
    } else {
      siteData.favicon = "";
    }
  }

  function addNavItem() {
    nav = [...nav, { name: "", url: "", iconURL: "" }];
  }

  function removeNavItem(index: number) {
    nav = nav.filter((_, i) => i !== index);
  }

  $effect(() => {
    fetchSiteData();
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
            <p class="text-muted-foreground text-xs">Effective URL: {siteData.siteURL}{clientResolver(resolve, "/")}</p>
          </div>
        </div>

        <!-- Home Path -->
        <div class="space-y-2">
          <Label for="home">Home Path *</Label>
          <Input id="home" type="text" bind:value={siteData.home} placeholder="/" />
          <p class="text-muted-foreground text-xs">
            The path users are redirected to when clicking the logo (e.g., "/" or "/status")
          </p>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveSiteInfo} disabled={savingSiteInfo || !isValidSiteInfo} class="cursor-pointer">
          {#if savingSiteInfo}
            <Loader class="mr-2 h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="mr-2 h-4 w-4" />
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
                  <Loader class="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                {:else}
                  <UploadIcon class="mr-2 h-4 w-4" />
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
            <Loader class="mr-2 h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="mr-2 h-4 w-4" />
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
                  <Loader class="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                {:else}
                  <UploadIcon class="mr-2 h-4 w-4" />
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
            <Loader class="mr-2 h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="mr-2 h-4 w-4" />
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
        {#each nav as item, index}
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
          <Plus class="mr-2 h-4 w-4" />
          Add Navigation Item
        </Button>
      </Card.Content>
      <Card.Footer class="flex justify-end">
        <Button onclick={saveNavigation} disabled={savingNav} class="cursor-pointer">
          {#if savingNav}
            <Loader class="mr-2 h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="mr-2 h-4 w-4" />
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
            <Label>Copy Current Page Link</Label>
            <p class="text-muted-foreground text-xs">Allow users to copy the direct link to the current monitor page</p>
          </div>
          <Switch bind:checked={subMenuOptions.showCopyCurrentPageLink} />
        </div>
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
            <Loader class="mr-2 h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <SaveIcon class="mr-2 h-4 w-4" />
            Save
          {/if}
        </Button>
      </Card.Footer>
    </Card.Root>
  {/if}
</div>

<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import Loader from "@lucide/svelte/icons/loader";
  import Info from "@lucide/svelte/icons/info";
  import { toast } from "svelte-sonner";
  import { mode } from "mode-watcher";
  import constants from "$lib/global-constants";

  import CodeMirror from "svelte-codemirror-editor";
  import { html } from "@codemirror/lang-html";
  import { css } from "@codemirror/lang-css";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
  import ColorPicker from "svelte-awesome-color-picker";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import type { SiteAnnouncement, PageOrderingSettings } from "$lib/types/site.js";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import GripVertical from "@lucide/svelte/icons/grip-vertical";

  interface StatusColors {
    UP: string;
    DOWN: string;
    DEGRADED: string;
    MAINTENANCE: string;
    ACCENT: string;
    ACCENT_FOREGROUND: string;
  }

  interface FontConfig {
    cssSrc: string;
    family: string;
  }

  type AnnouncementForm = Omit<SiteAnnouncement, "reshowAfterInHours" | "ctaURL" | "ctaText"> & {
    reshowAfterInHours: string;
    ctaURL: string;
    ctaText: string;
  };

  // State
  let loading = $state(true);
  let savingFooter = $state(false);
  let savingColors = $state(false);
  let savingFont = $state(false);
  let savingCSS = $state(false);
  let savingTheme = $state(false);
  let savingAnnouncement = $state(false);
  let savingPageOrdering = $state(false);
  let loadingPages = $state(false);

  // Data
  let footerHTML = $state("");
  let defaultFooterHTML = $state("");
  let theme = $state<"light" | "dark" | "system">("system");
  let themeToggle = $state<"YES" | "NO">("YES");
  let colors = $state<StatusColors>({
    UP: "#67ab95",
    DOWN: "#ca3038",
    DEGRADED: "#e6ca61",
    MAINTENANCE: "#6679cc",
    ACCENT: "#f4f4f5",
    ACCENT_FOREGROUND: "#e96e2d"
  });
  let colorsDark = $state<StatusColors>({
    UP: "#67ab95",
    DOWN: "#ca3038",
    DEGRADED: "#e6ca61",
    MAINTENANCE: "#6679cc",
    ACCENT: "#27272a",
    ACCENT_FOREGROUND: "#e96e2d"
  });
  let font = $state<FontConfig>({
    cssSrc: "",
    family: ""
  });
  let customCSS = $state("");
  let announcement = $state<AnnouncementForm>({
    title: "",
    message: "",
    type: "INFO",
    reshowAfterInHours: "",
    cancellable: true,
    ctaURL: "",
    ctaText: ""
  });

  // Page ordering
  interface PageItem {
    id: number;
    page_path: string;
    page_title: string;
  }
  let pageOrderingEnabled = $state(false);
  let orderedPageIds = $state<number[]>([]);
  let allPages = $state<PageItem[]>([]);
  let displayPages = $derived.by(() => {
    if (orderedPageIds.length === 0) {
      return allPages;
    }
    const ordered: PageItem[] = [];
    for (const id of orderedPageIds) {
      const page = allPages.find((p) => p.id === id);
      if (page) ordered.push(page);
    }
    // Append pages not in the order list (newly added)
    for (const page of allPages) {
      if (!orderedPageIds.includes(page.id)) {
        ordered.push(page);
      }
    }
    return ordered;
  });

  async function fetchSettings() {
    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getAllSiteData" })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        if (result.footerHTML) {
          footerHTML = result.footerHTML;
        }
        if (result.colors) {
          colors = {
            UP: result.colors.UP || "#67ab95",
            DOWN: result.colors.DOWN || "#ca3038",
            DEGRADED: result.colors.DEGRADED || "#e6ca61",
            MAINTENANCE: result.colors.MAINTENANCE || "#6679cc",
            ACCENT: result.colors.ACCENT || "#f4f4f5",
            ACCENT_FOREGROUND: result.colors.ACCENT_FOREGROUND || result.colors.ACCENT || "#e96e2d"
          };
        }
        if (result.colorsDark) {
          colorsDark = {
            UP: result.colorsDark.UP || colors.UP,
            DOWN: result.colorsDark.DOWN || colors.DOWN,
            DEGRADED: result.colorsDark.DEGRADED || colors.DEGRADED,
            MAINTENANCE: result.colorsDark.MAINTENANCE || colors.MAINTENANCE,
            ACCENT: result.colorsDark.ACCENT || "#27272a",
            ACCENT_FOREGROUND:
              result.colorsDark.ACCENT_FOREGROUND || result.colorsDark.ACCENT || colors.ACCENT_FOREGROUND
          };
        } else {
          colorsDark = { ...colors, ACCENT: "#27272a" };
        }
        if (result.font) {
          font = {
            cssSrc: result.font.cssSrc || "",
            family: result.font.family || ""
          };
        }
        if (result.customCSS) {
          customCSS = result.customCSS;
        }
        if (result.theme) {
          theme = result.theme as "light" | "dark" | "system";
        }
        if (result.themeToggle) {
          themeToggle = result.themeToggle as "YES" | "NO";
        }
        if (result.announcement) {
          announcement = {
            title: result.announcement.title || "",
            message: result.announcement.message || "",
            type: result.announcement.type || "INFO",
            reshowAfterInHours:
              result.announcement.reshowAfterInHours === null || result.announcement.reshowAfterInHours === undefined
                ? ""
                : String(result.announcement.reshowAfterInHours),
            cancellable: result.announcement.cancellable ?? true,
            ctaURL: result.announcement.ctaURL || "",
            ctaText: result.announcement.ctaText || ""
          };
        }
        if (result.pageOrderingSettings) {
          pageOrderingEnabled = result.pageOrderingSettings.enabled ?? false;
          orderedPageIds = result.pageOrderingSettings.order ?? [];
        }
      }
      // Set default footer HTML
      defaultFooterHTML = `<div class="container relative mt-4 max-w-[655px]">
  <div class="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
    <p class="text-center text-sm leading-loose text-muted-foreground">
      Made using 
      <a href="https://github.com/rajnandan1/kener" target="_blank" class="font-medium underline underline-offset-4">
        Kener
      </a>
      an open source status page system built with Svelte and TailwindCSS.
    </p>
  </div>
</div>`;
    } catch (e) {
      toast.error("Failed to load settings");
    } finally {
      loading = false;
    }
  }

  // Save functions for each section
  async function saveFooter() {
    savingFooter = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { footerHTML }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Footer saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save footer");
    } finally {
      savingFooter = false;
    }
  }

  async function saveColors() {
    savingColors = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { colors: JSON.stringify(colors), colorsDark: JSON.stringify(colorsDark) }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Status colors saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save colors");
    } finally {
      savingColors = false;
    }
  }

  async function saveFont() {
    savingFont = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { font: JSON.stringify(font) }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Font settings saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save font settings");
    } finally {
      savingFont = false;
    }
  }

  async function saveCustomCSS() {
    savingCSS = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { customCSS }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Custom CSS saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save custom CSS");
    } finally {
      savingCSS = false;
    }
  }

  async function saveTheme() {
    savingTheme = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { theme, themeToggle }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Theme settings saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save theme settings");
    } finally {
      savingTheme = false;
    }
  }

  async function saveAnnouncement() {
    savingAnnouncement = true;
    try {
      const rawReshow = announcement.reshowAfterInHours;
      const parsedReshow = rawReshow == null ? "" : String(rawReshow).trim();
      const reshowAfterInHours = parsedReshow.length === 0 ? null : Math.max(0, Number(parsedReshow));

      const payload: SiteAnnouncement = {
        title: announcement.title.trim(),
        message: announcement.message.trim(),
        type: announcement.type,
        reshowAfterInHours: Number.isFinite(reshowAfterInHours as number) ? reshowAfterInHours : null,
        cancellable: announcement.cancellable,
        ctaURL: announcement.ctaURL.trim() ? announcement.ctaURL.trim() : null,
        ctaText: announcement.ctaText.trim() ? announcement.ctaText.trim() : null
      };

      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { announcement: JSON.stringify(payload) }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        announcement.reshowAfterInHours = reshowAfterInHours == null ? "" : String(reshowAfterInHours);
        toast.success("Announcement settings saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save announcement settings");
    } finally {
      savingAnnouncement = false;
    }
  }

  async function fetchPages() {
    loadingPages = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getPages" })
      });
      const result = await response.json();
      if (Array.isArray(result)) {
        allPages = result.map((p: { id: number; page_path: string; page_title: string }) => ({
          id: p.id,
          page_path: p.page_path,
          page_title: p.page_title
        }));
      }
    } catch {
      // silently fail
    } finally {
      loadingPages = false;
    }
  }

  async function savePageOrdering() {
    savingPageOrdering = true;
    try {
      const payload: PageOrderingSettings = {
        enabled: pageOrderingEnabled,
        order: displayPages.map((p) => p.id)
      };

      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { pageOrderingSettings: JSON.stringify(payload) }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        orderedPageIds = displayPages.map((p) => p.id);
        toast.success("Page ordering saved successfully");
      }
    } catch (e) {
      toast.error("Failed to save page ordering");
    } finally {
      savingPageOrdering = false;
    }
  }

  function movePageUp(index: number) {
    if (index <= 0) return;
    const pages = displayPages.map((p) => p.id);
    [pages[index - 1], pages[index]] = [pages[index], pages[index - 1]];
    orderedPageIds = pages;
  }

  function movePageDown(index: number) {
    const pages = displayPages.map((p) => p.id);
    if (index >= pages.length - 1) return;
    [pages[index], pages[index + 1]] = [pages[index + 1], pages[index]];
    orderedPageIds = pages;
  }

  function resetFooter() {
    footerHTML = defaultFooterHTML;
  }

  import { onMount } from "svelte";
  import { Spinner } from "$lib/components/ui/spinner";

  // Initialize on mount
  onMount(() => {
    fetchSettings();
    fetchPages();
  });
</script>

<div class="flex w-full flex-col gap-6 overflow-hidden">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="h-6 w-6" />
    </div>
  {:else}
    <!-- Footer HTML Section -->
    <Card.Root>
      <Card.Header class="border-b">
        <Card.Title>Site Footer</Card.Title>
        <Card.Description>
          Customize the footer HTML of your status page. Use HTML to add links, text, and other content.
        </Card.Description>
      </Card.Header>
      <Card.Content class="pt-6">
        <div class="w-full">
          <div class="overflow-hidden rounded-md border">
            <CodeMirror
              bind:value={footerHTML}
              lang={html()}
              theme={mode.current === "dark" ? githubDark : githubLight}
              styles={{
                "&": {
                  width: "100%",
                  maxWidth: "100%",
                  height: "320px"
                }
              }}
            />
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-between border-t pt-6">
        <Button variant="outline" onclick={resetFooter}>Reset to Default</Button>
        <Button onclick={saveFooter} disabled={savingFooter}>
          {#if savingFooter}
            <Loader class="h-4 w-4 animate-spin" />
          {/if}
          Save Footer
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Status Colors Section -->
    <Card.Root>
      <Card.Header class="border-b">
        <Card.Title>Status Colors</Card.Title>
        <Card.Description
          >Customize the colors used to represent different monitor statuses. Set separate colors for light and dark
          themes.</Card.Description
        >
      </Card.Header>
      <Card.Content class="pt-6">
        <div class="ktable rounded-lg border">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Name</Table.Head>
                <Table.Head>Light</Table.Head>
                <Table.Head>Dark</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <Table.Row>
                <Table.Cell class="font-medium">{constants.UP}</Table.Cell>
                <Table.Cell>
                  <ColorPicker
                    bind:hex={colors.UP}
                    position="responsive"
                    isAlpha={false}
                    isDark={mode.current === "dark"}
                    --input-size="16px"
                    isTextInput={true}
                    label=""
                  />
                </Table.Cell>
                <Table.Cell>
                  <ColorPicker
                    bind:hex={colorsDark.UP}
                    position="responsive"
                    isAlpha={false}
                    isDark={mode.current === "dark"}
                    --input-size="16px"
                    isTextInput={true}
                    label=""
                  />
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell class="font-medium">{constants.DEGRADED}</Table.Cell>
                <Table.Cell>
                  <ColorPicker
                    bind:hex={colors.DEGRADED}
                    position="responsive"
                    isAlpha={false}
                    isDark={mode.current === "dark"}
                    --input-size="16px"
                    isTextInput={true}
                    label=""
                  />
                </Table.Cell>
                <Table.Cell>
                  <ColorPicker
                    bind:hex={colorsDark.DEGRADED}
                    position="responsive"
                    isAlpha={false}
                    isDark={mode.current === "dark"}
                    --input-size="16px"
                    isTextInput={true}
                    label=""
                  />
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell class="font-medium">{constants.DOWN}</Table.Cell>
                <Table.Cell>
                  <ColorPicker
                    bind:hex={colors.DOWN}
                    position="responsive"
                    isAlpha={false}
                    isDark={mode.current === "dark"}
                    --input-size="16px"
                    isTextInput={true}
                    label=""
                  />
                </Table.Cell>
                <Table.Cell>
                  <ColorPicker
                    bind:hex={colorsDark.DOWN}
                    position="responsive"
                    isAlpha={false}
                    isDark={mode.current === "dark"}
                    --input-size="16px"
                    isTextInput={true}
                    label=""
                  />
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell class="font-medium">{constants.MAINTENANCE}</Table.Cell>
                <Table.Cell>
                  <ColorPicker
                    bind:hex={colors.MAINTENANCE}
                    position="responsive"
                    isAlpha={false}
                    isDark={mode.current === "dark"}
                    --input-size="16px"
                    isTextInput={true}
                    label=""
                  />
                </Table.Cell>
                <Table.Cell>
                  <ColorPicker
                    bind:hex={colorsDark.MAINTENANCE}
                    position="responsive"
                    isAlpha={false}
                    isDark={mode.current === "dark"}
                    --input-size="16px"
                    isTextInput={true}
                    label=""
                  />
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell class="font-medium">Accent</Table.Cell>
                <Table.Cell>
                  <ColorPicker
                    bind:hex={colors.ACCENT}
                    position="responsive"
                    isAlpha={false}
                    isDark={mode.current === "dark"}
                    --input-size="16px"
                    isTextInput={true}
                    label=""
                  />
                </Table.Cell>
                <Table.Cell>
                  <ColorPicker
                    bind:hex={colorsDark.ACCENT}
                    position="responsive"
                    isAlpha={false}
                    isDark={mode.current === "dark"}
                    --input-size="16px"
                    isTextInput={true}
                    label=""
                  />
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell class="font-medium">Accent Foreground</Table.Cell>
                <Table.Cell>
                  <ColorPicker
                    bind:hex={colors.ACCENT_FOREGROUND}
                    position="responsive"
                    isAlpha={false}
                    isDark={mode.current === "dark"}
                    --input-size="16px"
                    isTextInput={true}
                    label=""
                  />
                </Table.Cell>
                <Table.Cell>
                  <ColorPicker
                    bind:hex={colorsDark.ACCENT_FOREGROUND}
                    position="responsive"
                    isAlpha={false}
                    isDark={mode.current === "dark"}
                    --input-size="16px"
                    isTextInput={true}
                    label=""
                  />
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end border-t pt-6">
        <Button onclick={saveColors} disabled={savingColors}>
          {#if savingColors}
            <Loader class="h-4 w-4 animate-spin" />
          {/if}
          Save Colors
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Font Section -->
    <Card.Root>
      <Card.Header class="border-b">
        <Card.Title class="flex items-center gap-2">
          Font
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Info class="text-muted-foreground h-4 w-4" />
            </Tooltip.Trigger>
            <Tooltip.Content class="max-w-xs">
              <p>
                You can use any web font by providing the CSS URL and font family name. Popular sources include Google
                Fonts and Bunny Fonts.
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
        </Card.Title>
        <Card.Description>Customize the font used throughout your status page.</Card.Description>
      </Card.Header>
      <Card.Content class="pt-6">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <Label for="font-url">Font CSS URL</Label>
            <Input
              bind:value={font.cssSrc}
              type="text"
              id="font-url"
              placeholder="https://fonts.bunny.net/css?family=lato:400,700&display=swap"
              class="mt-1"
            />
            <p class="text-muted-foreground mt-1 text-xs">The URL to the CSS file that loads the font</p>
          </div>
          <div>
            <Label for="font-family">Font Family Name</Label>
            <Input bind:value={font.family} type="text" id="font-family" placeholder="Lato" class="mt-1" />
            <p class="text-muted-foreground mt-1 text-xs">The name of the font family as defined in the CSS</p>
          </div>
        </div>

        <p class="text-muted-foreground mt-4 text-sm">
          Want to upload and use custom fonts? Read more about it in the
          <a
            href={clientResolver(resolve, "/docs/v4/guides/custom-fonts")}
            target="_blank"
            class="text-foreground underline underline-offset-4"
          >
            documentation
          </a>.
        </p>
      </Card.Content>
      <Card.Footer class="flex justify-end border-t pt-6">
        <Button onclick={saveFont} disabled={savingFont}>
          {#if savingFont}
            <Loader class="h-4 w-4 animate-spin" />
          {/if}
          Save Font
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Theme Configuration Section -->
    <Card.Root>
      <Card.Header class="border-b">
        <Card.Title>Theme</Card.Title>
        <Card.Description>Configure the default theme and user preferences for your status page.</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6 pt-6">
        <div class="space-y-3">
          <Label>Default Theme</Label>
          <RadioGroup.Root bind:value={theme} class="flex flex-col gap-3">
            <div class="flex items-center space-x-2">
              <RadioGroup.Item value="light" id="theme-light" />
              <Label for="theme-light" class="cursor-pointer font-normal">Light</Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroup.Item value="dark" id="theme-dark" />
              <Label for="theme-dark" class="cursor-pointer font-normal">Dark</Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroup.Item value="system" id="theme-system" />
              <Label for="theme-system" class="cursor-pointer font-normal">System</Label>
            </div>
          </RadioGroup.Root>
          <p class="text-muted-foreground text-xs">
            The theme that will be used by default when users visit your status page.
          </p>
        </div>

        <div class="flex items-start space-x-3 rounded-lg border p-4">
          <Checkbox
            id="theme-toggle"
            checked={themeToggle === "YES"}
            onCheckedChange={(checked) => (themeToggle = checked ? "YES" : "NO")}
          />
          <div class="space-y-1">
            <Label for="theme-toggle" class="cursor-pointer">Allow users to toggle theme</Label>
            <p class="text-muted-foreground text-sm">
              When enabled, users can switch between light and dark themes using a toggle button.
            </p>
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end border-t pt-6">
        <Button onclick={saveTheme} disabled={savingTheme}>
          {#if savingTheme}
            <Loader class="h-4 w-4 animate-spin" />
          {/if}
          Save Theme
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Announcement Section -->
    <Card.Root>
      <Card.Header class="border-b">
        <Card.Title>Announcement</Card.Title>
        <Card.Description>Configure a site-wide announcement message shown to visitors.</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4 pt-6">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <Label for="announcement-title">Title</Label>
            <Input id="announcement-title" bind:value={announcement.title} placeholder="Scheduled Maintenance" />
          </div>
          <div class="space-y-2">
            <Label for="announcement-type">Type</Label>
            <Select.Root
              type="single"
              value={announcement.type}
              onValueChange={(v: string | undefined) => v && (announcement.type = v as "INFO" | "WARNING" | "ERROR")}
            >
              <Select.Trigger id="announcement-type" class="w-full">{announcement.type}</Select.Trigger>
              <Select.Content>
                <Select.Item value="INFO">INFO</Select.Item>
                <Select.Item value="WARNING">WARNING</Select.Item>
                <Select.Item value="ERROR">ERROR</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="announcement-message">Message</Label>
          <Textarea
            id="announcement-message"
            bind:value={announcement.message}
            placeholder="We are currently performing infrastructure upgrades."
            rows={4}
          />
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div class="space-y-2">
            <Label for="announcement-reshow">Reshow After (hours)</Label>
            <Input
              id="announcement-reshow"
              type="number"
              min="0"
              bind:value={announcement.reshowAfterInHours}
              placeholder="Leave empty to never reshow automatically"
            />
            <p class="text-muted-foreground text-xs">Leave empty for null.</p>
          </div>
          <div class="space-y-2">
            <Label for="announcement-cta">CTA URL (optional)</Label>
            <Input
              id="announcement-cta-url"
              bind:value={announcement.ctaURL}
              placeholder="https://status.example.com/incident/123"
            />
          </div>
          <div class="space-y-2">
            <Label for="announcement-cta-text">CTA Text (optional)</Label>
            <Input id="announcement-cta-text" bind:value={announcement.ctaText} placeholder="Learn more" />
          </div>
        </div>

        <div class="flex items-start space-x-3 rounded-lg border p-4">
          <Checkbox
            id="announcement-cancellable"
            checked={announcement.cancellable}
            onCheckedChange={(checked) => (announcement.cancellable = checked === true)}
          />
          <div class="space-y-1">
            <Label for="announcement-cancellable" class="cursor-pointer">Cancellable</Label>
            <p class="text-muted-foreground text-sm">Allow users to dismiss the announcement.</p>
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end border-t pt-6">
        <Button onclick={saveAnnouncement} disabled={savingAnnouncement}>
          {#if savingAnnouncement}
            <Loader class="h-4 w-4 animate-spin" />
          {/if}
          Save Announcement
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Page Ordering Section -->
    <Card.Root>
      <Card.Header class="border-b">
        <Card.Title>Page Ordering</Card.Title>
        <Card.Description>
          Control the display order of pages in the page switcher. New pages will appear at the end of the list.
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4 pt-6">
        <div class="flex items-start space-x-3 rounded-lg border p-4">
          <Checkbox
            id="page-ordering-enabled"
            checked={pageOrderingEnabled}
            onCheckedChange={(checked) => (pageOrderingEnabled = checked === true)}
          />
          <div class="space-y-1">
            <Label for="page-ordering-enabled" class="cursor-pointer">Enable custom page ordering</Label>
            <p class="text-muted-foreground text-sm">
              When enabled, pages will be displayed in the order below instead of the default creation order.
            </p>
          </div>
        </div>

        {#if loadingPages}
          <div class="flex items-center justify-center py-6">
            <Spinner class="h-5 w-5" />
          </div>
        {:else if allPages.length === 0}
          <p class="text-muted-foreground py-4 text-center text-sm">No pages found.</p>
        {:else}
          <div class="rounded-lg border">
            {#each displayPages as page, index (page.id)}
              <div
                class="flex items-center justify-between px-4 py-3 {index < displayPages.length - 1 ? 'border-b' : ''}"
              >
                <div class="flex items-center gap-3">
                  <GripVertical class="text-muted-foreground h-4 w-4 shrink-0" />
                  <div>
                    <p class="text-sm font-medium">{page.page_title}</p>
                    <p class="text-muted-foreground text-xs">/{page.page_path || ""}</p>
                  </div>
                </div>
                {#if pageOrderingEnabled}
                  <div class="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      disabled={index === 0}
                      onclick={() => movePageUp(index)}
                    >
                      <ArrowUp class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      disabled={index === displayPages.length - 1}
                      onclick={() => movePageDown(index)}
                    >
                      <ArrowDown class="h-4 w-4" />
                    </Button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </Card.Content>
      <Card.Footer class="flex justify-end border-t pt-6">
        <Button onclick={savePageOrdering} disabled={savingPageOrdering || loadingPages}>
          {#if savingPageOrdering}
            <Loader class="h-4 w-4 animate-spin" />
          {/if}
          Save Page Ordering
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- Custom CSS Section -->
    <Card.Root>
      <Card.Header class="border-b">
        <Card.Title>Custom CSS</Card.Title>
        <Card.Description>
          Add custom CSS to further customize the appearance of your status page. Do not include &lt;style&gt; tags.
          Learn more in the
          <a
            href={clientResolver(resolve, "/docs/v4/guides/custom-js-css-guide")}
            target="_blank"
            class="text-foreground underline underline-offset-4"
          >
            documentation
          </a>.
        </Card.Description>
      </Card.Header>
      <Card.Content class="pt-6">
        <div class="w-full">
          <div class="overflow-hidden rounded-md border">
            <CodeMirror
              bind:value={customCSS}
              lang={css()}
              theme={mode.current === "dark" ? githubDark : githubLight}
              styles={{
                "&": {
                  width: "100%",
                  maxWidth: "100%",
                  height: "320px"
                }
              }}
            />
          </div>
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-end border-t pt-6">
        <Button onclick={saveCustomCSS} disabled={savingCSS}>
          {#if savingCSS}
            <Loader class="h-4 w-4 animate-spin" />
          {/if}
          Save Custom CSS
        </Button>
      </Card.Footer>
    </Card.Root>
  {/if}
</div>

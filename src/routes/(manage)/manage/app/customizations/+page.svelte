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
  import type { SiteAnnouncement } from "$lib/types/site.js";

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

  type AnnouncementForm = Omit<SiteAnnouncement, "reshowAfterInHours" | "cta"> & {
    reshowAfterInHours: string;
    cta: string;
  };

  // State
  let loading = $state(true);
  let savingFooter = $state(false);
  let savingColors = $state(false);
  let savingFont = $state(false);
  let savingCSS = $state(false);
  let savingTheme = $state(false);
  let savingAnnouncement = $state(false);

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
    cta: ""
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
            cta: result.announcement.cta || ""
          };
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
        cta: announcement.cta.trim() ? announcement.cta.trim() : null
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

  function resetFooter() {
    footerHTML = defaultFooterHTML;
  }

  import { onMount } from "svelte";

  // Initialize on mount
  onMount(() => {
    fetchSettings();
  });
</script>

<div class="flex flex-col gap-6 overflow-hidden">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Customizations</h1>
      <p class="text-muted-foreground">Customize the look and feel of your status page</p>
    </div>
  </div>

  {#if loading}
    <div class="flex h-64 items-center justify-center">
      <Loader class="text-muted-foreground h-8 w-8 animate-spin" />
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
            <Loader class="mr-2 h-4 w-4 animate-spin" />
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
            <Loader class="mr-2 h-4 w-4 animate-spin" />
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
            href="https://kener.ing/docs/custom-fonts/"
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
            <Loader class="mr-2 h-4 w-4 animate-spin" />
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
            <Loader class="mr-2 h-4 w-4 animate-spin" />
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

        <div class="grid gap-4 md:grid-cols-2">
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
              id="announcement-cta"
              bind:value={announcement.cta}
              placeholder="https://status.example.com/incident/123"
            />
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
            <Loader class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Save Announcement
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
            href="https://kener.ing/docs/custom-js-css-guide"
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
            <Loader class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Save Custom CSS
        </Button>
      </Card.Footer>
    </Card.Root>
  {/if}
</div>

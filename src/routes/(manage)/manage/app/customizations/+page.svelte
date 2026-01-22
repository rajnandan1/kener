<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
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

  interface StatusColors {
    UP: string;
    DOWN: string;
    DEGRADED: string;
    MAINTENANCE: string;
  }

  interface FontConfig {
    cssSrc: string;
    family: string;
  }

  // State
  let loading = $state(true);
  let savingFooter = $state(false);
  let savingColors = $state(false);
  let savingFont = $state(false);
  let savingCSS = $state(false);

  // Data
  let footerHTML = $state("");
  let defaultFooterHTML = $state("");
  let colors = $state<StatusColors>({
    UP: "#67ab95",
    DOWN: "#ca3038",
    DEGRADED: "#e6ca61",
    MAINTENANCE: "#6679cc"
  });
  let font = $state<FontConfig>({
    cssSrc: "",
    family: ""
  });
  let customCSS = $state("");

  async function fetchSettings() {
    loading = true;
    try {
      const response = await fetch("/manage/api", {
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
            MAINTENANCE: result.colors.MAINTENANCE || "#6679cc"
          };
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
      const response = await fetch("/manage/api", {
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
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: { colors: JSON.stringify(colors) }
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
      const response = await fetch("/manage/api", {
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
      const response = await fetch("/manage/api", {
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
  <!-- Breadcrumb -->
  <Breadcrumb.Root>
    <Breadcrumb.List>
      <Breadcrumb.Item>
        <Breadcrumb.Link href="/manage/app">Dashboard</Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>Customizations</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.List>
  </Breadcrumb.Root>

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
        <Card.Description>Customize the colors used to represent different monitor statuses.</Card.Description>
      </Card.Header>
      <Card.Content class="pt-6">
        <div class="flex flex-wrap justify-around gap-8">
          <div class="flex flex-col items-center gap-2">
            <Label class="flex items-center gap-2">{constants.UP}</Label>
            <ColorPicker
              bind:hex={colors.UP}
              position="responsive"
              isAlpha={false}
              isDark={mode.current === "dark"}
              --input-size="16px"
              isTextInput={true}
              label=""
            />
          </div>
          <div class="flex flex-col items-center gap-2">
            <Label class="flex items-center gap-2">{constants.DEGRADED}</Label>
            <ColorPicker
              bind:hex={colors.DEGRADED}
              position="responsive"
              isAlpha={false}
              isDark={mode.current === "dark"}
              --input-size="16px"
              isTextInput={true}
              label=""
            />
          </div>
          <div class="flex flex-col items-center gap-2">
            <Label class="flex items-center gap-2">{constants.DOWN}</Label>
            <ColorPicker
              bind:hex={colors.DOWN}
              position="responsive"
              isAlpha={false}
              isDark={mode.current === "dark"}
              --input-size="16px"
              isTextInput={true}
              label=""
            />
          </div>
          <div class="flex flex-col items-center gap-2">
            <Label class="flex items-center gap-2">{constants.MAINTENANCE}</Label>
            <ColorPicker
              bind:hex={colors.MAINTENANCE}
              position="responsive"
              isAlpha={false}
              isDark={mode.current === "dark"}
              --input-size="16px"
              isTextInput={true}
              label=""
            />
          </div>
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
        {#if font.family}
          <div class="mt-4 rounded-lg border p-4">
            <p class="text-muted-foreground text-sm">Preview:</p>
            <p class="mt-2 text-lg" style="font-family: '{font.family}', sans-serif;">
              The quick brown fox jumps over the lazy dog
            </p>
          </div>
        {/if}
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

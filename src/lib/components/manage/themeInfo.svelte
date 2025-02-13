<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Plus, X, Info } from "lucide-svelte";
  import autoAnimate from "@formkit/auto-animate";
  import { siteDataExtractFromDb, storeSiteData } from "$lib/clientTools.js";
  import { base } from "$app/paths";
  import { Loader } from "lucide-svelte";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { Tooltip } from "bits-ui";
  import ColorPicker from "svelte-awesome-color-picker";

  export let data;

  let formState = "idle";

  let themeData = {
    pattern: "none",
    theme: "light",
    themeToggle: "YES",
    barStyle: "PARTIAL",
    barRoundness: "ROUNDED",
    summaryStyle: "CURRENT",
    colorsJ: {
      UP: "#4ead94",
      DOWN: "#ca3038",
      DEGRADED: "#e6ca61"
    },
    fontJ: {
      cssSrc:
        "https://fonts.bunny.net/css?family=albert-sans:100,100i,200,200i,300,300i,400,400i,500,500i,600,600i,700,700i,800,800i,900,900i&display=swap",
      family: "Albert Sans"
    },
    colors: "",
    font: "",
    customCSS: ""
  };

  themeData = siteDataExtractFromDb(data.siteData, themeData);

  if (data.siteData.colors) {
    themeData.colorsJ = data.siteData.colors;
  }
  if (data.siteData.font) {
    themeData.fontJ = data.siteData.font;
  }

  async function formSubmit() {
    formState = "loading";
    let themeDataAPI = { ...themeData };
    themeDataAPI.colors = JSON.stringify(themeDataAPI.colorsJ);
    themeDataAPI.font = JSON.stringify(themeDataAPI.fontJ);
    delete themeDataAPI.colorsJ;
    delete themeDataAPI.fontJ;
    let resp = await storeSiteData(themeDataAPI);
    //print data
    let data = await resp.json();
    formState = "idle";
    if (data.error) {
      alert(data.error);
      return;
    }
  }
</script>

<Card.Root class="mt-4">
  <Card.Header class="border-b">
    <Card.Title>Theme Customization</Card.Title>
    <Card.Description>
      You can customize the theme of your site here. You can change the pattern, theme, colors, font, and monitor style.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmit}>
      <p class="font-medium">
        Home Page Pattern
        <Tooltip.Root openDelay={100}>
          <Tooltip.Trigger class="">
            <Info class="inline-block h-4 w-4 text-muted-foreground" />
          </Tooltip.Trigger>
          <Tooltip.Content class="max-w-md">
            <div
              class=" flex items-center justify-center rounded border bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
            >
              Choose the pattern for the home page. You can choose between squares, dots, or none.
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      </p>

      <div class="flex">
        <RadioGroup.Root bind:value={themeData.pattern} onValueChange={(e) => (themeData.pattern = e)}>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="squares" id="rsq" />
            <Label for="rsq">Squares</Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="dots" id="rdot" />
            <Label for="rdot">Dots</Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="none" id="rnone" />
            <Label for="rnone">None</Label>
          </div>
        </RadioGroup.Root>
      </div>
      <hr />
      <p class="font-medium">
        Default Theme
        <Tooltip.Root openDelay={100}>
          <Tooltip.Trigger class="">
            <Info class="inline-block h-4 w-4 text-muted-foreground" />
          </Tooltip.Trigger>
          <Tooltip.Content class="max-w-md">
            <div
              class=" flex items-center justify-center rounded border bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
            >
              Choose the default theme for the site. You can choose between light, dark, or system.
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      </p>
      <div class="flex">
        <RadioGroup.Root bind:value={themeData.theme} onValueChange={(e) => (themeData.theme = e)}>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="none" id="none_theme" />
            <Label for="none_theme">None</Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="light" id="light_theme" />
            <Label for="light_theme">Light</Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="dark" id="dark_theme" />
            <Label for="dark_theme">Dark</Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="system" id="system_theme" />
            <Label for="system_theme">System</Label>
          </div>
        </RadioGroup.Root>
      </div>
      <p class="font-medium">
        <label>
          <input
            on:change={(e) => {
              themeData.themeToggle = e.target.checked === true ? "YES" : "NO";
            }}
            type="checkbox"
            checked={themeData.themeToggle === "YES"}
          />
          Let Users toggle theme between light and dark
        </label>
      </p>
      <hr />
      <p class="font-medium">Monitor Style</p>

      <div class="flex gap-x-24">
        <RadioGroup.Root bind:value={themeData.barStyle} onValueChange={(e) => (themeData.barStyle = e)}>
          <p class="text-sm font-medium text-muted-foreground">
            Status bar
            <Tooltip.Root openDelay={100}>
              <Tooltip.Trigger class="">
                <Info class="inline-block h-4 w-4 text-muted-foreground" />
              </Tooltip.Trigger>
              <Tooltip.Content class="max-w-md">
                <div
                  class=" flex items-center justify-center rounded border bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
                >
                  Choose the style for the monitor. You can choose between partial or full.
                </div>
              </Tooltip.Content>
            </Tooltip.Root>
          </p>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="PARTIAL" id="barStylePARTIAL" />
            <Label for="barStylePARTIAL">PARTIAL</Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="FULL" id="barStyleFULL" />
            <Label for="barStyleFULL">FULL</Label>
          </div>
        </RadioGroup.Root>
        <RadioGroup.Root bind:value={themeData.barRoundness} onValueChange={(e) => (themeData.barRoundness = e)}>
          <p class="text-sm font-medium text-muted-foreground">
            Roundness
            <Tooltip.Root openDelay={100}>
              <Tooltip.Trigger class="">
                <Info class="inline-block h-4 w-4 text-muted-foreground" />
              </Tooltip.Trigger>
              <Tooltip.Content class="max-w-md">
                <div
                  class=" flex items-center justify-center rounded border bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
                >
                  Choose the roundness for the monitor. You can choose between rounded or sharp.
                </div>
              </Tooltip.Content>
            </Tooltip.Root>
          </p>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="SHARP" id="barRoundnessSHARP" />
            <Label for="barRoundnessSHARP">SHARP</Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="ROUNDED" id="barRoundnessRound" />
            <Label for="barRoundnessRound">ROUNDED</Label>
          </div>
        </RadioGroup.Root>
        <RadioGroup.Root bind:value={themeData.summaryStyle} onValueChange={(e) => (themeData.summaryStyle = e)}>
          <p class="text-sm font-medium text-muted-foreground">
            Summary Type
            <Tooltip.Root openDelay={100}>
              <Tooltip.Trigger class="">
                <Info class="inline-block h-4 w-4 text-muted-foreground" />
              </Tooltip.Trigger>
              <Tooltip.Content class="max-w-md">
                <div
                  class=" flex items-center justify-center rounded border bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
                >
                  Choose the summary type for the monitor. You can choose between current or day.
                </div>
              </Tooltip.Content>
            </Tooltip.Root>
          </p>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="CURRENT" id="summaryStyle1" />
            <Label for="summaryStyle1">CURRENT</Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroup.Item value="DAY" id="summaryStyle2" />
            <Label for="summaryStyle2">DAY</Label>
          </div>
        </RadioGroup.Root>
      </div>
      <hr />
      <p class="font-medium">
        Colors
        <Tooltip.Root openDelay={100}>
          <Tooltip.Trigger class="">
            <Info class="inline-block h-4 w-4 text-muted-foreground" />
          </Tooltip.Trigger>
          <Tooltip.Content class="max-w-md">
            <div
              class=" flex items-center justify-center rounded border bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
            >
              Choose the colors for the monitor. You can choose between UP, DEGRADED, and DOWN.
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      </p>
      <div class="flex w-full flex-row justify-evenly gap-2">
        <div class="relative w-full">
          <ColorPicker
            bind:hex={themeData.colorsJ.UP}
            position="responsive"
            label="UP"
            --cp-input-color="#777"
            --cp-button-hover-color="#767676"
            on:input={(event) => {
              themeData.colorsJ.UP = event.detail.hex;
            }}
          />
        </div>
        <div class="relative w-full">
          <ColorPicker
            bind:hex={themeData.colorsJ.DEGRADED}
            position="responsive"
            label="DEGRADED"
            --cp-input-color="#777"
            --cp-button-hover-color="#767676"
            on:input={(event) => {
              themeData.colorsJ.DEGRADED = event.detail.hex;
            }}
          />
        </div>
        <div class="relative w-full">
          <ColorPicker
            bind:hex={themeData.colorsJ.DOWN}
            position="responsive"
            label="DOWN"
            --cp-input-color="#777"
            --cp-button-hover-color="#767676"
            on:input={(event) => {
              themeData.colorsJ.DOWN = event.detail.hex;
            }}
          />
        </div>
      </div>
      <hr />
      <p class="font-medium">
        Font
        <Tooltip.Root openDelay={100}>
          <Tooltip.Trigger class="">
            <Info class="inline-block h-4 w-4 text-muted-foreground" />
          </Tooltip.Trigger>
          <Tooltip.Content class="max-w-md">
            <div
              class=" flex items-center justify-center rounded border bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
            >
              Choose the font for the monitor. You can choose the font URL and font family name.
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      </p>
      <div class="flex w-full flex-row justify-evenly gap-2">
        <div class="w-full">
          <Label for="cssSrc" class="text-sm text-muted-foreground">Font URL</Label>
          <Input
            bind:value={themeData.fontJ.cssSrc}
            class="mt-2"
            type="text"
            id="cssSrc"
            placeholder="https://fonts.bunny.net/css?family=lato:100,100i,300,300i,400,400i,700,700i,900,900i&display=swap"
          />
        </div>
      </div>
      <div class="flex w-full flex-row justify-start gap-2">
        <div class="w-48">
          <Label for="fontName" class="text-sm text-muted-foreground">Font Family Name</Label>
          <Input bind:value={themeData.fontJ.family} class="mt-2" type="text" id="fontName" placeholder="Lato" />
        </div>
      </div>
      <p class="text-xs text-muted-foreground">
        Want to upload and use custom font? Read more about it <a
          href="https://kener.ing/docs/custom-fonts/"
          class="text-card-foreground"
          target="_blank">here</a
        >.
      </p>
      <hr />
      <p class="font-medium">Custom CSS</p>
      <div class="flex w-full flex-row justify-start gap-2">
        <div class="w-full">
          <Label for="customCSS" class="text-sm text-muted-foreground">
            You can add custom CSS to style your site. Do not include style tags.
          </Label>
          <textarea
            bind:value={themeData.customCSS}
            id="customCSS"
            class="mt-1 h-48 w-full rounded-sm border p-2"
            placeholder=".className&#123;color: red;&#125;"
          ></textarea>
        </div>
      </div>
      <hr />
      <div class="flex w-full justify-end">
        <Button type="submit" disabled={formState === "loading"}>
          Save
          {#if formState === "loading"}
            <Loader class="ml-2 inline h-4 w-4 animate-spin" />
          {/if}
        </Button>
      </div>
    </form>
  </Card.Content>
</Card.Root>

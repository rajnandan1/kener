<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import autoAnimate from "@formkit/auto-animate";
  import { siteDataExtractFromDb, storeSiteData } from "$lib/clientTools.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { base } from "$app/paths";
  import Plus from "lucide-svelte/icons/plus";
  import X from "lucide-svelte/icons/x";
  import Check from "lucide-svelte/icons/check";
  import Loader from "lucide-svelte/icons/loader";
  import Info from "lucide-svelte/icons/info";
  import { Tooltip } from "bits-ui";

  export let data;

  let metaTags = [];
  function addNewRow() {
    metaTags = [
      ...metaTags,
      {
        key: "",
        value: ""
      }
    ];
  }

  function removeRow(i) {
    metaTags = metaTags.filter((_, index) => index !== i);
  }

  metaTags = siteDataExtractFromDb(data.siteData, {
    metaTags: JSON.stringify(metaTags)
  }).metaTags;

  let formState = "idle";
  let formStateAnalytics = "idle";

  let metaError = "";
  async function formSubmit() {
    metaError = "";
    formState = "loading";
    let resp = await storeSiteData({
      metaTags: JSON.stringify(metaTags)
    });
    //print data
    let data = await resp.json();
    formState = "idle";
    if (data.error) {
      metaError = data.error;
      return;
    }
  }
  let seoError = "";
  async function formSubmitAnalytics() {
    seoError = "";
    formStateAnalytics = "loading";

    let dataToSave = {};
    selectedAnalytics.requirements.forEach((req) => {
      dataToSave[req.label] = req.value;
    });
    let finalData = {};
    finalData[selectedAnalytics.key] = JSON.stringify({
      requirements: dataToSave,
      isEnabled: selectedAnalytics.isEnabled
    });
    let resp = await storeSiteData(finalData);
    //print data
    let data = await resp.json();
    formStateAnalytics = "idle";
    if (data.error) {
      seoError = data.error;
      return;
    } else {
      selectedAnalytics.activeInSite = selectedAnalytics.isEnabled;
      //update activeInSite in analyticsDropdownItems also
      let index = analyticsDropdownItems.findIndex((item) => item.label === selectedAnalytics.label);
      analyticsDropdownItems[index].activeInSite = true;
    }
  }
  let selectedAnalytics;
  let analyticsDropdownItems = [
    {
      label: "Google Analytics",
      logo: `/ga.png`,
      key: "analytics.googleTagManager",
      isEnabled: false,
      requirements: [
        {
          label: "Measurement ID",
          type: "text",
          placeholder: "G-S05E5E5E5E5",
          required: true,
          value: ""
        }
      ]
    },
    {
      label: "Plausible",
      logo: `/plausible.png`,
      key: "analytics.plausible",
      isEnabled: false,
      requirements: [
        {
          label: "Domain",
          type: "text",
          placeholder: "kener.ing",
          required: true,
          value: new URL(data.siteData.siteURL).hostname
        },
        {
          label: "API",
          type: "text",
          placeholder: "https://plausible.io/api/event",
          required: true,
          value: "https://plausible.io/api/event"
        },
        {
          label: "Script Source",
          type: "text",
          placeholder: "https://plausible.io/js/script.pageview-props.tagged-events.js",
          required: true,
          value: "https://plausible.io/js/script.pageview-props.tagged-events.js"
        }
      ]
    },
    {
      label: "MixPanel",
      logo: `/mixpanel.png`,
      key: "analytics.mixpanel",
      isEnabled: false,
      requirements: [
        {
          label: "Project Token",
          type: "text",
          placeholder: "YOUR_PROJECT_TOKEN",
          required: true,
          value: ""
        }
      ]
    },
    {
      label: "Amplitude",
      logo: `/amplitude.png`,
      key: "analytics.amplitude",
      isEnabled: false,
      requirements: [
        {
          label: "Amplitude API Key",
          type: "text",
          placeholder: "API key for your Amplitude project",
          required: true,
          value: ""
        }
      ]
    },
    {
      label: "Microsoft Clarity",
      logo: `/clarity.png`,
      key: "analytics.clarity",
      isEnabled: false,
      requirements: [
        {
          label: "Project ID",
          type: "text",
          placeholder: "Project ID for your Microsoft Clarity project",
          required: true,
          value: ""
        }
      ]
    },
    {
      label: "Umami",
      logo: `/umami.png`,
      key: "analytics.umami",
      isEnabled: false,
      requirements: [
        {
          label: "Website ID",
          type: "text",
          placeholder: "Website ID for your umami script and domain",
          required: true,
          value: ""
        }
      ]
    }
  ];

  analyticsDropdownItems = analyticsDropdownItems.map((item) => {
    let dbData = data.siteData[item.key];
    if (!!dbData) {
      item.isEnabled = dbData.isEnabled;
      item.requirements.forEach((req) => {
        req.value = dbData.requirements[req.label];
      });
      item.activeInSite = true;
    }
    return item;
  });
  selectedAnalytics = analyticsDropdownItems[0];
</script>

<Card.Root class="mt-4">
  <Card.Header class="border-b">
    <Card.Title>Analytics</Card.Title>
    <Card.Description>Add your analytics ID/Key here. You can add multiple analytics providers.</Card.Description>
  </Card.Header>
  <Card.Content>
    <div class="mt-4 grid grid-cols-4 overflow-hidden rounded-md border">
      <div class="col-span-1 flex flex-col border-r">
        {#each analyticsDropdownItems as item}
          <Button
            variant={!!selectedAnalytics && selectedAnalytics.label === item.label ? "primary" : "ghost"}
            class="flex items-center justify-between gap-x-2 rounded-none border-b text-sm last:border-none"
            on:click={() => (selectedAnalytics = item)}
          >
            <div class="flex flex-row gap-x-3">
              <img src={base + item.logo} class="w-5" alt={item.label} />
              <span>{item.label}</span>
            </div>
            {#if item.activeInSite && item.isEnabled}
              <div class="rounded-sm">
                <span class="relative flex size-2">
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
                  ></span>
                  <span class="relative inline-flex size-2 rounded-full bg-green-500"></span>
                </span>
              </div>
            {/if}
          </Button>
        {/each}
      </div>

      <form on:submit|preventDefault={formSubmitAnalytics} class="col-span-3 flex flex-col justify-between p-3 py-2">
        {#if !!selectedAnalytics}
          <div>
            <div class="mb-2 text-sm font-medium text-muted-foreground">
              Add details for your {selectedAnalytics.label} account
            </div>
          </div>
          <div class="grid grid-cols-4 gap-4">
            {#each selectedAnalytics.requirements as req}
              <div class="col-span-2 flex flex-col gap-y-2">
                <Label for={req.label}>{req.label}</Label>
                <Input
                  bind:value={req.value}
                  class=""
                  type={req.type}
                  placeholder={req.placeholder}
                  bind:required={req.required}
                />
              </div>
            {/each}
          </div>
          <div class="mt-2 flex flex-row justify-between">
            <div class="flex flex-row gap-x-2">
              <label class="inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  class="peer sr-only"
                  checked={selectedAnalytics.isEnabled}
                  on:change={() => {
                    selectedAnalytics.isEnabled = !selectedAnalytics.isEnabled;
                  }}
                />
                <div
                  class="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800 rtl:peer-checked:after:-translate-x-full"
                ></div>
              </label>
              <div class="pt-2.5 text-sm font-medium text-muted-foreground">
                {selectedAnalytics.label} is
                <i class="underline">{!selectedAnalytics.isEnabled ? "disabled" : "enabled"}</i> for your site
              </div>
            </div>
            <div>
              <Button type="submit" disabled={formStateAnalytics === "loading"}>
                Save Changes for {selectedAnalytics.label}
                {#if formStateAnalytics === "loading"}
                  <Loader class="ml-2 inline h-4 w-4 animate-spin" />
                {/if}
              </Button>
            </div>
          </div>
          {#if !!seoError}
            <div class="py-2 text-sm font-medium text-destructive">{seoError}</div>
          {/if}
        {/if}
      </form>
    </div>
  </Card.Content>
</Card.Root>
<Card.Root class="mt-4">
  <Card.Header class="border-b">
    <Card.Title>Search Engine Optimization</Card.Title>
    <Card.Description>Add your meta tags here. You can add multiple meta tags.</Card.Description>
  </Card.Header>
  <Card.Content>
    <form class="mx-auto mt-4 space-y-4" use:autoAnimate on:submit|preventDefault={formSubmit}>
      {#each metaTags as metaTag, i}
        <div class="flex w-full flex-row justify-between gap-2">
          <div class="grid grid-cols-12 gap-x-2">
            <div class="col-span-4">
              <Label for="key">
                Meta Name
                <Tooltip.Root openDelay={100}>
                  <Tooltip.Trigger class="">
                    <Info class="inline-block h-4 w-4 text-muted-foreground" />
                  </Tooltip.Trigger>
                  <Tooltip.Content class="max-w-md">
                    <div
                      class=" flex items-center justify-center rounded border bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
                    >
                      &#x3C;meta name=&#x22;{metaTag.key}&#x22; content=&#x22;{metaTag.value}&#x22;&#x3E;
                    </div>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Label>
              <Input bind:value={metaTag.key} class="mt-2" type="text" id="key" placeholder="eg. kener" />
            </div>
            <div class="col-span-7">
              <Label for="value">Content</Label>
              <Input bind:value={metaTag.value} class="mt-2" type="text" id="value" placeholder="eg. kener" />
            </div>
            <div class="col-span-1">
              <Button variant="ghost" class="mt-8" on:click={() => removeRow(i)}>
                <X class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      {/each}
      <div class="relative">
        <hr class="border-1 border-border-input relative top-4 h-px border-dashed" />

        <Button on:click={addNewRow} variant="secondary" class="absolute left-1/2 h-8 w-8 -translate-x-1/2 p-0  ">
          <Plus class="h-4 w-4 " />
        </Button>
      </div>
      <div class="flex w-full justify-end gap-x-2" style="margin-top:32px">
        {#if !!metaError}
          <div class="py-2 text-sm font-medium text-destructive">{metaError}</div>
        {/if}
        <Button type="submit" disabled={formState === "loading"}>
          Save Meta Tags
          {#if formState === "loading"}
            <Loader class="ml-2 inline h-4 w-4 animate-spin" />
          {/if}
        </Button>
      </div>
    </form>
  </Card.Content>
</Card.Root>

<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { siteDataExtractFromDb, storeSiteData } from "$lib/clientTools.js";
  import { base } from "$app/paths";
  import * as Select from "$lib/components/ui/select";
  import locales from "$lib/locales/locales.json?raw";
  import GMI from "$lib/components/gmi.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

  import Loader from "lucide-svelte/icons/loader";
  import X from "lucide-svelte/icons/x";
  import Plus from "lucide-svelte/icons/plus";
  import Info from "lucide-svelte/icons/info";
  import Play from "lucide-svelte/icons/play";
  import { Tooltip } from "bits-ui";

  import CodeMirror from "svelte-codemirror-editor";
  import { html } from "@codemirror/lang-html";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
  import { mode } from "mode-watcher";

  export let data;

  let formStateHero = "idle";
  let formStateNav = "idle";
  let formStateFooter = "idle";
  let formStateIncident = "idle";
  let formStatei18n = "idle";
  let formStateCategories = "idle";

  let hero = {
    title: "",
    subtitle: ""
  };
  let footerHTML = "";
  let tzToggle = "NO";
  let homeIncidentCount = 10;
  let homeIncidentStartTimeWithin = 30;
  let incidentGroupView = "EXPAND_FIRST";
  let kenerTheme = "default";

  let availableThemes = [
    { name: "Default", value: "default" },
    { name: "Mono", value: "mono" },
    { name: "Sunset", value: "sunset" },
    { name: "Forest", value: "forest" },
    { name: "Ocean", value: "ocean" }
  ];

  let nav = [];
  let categories = [];
  let i18n = {
    defaultLocale: "en",
    locales: JSON.parse(locales).map((el) => {
      return {
        code: el.code,
        name: el.name,
        selected: true,
        disabled: false
      };
    })
  };

  if (data.siteData?.nav) {
    nav = data.siteData.nav.map((el) => {
      el.typeOfUpload = el.iconURL.startsWith("http") ? "URL" : "FILE";
      return el;
    });
  }
  if (data.siteData?.categories) {
    categories = data.siteData.categories;
  }
  if (data.siteData?.hero) {
    hero = data.siteData.hero;
  }

  if (data.siteData.homeIncidentCount) {
    homeIncidentCount = data.siteData.homeIncidentCount;
  }
  if (data.siteData.homeIncidentStartTimeWithin) {
    homeIncidentStartTimeWithin = data.siteData.homeIncidentStartTimeWithin;
  }
  if (data.siteData.incidentGroupView) {
    incidentGroupView = data.siteData.incidentGroupView;
  }
  if (data.siteData.footerHTML) {
    footerHTML = data.siteData.footerHTML;
  }
  if (data.siteData.kenerTheme) {
    kenerTheme = data.siteData.kenerTheme;
  }
  if (data.siteData.tzToggle) {
    tzToggle = data.siteData.tzToggle;
  }
  if (data.siteData.i18n) {
    i18n = data.siteData.i18n;
    //add locales that are not present in the data
    JSON.parse(locales).forEach((el) => {
      if (!i18n.locales.find((locale) => locale.code === el.code)) {
        i18n.locales.push({
          code: el.code,
          name: el.name,
          selected: false,
          disabled: false
        });
      }
    });
  }
  let heroError = "";
  async function formSubmitHero() {
    heroError = "";
    formStateHero = "loading";
    let resp = await storeSiteData({
      hero: JSON.stringify(hero)
    });
    //print data
    let data = await resp.json();
    formStateHero = "idle";
    if (data.error) {
      heroError = data.error;
      return;
    }
    saveTheme();
  }

  async function saveTheme() {
    let resp = await storeSiteData({
      kenerTheme: kenerTheme
    });
    //print data
    let data = await resp.json();
    if (data.error) {
      alert(data.error);
      return;
    }
  }

  let navErrorMessage = "";
  async function formSubmitNav() {
    navErrorMessage = "";
    formStateNav = "loading";
    let resp = await storeSiteData({
      nav: JSON.stringify(nav)
    });
    //print data
    let data = await resp.json();
    formStateNav = "idle";
    if (data.error) {
      navErrorMessage = data.error;
      return;
    }
  }

  let categoriesErrorMessage = "";
  async function formSubmitCategories() {
    categoriesErrorMessage = "";
    formStateCategories = "loading";
    let resp = await storeSiteData({
      categories: JSON.stringify(categories)
    });
    //print data
    let data = await resp.json();
    formStateCategories = "idle";
    if (data.error) {
      categoriesErrorMessage = data.error;
      return;
    }
  }

  let footerErrorMessage = "";
  async function formSubmitFooter() {
    footerErrorMessage = "";
    formStateFooter = "loading";
    let resp = await storeSiteData({
      footerHTML: footerHTML
    });
    //print data
    let data = await resp.json();
    formStateFooter = "idle";
    if (data.error) {
      footerErrorMessage = data.error;
      return;
    }
  }

  let incidentErrorMessage = "";
  async function formSubmitIncident() {
    incidentErrorMessage = "";
    formStateIncident = "loading";
    let resp = await storeSiteData({
      homeIncidentCount: homeIncidentCount,
      homeIncidentStartTimeWithin: homeIncidentStartTimeWithin,
      incidentGroupView: incidentGroupView
    });
    //print data
    let data = await resp.json();
    formStateIncident = "idle";
    if (data.error) {
      incidentErrorMessage = data.error;
      return;
    }
  }

  async function handleFileChangeLogo(event, i) {
    const file = event.target.files[0];

    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    if (file.size > 102400) {
      alert("File size should be less than 100KB");
      return;
    }

    nav[i].uploading = true;
    const formData = new FormData();
    formData.append("image", file);
    try {
      const response = await fetch(base + "/manage/app/upload", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        nav[i].iconURL = "/uploads/" + result.filename;
      } else {
        alert("Failed to upload file.");
      }
    } catch (error) {
      alert("An error occurred while uploading the file.");
    } finally {
      nav[i].uploading = false;
    }
  }
  function addNewRow() {
    nav = [
      ...nav,
      {
        name: "",
        url: "",
        iconURL: ""
      }
    ];
  }
  function addNewCategory() {
    categories = [
      ...categories,
      {
        name: "",
        description: ""
      }
    ];
  }
  function removeRow(i) {
    nav = nav.filter((_, index) => index !== i);
  }

  function i18nChange(e) {
    i18n.defaultLocale = e.value;
  }

  let i18nErrorMessage = "";
  async function formSubmiti18n() {
    i18nErrorMessage = "";
    formStatei18n = "loading";
    let resp = await storeSiteData({
      i18n: JSON.stringify(i18n),
      tzToggle: tzToggle
    });
    //print data
    let data = await resp.json();
    formStatei18n = "idle";
    if (data.error) {
      i18nErrorMessage = data.error;
      return;
    }
  }
</script>

<Card.Root class="mt-4">
  <Card.Header class="border-b">
    <Card.Title>Hero Section</Card.Title>
    <Card.Description>Configure the hero section of your site.</Card.Description>
  </Card.Header>
  <Card.Content>
    <form class="mx-auto mt-4 flex flex-col gap-y-4" on:submit|preventDefault={formSubmitHero}>
      <div class="flex w-full flex-row justify-evenly gap-2">
        <div class="w-full">
          <Label for="hero_title">Title</Label>
          <Input bind:value={hero.title} class="mt-2" type="text" id="hero_title" placeholder="Status Page for Kener" />
        </div>
      </div>
      <div class="flex w-full flex-row justify-evenly gap-2">
        <div class="w-full">
          <Label for="hero_subtitle">Subtitle</Label>
          <Input
            bind:value={hero.subtitle}
            class="mt-2"
            type="text"
            id="hero_subtitle"
            placeholder="Welcome to our status page"
          />
        </div>
      </div>
      <div class="flex flex-col gap-y-2">
        <div>
          <Label>Color</Label>
        </div>
        <div class="flex flex-row gap-x-2 rounded-md border p-2">
          <div class="w-3/4 pt-2">
            <span class="kener-theme-{kenerTheme}-hero-h1 font-medium">{hero.title}</span>
          </div>
          <div class="flex w-1/4 justify-end">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button variant="outline">
                  {availableThemes.find((el) => el.value === kenerTheme)?.name || "Mono"}
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                {#each availableThemes as theme}
                  <DropdownMenu.Group>
                    <DropdownMenu.Item>
                      <Button
                        variant="ghost"
                        class="h-6 w-full justify-start text-xs"
                        on:click={() => {
                          kenerTheme = theme.value;
                        }}
                      >
                        {theme.name}
                      </Button>
                    </DropdownMenu.Item>
                  </DropdownMenu.Group>
                {/each}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>
      </div>

      <div class="flex w-full justify-end gap-x-2">
        {#if !!heroError}
          <div class="py-2 text-sm font-medium text-destructive">{heroError}</div>
        {/if}
        <Button type="submit" disabled={formStateHero === "loading"}>
          Save Hero Section
          {#if formStateHero === "loading"}
            <Loader class="ml-2 inline h-4 w-4 animate-spin" />
          {/if}
        </Button>
      </div>
    </form>
  </Card.Content>
</Card.Root>
<Card.Root class="mt-4">
  <Card.Header class="border-b">
    <Card.Title>Incidents</Card.Title>
    <Card.Description>Control how many recent updated incidents you want to show on the homepage.</Card.Description>
  </Card.Header>
  <Card.Content>
    <form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmitIncident}>
      <div class="flex flex-row justify-start gap-2">
        <div class="">
          <Label for="hero_title">Maximum Number to Show</Label>
          <Input bind:value={homeIncidentCount} class="mt-2" type="text" id="homeIncidentCount" placeholder="10" />
        </div>
        <div class="">
          <Label for="hero_title">Start time within x days</Label>
          <Input
            bind:value={homeIncidentStartTimeWithin}
            class="mt-2"
            type="text"
            id="homeIncidentStartTimeWithin"
            placeholder="2 days"
          />
        </div>
        <div>
          <Label for="incidentGroupView" class="text-sm font-medium">Incident Group View</Label>
          <Select.Root
            portal={null}
            onSelectedChange={(e) => {
              incidentGroupView = e.value;
            }}
            selected={{
              value: incidentGroupView,
              label: incidentGroupView.replace("_", " ")
            }}
          >
            <Select.Trigger class="	mt-2 w-[200px]" id="incidentGroupView">
              <Select.Value bind:value={incidentGroupView} placeholder="Favicon Type" />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label>Favicon Type</Select.Label>
                <Select.Item value="EXPAND_FIRST" label="EXPAND FIRST" class="text-sm font-medium"
                  >EXPAND FIRST</Select.Item
                >
                <Select.Item value="COLLAPSED" label="COLLAPSED" class="text-sm font-medium">COLLAPSED</Select.Item>
                <Select.Item value="EXPANDED" label="EXPANDED" class="text-sm font-medium">EXPANDED</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
        <div class="pt-8">
          <Button type="submit" disabled={formStateIncident === "loading"}>
            Save Incidents Settings
            {#if formStateIncident === "loading"}
              <Loader class="ml-2 inline h-4 w-4 animate-spin" />
            {/if}
          </Button>
        </div>
      </div>
      <p class="text-sm text-muted-foreground">
        Translates to "Show {homeIncidentCount} incidents that have started in the last {homeIncidentStartTimeWithin}
        days in the past or going to start in {homeIncidentStartTimeWithin} days in the future"
      </p>
      {#if !!incidentErrorMessage}
        <p class="text-sm font-medium text-destructive">{incidentErrorMessage}</p>
      {/if}
    </form>
  </Card.Content>
</Card.Root>

<Card.Root class="mt-4">
  <Card.Header class="border-b">
    <Card.Title>Navigation</Card.Title>
    <Card.Description>Configure the navigation of your site.</Card.Description>
  </Card.Header>
  <Card.Content>
    <form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmitNav}>
      {#each nav as navItem, i}
        <div class="mb-8 flex w-full flex-row justify-start gap-2">
          <div class=" grid grid-cols-12 gap-x-2">
            <div class="col-span-3">
              <Label for="key">Title</Label>
              <Input bind:value={navItem.name} type="text" id="key" placeholder="Documentation" />
            </div>
            <div class="col-span-5">
              <Label for="value">URL</Label>
              <Input bind:value={navItem.url} type="text" id="value" placeholder="/docs" />
            </div>
            <div class="col-span-1">
              <Button variant="ghost" class="mt-6" on:click={() => removeRow(i)}>
                <X class="h-4 w-4" />
              </Button>
            </div>
            <div class="relative col-span-12 mt-2">
              <p class="mt-2 text-sm font-medium text-muted-foreground">Add an optional nav icon</p>
            </div>
            <div class="relative col-span-12 mt-1 {!!navItem.iconURL ? 'pl-12' : ''}">
              {#if !!navItem.iconURL}
                <div class="absolute left-0 top-5 mt-2 h-[30px] w-[30px] rounded-sm border p-1">
                  <GMI src={navItem.iconURL} alt="" />
                  <Button
                    variant="secondary"
                    class="absolute -right-2.5 -top-1.5 h-4 w-4 rounded-full p-0"
                    on:click={() => (navItem.iconURL = "")}
                  >
                    <X class="h-3 w-3" />
                  </Button>
                </div>
              {/if}
              <div class="flex gap-x-2">
                <div>
                  <Label for="typeOfUpload{i}" class="text-sm font-medium">Nav Icon Type</Label>
                  <Select.Root
                    portal={null}
                    onSelectedChange={(e) => {
                      navItem.typeOfUpload = e.value;
                    }}
                    selected={{
                      value: navItem.typeOfUpload,
                      label: navItem.typeOfUpload
                    }}
                  >
                    <Select.Trigger class="	 w-[200px]" id="typeOfUpload{i}">
                      <Select.Value bind:value={navItem.typeOfUpload} placeholder="Favicon Type" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Group>
                        <Select.Label>Favicon Type</Select.Label>
                        <Select.Item value="URL" label="URL" class="text-sm font-medium">URL</Select.Item>
                        <Select.Item value="FILE" label="FILE" class="text-sm font-medium">FILE</Select.Item>
                      </Select.Group>
                    </Select.Content>
                  </Select.Root>
                </div>
                {#if navItem.typeOfUpload === "URL"}
                  <div>
                    <Label for="iconURL{i}">Icon URL</Label>
                    <Input
                      bind:value={navItem.iconURL}
                      type="text"
                      id="iconURL{i}"
                      placeholder="https://example.com/favicon.ico"
                    />
                  </div>
                {:else}
                  <div>
                    <Label for="logo{i}">Icon (&lt; 100 KB)</Label>
                    <Input
                      class=""
                      id="logo{i}"
                      disabled={!!navItem.uploading}
                      type="file"
                      accept=".jpg, .jpeg, .png, .svg"
                      on:change={(e) => {
                        handleFileChangeLogo(e, i);
                      }}
                    />
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
        <hr />
      {/each}
      <div class="relative">
        <hr class="border-1 border-border-input relative top-4 h-px border-dashed" />

        <Button on:click={addNewRow} variant="secondary" class="absolute left-1/2 h-8 w-8 -translate-x-1/2 p-0  ">
          <Plus class="h-4 w-4 " />
        </Button>
      </div>
      <div class="flex w-full justify-end" style="margin-top:32px">
        <p class="px-4 pt-1">
          <span class="text-sm font-medium text-destructive"> {navErrorMessage} </span>
        </p>
        <Button type="submit" disabled={formStateHero === "loading"}>
          Save Navigation
          {#if formStateHero === "loading"}
            <Loader class="ml-2 inline h-4 w-4 animate-spin" />
          {/if}
        </Button>
      </div>
    </form>
  </Card.Content>
</Card.Root>

<Card.Root class="mt-4">
  <Card.Header class="border-b">
    <Card.Title>Internationalization</Card.Title>
    <Card.Description>Configure the languages of your site.</Card.Description>
  </Card.Header>
  <Card.Content>
    <form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmiti18n}>
      <p class="text-sm font-medium">All available languages</p>
      <div class="mb-8 flex w-full flex-row flex-wrap gap-x-4">
        {#each i18n.locales as locale}
          <div>
            <label>
              <input
                on:change={(e) => {
                  locale.selected = e.target.checked;
                }}
                type="checkbox"
                checked={locale.selected}
                disabled={i18n.defaultLocale === locale.code}
              />
              {locale.name}
            </label>
          </div>
        {/each}
      </div>
      <p class="text-sm font-medium">Select Default Language</p>
      <Select.Root portal={null} onSelectedChange={i18nChange}>
        <Select.Trigger class="w-[180px]">
          <Select.Value placeholder={i18n.locales.find((el) => el.code == i18n.defaultLocale).name} />
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            <Select.Label>Languages</Select.Label>
            {#each i18n.locales as locale}
              <Select.Item
                value={locale.code}
                label={locale.name}
                disabled={!locale.selected}
                class="text-sm font-medium"
              >
                {locale.name}
              </Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>
      <p class="pt-4 text-lg font-medium">Timezone Switching</p>
      <p class="text-sm font-medium text-muted-foreground">
        Kener will automatically detect the user's timezone and show the status page in their timezone. You can let
        users switch between different timezones if you want.
      </p>

      <p class="text-sm font-medium">
        <label>
          <input
            on:change={(e) => {
              tzToggle = e.target.checked === true ? "YES" : "NO";
            }}
            type="checkbox"
            checked={tzToggle === "YES"}
          />
          Allow users to switch timezones
        </label>
      </p>
      <div class="flex w-full justify-end gap-x-2">
        {#if !!i18nErrorMessage}
          <div class="py-2 text-sm font-medium text-destructive">{i18nErrorMessage}</div>
        {/if}
        <Button type="submit" disabled={formStatei18n === "loading"}>
          Save Languages
          {#if formStatei18n === "loading"}
            <Loader class="ml-2 inline h-4 w-4 animate-spin" />
          {/if}
        </Button>
      </div>
    </form>
  </Card.Content>
</Card.Root>

<Card.Root class="mt-4">
  <Card.Header class="border-b">
    <Card.Title>Site Categories</Card.Title>
    <Card.Description>Configure the categories of your site.</Card.Description>
  </Card.Header>
  <Card.Content>
    <form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmitCategories}>
      {#each categories as cat, i}
        <div class="grid grid-cols-4 gap-2">
          <div class="col-span-1">
            <Label for="{i}catkey" class="block w-full">Name</Label>
            <Input
              bind:value={cat.name}
              class="mt-2"
              type="text"
              id="{i}catkey"
              placeholder="Category Name"
              disabled={i === 0}
            />
          </div>
          <div class="relative col-span-3 pr-8">
            <Label for="{i}catdsc" class="block w-full">Description</Label>
            <Input
              bind:value={cat.description}
              class="mt-2"
              type="text"
              id="{i}catdsc"
              placeholder="Category Description"
              disabled={i === 0}
            />
            <Button
              variant="ghost"
              class="absolute right-0 top-8 ml-2 h-6 w-6 p-1 "
              disabled={i === 0}
              on:click={() => (categories = categories.filter((_, index) => index !== i))}
            >
              <X class="h-5 w-5" />
            </Button>
          </div>
        </div>
      {/each}
      <div class="relative pb-8">
        <hr class="border-1 border-border-input relative top-4 h-px border-dashed" />

        <Button on:click={addNewCategory} variant="secondary" class="absolute left-1/2 h-8 w-8 -translate-x-1/2 p-0  ">
          <Plus class="h-4 w-4 " />
        </Button>
      </div>
      <div class="flex w-full justify-end gap-x-2">
        {#if !!categoriesErrorMessage}
          <div class="py-2 text-sm font-medium text-destructive">{categoriesErrorMessage}</div>
        {/if}
        <Button type="submit" disabled={formStateCategories === "loading"}>
          Save Categories
          {#if formStateCategories === "loading"}
            <Loader class="ml-2 inline h-4 w-4 animate-spin" />
          {/if}
        </Button>
      </div>
    </form>
  </Card.Content>
</Card.Root>

<Card.Root class="mt-4">
  <Card.Header class="border-b">
    <Card.Title>Site Footer</Card.Title>
    <Card.Description>Configure the footer of your site.</Card.Description>
  </Card.Header>
  <Card.Content>
    <form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmitFooter}>
      <div class="flex w-full flex-row justify-evenly gap-2">
        <div class="w-full">
          <div class="overflow-hidden rounded-md">
            <CodeMirror
              bind:value={footerHTML}
              lang={html()}
              theme={$mode == "dark" ? githubDark : githubLight}
              styles={{
                "&": {
                  width: "100%",
                  maxWidth: "100%",
                  height: "320px",
                  border: "1px solid hsl(var(--border) / var(--tw-border-opacity))",
                  borderRadius: "0.375rem"
                }
              }}
            />
          </div>
        </div>
      </div>

      <div class="flex w-full justify-between gap-x-2">
        <div>
          <Button variant="outline" class="mt-2" on:click={() => (footerHTML = data.defaultFooterHTML)}>
            <span class="ml-2">Reset to default</span>
          </Button>
        </div>
        <div class="flex flex-row justify-end gap-x-2">
          {#if !!footerErrorMessage}
            <div class="py-2 text-sm font-medium text-destructive">{footerErrorMessage}</div>
          {/if}
          <Button type="submit" disabled={formStateFooter === "loading"}>
            Save Custom Footer
            {#if formStateFooter === "loading"}
              <Loader class="ml-2 inline h-4 w-4 animate-spin" />
            {/if}
          </Button>
        </div>
      </div>
    </form>
  </Card.Content>
</Card.Root>

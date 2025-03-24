<script>
  import { page } from "$app/stores";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import Loader from "lucide-svelte/icons/loader";
  import Copy from "lucide-svelte/icons/copy";
  import X from "lucide-svelte/icons/x";
  import Check from "lucide-svelte/icons/check";
  import Siren from "lucide-svelte/icons/siren";
  import { base } from "$app/paths";
  import * as Alert from "$lib/components/ui/alert";
  import * as Select from "$lib/components/ui/select";
  import ColorPicker from "svelte-awesome-color-picker";
  import { mode } from "mode-watcher";
  import { onMount } from "svelte";
  import Embed from "$lib/Embed.svelte";
  import SvelteCode from "$lib/snippets/embed/svelte/code.txt?raw";
  import SvelteHowTo from "$lib/snippets/embed/svelte/howto.txt?raw";
  import ReactCode from "$lib/snippets/embed/react/code.txt?raw";
  import ReactHowTo from "$lib/snippets/embed/react/howto.txt?raw";
  import VueCode from "$lib/snippets/embed/vue/code.txt?raw";
  import VueHowTo from "$lib/snippets/embed/vue/howto.txt?raw";
  import AngularCode from "$lib/snippets/embed/angular/code.txt?raw";
  import AngularHowTo from "$lib/snippets/embed/angular/howto.txt?raw";
  import HTMLHowTo from "$lib/snippets/embed/html/howto.txt?raw";
  import JSHowTo from "$lib/snippets/embed/js/howto.txt?raw";

  export let data;
  let siteName = data.siteName;
  let siteURL = data.siteURL;
  let monitors = data.monitors.map((monitor) => {
    return {
      label: monitor.name,
      value: monitor.tag
    };
  });
  let allMonitorObj = {
    label: siteName,
    value: "_"
  };

  //prepend
  monitors.unshift(allMonitorObj);

  let locales = data.i18n.locales
    .filter((locale) => {
      return locale.selected;
    })
    .map((locale) => {
      return {
        label: locale.name,
        value: locale.code
      };
    });

  let selectedMonitor = monitors[0];

  onMount(() => {
    updateBadges();
  });

  let allStyles = ["flat", "flat-square", "for-the-badge", "plastic", "social"];

  let badges = [
    {
      name: "Create Status Badge",
      description:
        "Create a status badge for your monitor. You can customize the label color, status color, and style.",
      url: "",
      labelColor: "",
      color: "",
      style: "flat",
      id: "status_themed",
      label: ""
    },
    {
      name: "Create Uptime Badge",
      description:
        "Create an uptime badge for your monitor. You can customize the label color, status color, and style.",
      url: "",
      labelColor: "#333",
      color: "#7a44dc",
      style: "flat",
      id: "uptime_themed",
      label: "",
      sinceLast: 90 * 24 * 60 * 60,
      hideDuration: "Show Label"
    }
  ];
  function updateBadges() {
    badges = badges.map((badge) => {
      if (selectedMonitor.value == "_") {
        badge.label = siteName;
        return badge;
      }
      badge.label = data.monitors.find((monitor) => monitor.tag == selectedMonitor.value).name;
      return badge;
    });
  }
  function copyMe(id) {
    let copyText = document.getElementById(`${id}_img`);
    copyText = copyText.src;
    navigator.clipboard.writeText(copyText);
    let copyBtn = document.querySelector(`#${id} button`);

    setTimeout(() => {
      copyBtn.blur();
    }, 2000);
  }

  let embedTheme = "dark";
  let embedBgc = "#212226";
  let embedLocale = locales.find((l) => l.value == data.i18n.defaultLocale);

  let embedDocs = [
    {
      title: "Svelte 4",
      code: SvelteCode,
      howto: SvelteHowTo,
      guide1:
        "To embed the monitor on your website, you can use the following code snippet. Save the below snippet in a svelte file example: EmbedMonitor.svelte",
      guide2: "Then, import the Embed component in your svelte file and use it as shown below:"
    },
    {
      title: "React",
      code: ReactCode,
      howto: ReactHowTo,
      guide1:
        "To embed the monitor on your website, you can use the following code snippet. Save the below snippet in a react file example: EmbedMonitor.jsx",
      guide2: "Then, import the Embed component in your react file and use it as shown below:"
    },
    {
      title: "Vue 3",
      code: VueCode,
      howto: VueHowTo,
      guide1:
        "To embed the monitor on your website, you can use the following code snippet. Save the below snippet in a vue file example: EmbedMonitor.vue",
      guide2: "Then, import the Embed component in your vue file and use it as shown below:"
    },
    {
      title: "Angular",
      code: AngularCode,
      howto: AngularHowTo,
      guide1:
        "To embed the monitor on your website, you can use the following code snippet. Save the snippet in an Angular component file, for example: `embed-monitor.component.ts`.",
      guide2: "Then, import the `EmbedMonitorComponent` in your Angular module or component and use it as shown below:"
    },
    {
      title: "HTML",
      code: "",
      howto: HTMLHowTo,
      guide1: "",
      guide2:
        "To embed the monitor on your website, you can use the following code snippet. This uses an iframe to embed the monitor."
    },
    {
      title: "JavaScript",
      code: "",
      howto: JSHowTo,
      guide1: "",
      guide2:
        "To embed the monitor on your website, you can use the following code snippet. You can paste this line of code in your HTML file. It will get updated automatically."
    }
  ];
  let selectedDoc;

  function embedDocChangeRun(title) {
    selectedDoc = JSON.parse(JSON.stringify(embedDocs.find((doc) => doc.title == title)));
    selectedDoc.howto = selectedDoc.howto.replaceAll("{embedTheme}", embedTheme);
    selectedDoc.howto = selectedDoc.howto.replaceAll("{embedBgc.substr(1)}", embedBgc.substr(1));
    selectedDoc.howto = selectedDoc.howto.replaceAll("{embedLocale.value}", embedLocale.value);
    selectedDoc.howto = selectedDoc.howto.replaceAll("{selectedMonitor.value}", selectedMonitor.value);
    selectedDoc.howto = selectedDoc.howto.replaceAll("{siteURL}", data.siteURL);
    selectedDoc.howto = selectedDoc.howto.replaceAll("{base}", base);
  }

  function embedUpdated() {
    if (selectedDoc) {
      embedDocChangeRun(selectedDoc.title);
    }
  }
</script>

<div class="min-h-[70vh]">
  <Card.Root class="mt-4">
    <Card.Header class="border-b">
      <Card.Title class="flex justify-between">
        <div>Badges</div>
      </Card.Title>
      <Card.Description>Create Badges for your monitors</Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-y-4 pt-4">
      {#if !!!siteURL}
        <Alert.Root variant="destructive">
          <Siren class="h-4 w-4" />
          <Alert.Title>Error</Alert.Title>
          <Alert.Description>
            Badges will not work as you have not set the site URL in the settings.
            <a href="{base}/manage/app/site" class="text-card-foreground">Set site URL</a>
          </Alert.Description>
        </Alert.Root>
      {/if}
      <div class="flex flex-col gap-y-2">
        <Label for="customLabsasd">Select Monitor</Label>
        <Select.Root
          portal={null}
          onSelectedChange={(e) => {
            selectedMonitor = e;
            updateBadges();
          }}
          selected={selectedMonitor}
        >
          <Select.Trigger id="mm" class="w-full">
            <Select.Value placeholder="Select Monitor" />
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>Select Monitor</Select.Label>
              {#each monitors as monitor}
                <Select.Item value={monitor.value} class="text-sm font-medium">{monitor.label}</Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
        {#if !!selectedMonitor}
          <div class="grid grid-cols-2 gap-2">
            {#each badges as badge, i}
              <div class="col-span-1 flex flex-col justify-between gap-y-4 rounded-md border p-3" id={badge.id}>
                <div class="flex flex-col gap-y-2">
                  <h3 class="text-lg font-semibold">{badge.name}</h3>
                  <p class="text-sm font-medium text-muted-foreground">
                    {badge.description}
                  </p>

                  <div class="flex flex-row gap-x-2">
                    <div class="like-input mt-0.5 h-10 rounded-sm border px-1.5 py-1.5 text-sm font-medium">
                      <ColorPicker
                        bind:hex={badge.labelColor}
                        position="responsive"
                        isAlpha={false}
                        isDark={$mode == "dark"}
                        --input-size="16px"
                        isTextInput={true}
                        label="Label Color"
                        on:input={(event) => {
                          badge.labelColor = event.detail.hex;
                        }}
                      />
                    </div>
                    <div class="like-input mt-0.5 h-10 rounded-sm border px-1.5 py-1.5 text-sm font-medium">
                      <ColorPicker
                        bind:hex={badge.color}
                        position="responsive"
                        isAlpha={false}
                        isDark={$mode == "dark"}
                        --input-size="16px"
                        isTextInput={true}
                        label="Status Color"
                        on:input={(event) => {
                          badge.color = event.detail.hex;
                        }}
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-x-2">
                    <div>
                      <Label for="customLabel{i}">Custom Label</Label>
                      <Input
                        bind:value={badge.label}
                        class="mt-2"
                        type="text"
                        id="customLabel{i}"
                        placeholder="any label name"
                      />
                    </div>
                    <div>
                      <Label for="mm2{i}">Badge Style</Label>
                      <Select.Root
                        portal={null}
                        onSelectedChange={(e) => {
                          badge.style = e.value;
                        }}
                        selected={{
                          label: badge.style,
                          value: badge.style
                        }}
                      >
                        <Select.Trigger id="mm2{i}" class="mt-2 w-full">
                          <Select.Value placeholder="Select Style" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Group>
                            <Select.Label>Select Style</Select.Label>
                            {#each allStyles as style}
                              <Select.Item value={style} class="text-sm font-medium">{style}</Select.Item>
                            {/each}
                          </Select.Group>
                        </Select.Content>
                      </Select.Root>
                    </div>
                  </div>
                  {#if badge.id == "uptime_themed"}
                    <div class="grid grid-cols-2 gap-x-2">
                      <div>
                        <Label for="customLabel22{i}">Duration in seconds</Label>
                        <Input
                          bind:value={badge.sinceLast}
                          class="mt-2"
                          type="text"
                          id="customLabel22{i}"
                          placeholder="duration in seconds"
                        />
                      </div>
                      <div>
                        <Label for="customLabel23{i}">Duration Label</Label>
                        <Select.Root
                          portal={null}
                          onSelectedChange={(e) => {
                            badge.hideDuration = e.value;
                          }}
                          selected={{
                            label: badge.hideDuration,
                            value: badge.hideDuration
                          }}
                        >
                          <Select.Trigger id="mm3{i}" class="mt-2 w-full">
                            <Select.Value placeholder="Duration Label" />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Group>
                              <Select.Label>Duration Label</Select.Label>
                              <Select.Item value="Show Label" class="text-sm font-medium">Show Label</Select.Item>
                              <Select.Item value="Hide Label" class="text-sm font-medium">Hide Label</Select.Item>
                            </Select.Group>
                          </Select.Content>
                        </Select.Root>
                      </div>
                    </div>
                  {/if}
                </div>
                <div class="my-2 flex justify-between rounded-sm border p-2">
                  <div>
                    {#if badge.id == "status_themed"}
                      <img
                        id="{badge.id}_img"
                        src={`${base}/badge/${selectedMonitor.value}/status?labelColor=${badge.labelColor.substr(1)}&color=${badge.color.substr(1)}&style=${badge.style}&label=${badge.label}`}
                        alt="Status badge"
                        class="mt-1"
                      />
                    {:else if badge.id == "uptime_themed"}
                      <img
                        id="{badge.id}_img"
                        src={`${base}/badge/${selectedMonitor.value}/uptime?labelColor=${badge.labelColor.substr(1)}&color=${badge.color.substr(1)}&style=${badge.style}&label=${badge.label}&sinceLast=${badge.sinceLast}&hideDuration=${badge.hideDuration.includes("Hide")}`}
                        alt="Uptime badge"
                        class="mt-1"
                      />
                    {/if}
                  </div>
                  <div>
                    <Button
                      variant="ghost"
                      class="copybtn relative mt-1 h-5 w-5 p-0"
                      on:click={() => {
                        copyMe(badge.id);
                      }}
                    >
                      <span class="check-btn absolute top-0">
                        <Check class="inline-block h-4 w-4 text-green-500" />
                      </span>
                      <span class="copy-btn absolute top-0">
                        <Copy class=" inline-block h-4 w-4" />
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            {/each}
            <div class="col-span-2 flex flex-row gap-x-2">
              <div class="flex w-1/2 justify-between rounded-sm border p-2">
                <div class="text-lg font-semibold">
                  <img
                    id="oooo_img"
                    src={`${base}/badge/${selectedMonitor.value}/dot`}
                    alt="Uptime badge"
                    class="inline-block"
                  />
                  Liveness Badge
                </div>
                <div>
                  <Button
                    variant="ghost"
                    class="copybtn relative mt-1 h-5 w-5 p-0"
                    on:click={() => {
                      window.navigator.clipboard.writeText(`${base}/badge/${selectedMonitor.value}/dot`);
                    }}
                  >
                    <span class="check-btn absolute top-0">
                      <Check class="inline-block h-4 w-4 text-green-500" />
                    </span>
                    <span class="copy-btn absolute top-0">
                      <Copy class=" inline-block h-4 w-4" />
                    </span>
                  </Button>
                </div>
              </div>
              <div class="flex w-1/2 justify-between rounded-sm border p-2">
                <div class="text-lg font-semibold">
                  <img
                    id="oooo_img"
                    src={`${base}/badge/${selectedMonitor.value}/dot?animate=ping`}
                    alt="Uptime badge"
                    class="inline-block"
                  />
                  Animated Liveness Badge
                </div>
                <div>
                  <Button
                    variant="ghost"
                    class="copybtn relative mt-1 h-5 w-5 p-0"
                    on:click={() => {
                      window.navigator.clipboard.writeText(`${base}/badge/${selectedMonitor.value}/dot?animate=ping`);
                    }}
                  >
                    <span class="check-btn absolute top-0">
                      <Check class="inline-block h-4 w-4 text-green-500" />
                    </span>
                    <span class="copy-btn absolute top-0">
                      <Copy class=" inline-block h-4 w-4" />
                    </span>
                  </Button>
                </div>
              </div>
            </div>
            {#if selectedMonitor.value != "_"}
              <div class="col-span-2 flex flex-col gap-y-2 rounded-md border p-3">
                <h3 class="text-lg font-semibold">Embed Monitor</h3>
                <p class="text-sm font-medium text-muted-foreground">
                  Embed your monitor on your website. You can customize the theme, background color, and locale.
                </p>
                <div class="flex flex-row gap-x-2">
                  <div class="w-48">
                    <Label for="theme">Theme</Label>
                    <Select.Root
                      portal={null}
                      onSelectedChange={(e) => {
                        embedTheme = e.value;
                      }}
                      selected={{
                        label: embedTheme,
                        value: embedTheme
                      }}
                    >
                      <Select.Trigger id="theme" class="mt-2 w-full">
                        <Select.Value placeholder="Select Theme" />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Group>
                          <Select.Label>Select Theme</Select.Label>
                          <Select.Item value="light" class="text-sm font-medium">Light</Select.Item>
                          <Select.Item value="dark" class="text-sm font-medium">Dark</Select.Item>
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </div>
                  <div class="flex flex-col gap-y-2 pt-1.5">
                    <Label for="bgc">Background Color</Label>
                    <div class="like-input mt-0.5 h-10 rounded-sm border px-1.5 py-1.5 text-sm font-medium">
                      <ColorPicker
                        bind:hex={embedBgc}
                        position="responsive"
                        isAlpha={false}
                        isDark={$mode == "dark"}
                        --input-size="16px"
                        isTextInput={true}
                        label="Background Color"
                        on:input={(event) => {
                          embedBgc = event.detail.hex;
                        }}
                      />
                    </div>
                  </div>
                  <div class="w-48">
                    <Label for="locale">Locale</Label>
                    <Select.Root
                      portal={null}
                      onSelectedChange={(e) => {
                        embedLocale = e;
                      }}
                      selected={embedLocale}
                    >
                      <Select.Trigger id="locale" class="mt-2 w-full">
                        <Select.Value placeholder="Select Locale" />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Group>
                          <Select.Label>Select Locale</Select.Label>
                          {#each locales as locale}
                            <Select.Item value={locale.value} class="text-sm font-medium">{locale.label}</Select.Item>
                          {/each}
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </div>
                </div>
                <div class="my-2">
                  <Embed
                    monitor="{siteURL}{base}/embed/monitor-{selectedMonitor.value}"
                    theme={embedTheme}
                    bgc={embedBgc.substr(1)}
                    locale={embedLocale.value}
                    on:update={embedUpdated}
                  />
                </div>
                <div class="flex flex-col gap-y-2">
                  <h3 class="text-lg font-semibold">Get the Code</h3>
                  <div>
                    <Select.Root
                      portal={null}
                      onSelectedChange={(e) => {
                        embedDocChangeRun(e.value);
                      }}
                    >
                      <Select.Trigger id="docs" class="mt-2 w-48">
                        <Select.Value placeholder="Select Language" />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Group>
                          <Select.Label>Select Language</Select.Label>
                          {#each embedDocs as doc}
                            <Select.Item value={doc.title} class="text-sm font-medium">{doc.title}</Select.Item>
                          {/each}
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </div>
                  {#if !!selectedDoc}
                    <div class="flex flex-col gap-y-2">
                      {#if !!selectedDoc.code}
                        <p>
                          {selectedDoc.guide1}
                        </p>
                        <div class="relative rounded-md bg-background p-3 text-sm">
                          <Button
                            variant="secondary"
                            class="copybtn absolute right-2 top-2 mt-1 h-8 w-8"
                            on:click={() => {
                              navigator.clipboard.writeText(selectedDoc.code);
                            }}
                          >
                            <span class="check-btn absolute top-1">
                              <Check class="inline-block h-4 w-4 text-green-500" />
                            </span>
                            <span class="copy-btn absolute top-1">
                              <Copy class=" inline-block h-4 w-4" />
                            </span>
                          </Button>
                          <pre class="max-h-96 overflow-auto"><code class="language-js">{selectedDoc.code}</code></pre>
                        </div>
                      {/if}
                      {#if !!selectedDoc.howto}
                        <p>
                          {selectedDoc.guide2}
                        </p>
                        <div class="relative rounded-md bg-background p-3 text-sm">
                          <Button
                            variant="secondary"
                            class="copybtn absolute right-2 top-2 mt-1 h-8 w-8"
                            on:click={() => {
                              navigator.clipboard.writeText(selectedDoc.howto);
                            }}
                          >
                            <span class="check-btn absolute top-1">
                              <Check class="inline-block h-4 w-4 text-green-500" />
                            </span>
                            <span class="copy-btn absolute top-1">
                              <Copy class=" inline-block h-4 w-4" />
                            </span>
                          </Button>
                          <pre class="overflow-auto"><code class="language-js">{selectedDoc.howto}</code></pre>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>
</div>

<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { siteDataExtractFromDb, storeSiteData } from "$lib/clientTools.js";
  import { tooltipAction } from "svelte-legos";
  import { base } from "$app/paths";
  import Loader from "lucide-svelte/icons/loader";
  import Info from "lucide-svelte/icons/info";
  import X from "lucide-svelte/icons/x";
  import * as Alert from "$lib/components/ui/alert";
  import { Tooltip } from "bits-ui";
  import * as Select from "$lib/components/ui/select";
  import GMI from "$lib/components/gmi.svelte";

  export let data;

  let siteInformation = {
    title: "",
    siteName: "",
    siteURL: "",
    home: "",
    logo: "",
    favicon: ""
  };

  let logoFile;

  let formErrorMessage = "";

  siteInformation = siteDataExtractFromDb(data.siteData, siteInformation);

  let formState = "idle";
  async function formSubmit() {
    formErrorMessage = "";
    formState = "loading";
    let resp = await storeSiteData(siteInformation);
    //print data
    let data = await resp.json();
    formState = "idle";
    if (data.error) {
      formErrorMessage = data.error;
      return;
    }
  }

  function handleFileChangeFavicon(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        siteInformation.favicon = reader.result;
        uploadFunction(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }
  let uploadLogoStatus = "";
  let uploadingLogo = false;
  async function handleFileChangeLogo(event) {
    event.preventDefault();

    uploadLogoStatus = "";
    const file = event.target.files[0];
    if (!file) {
      uploadLogoStatus = "Please select a file to upload.";
      return;
    }

    if (file.size > 102400) {
      uploadLogoStatus = "File size should be less than 100KB.";
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    uploadingLogo = true;
    try {
      const response = await fetch(base + "/manage/app/upload", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        siteInformation.logo = "/uploads/" + result.filename;
      } else {
        uploadLogoStatus = "Failed to upload file.";
      }
    } catch (error) {
      uploadLogoStatus = "An error occurred while uploading the file.";
    } finally {
      uploadingLogo = false;
    }
  }

  let uploadFaviconStatus = "";
  let uploadingFavicon = false;
  async function handleFaviconChangeLogo(event) {
    event.preventDefault();

    uploadFaviconStatus = "";
    const file = event.target.files[0];
    if (!file) {
      uploadFaviconStatus = "Please select a file to upload.";
      return;
    }

    if (file.size > 20480) {
      uploadFaviconStatus = "File size should be less than 20KB.";
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    uploadingFavicon = true;
    try {
      const response = await fetch(base + "/manage/app/upload", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        siteInformation.favicon = "/uploads/" + result.filename;
      } else {
        uploadFaviconStatus = "Failed to upload file.";
      }
    } catch (error) {
      uploadFaviconStatus = "An error occurred while uploading the file.";
    } finally {
      uploadingFavicon = false;
    }
  }
  let typeOfLogoUpload = siteInformation.logo.startsWith("http") ? "URL" : "FILE";
  let typeOfFaviconUpload = siteInformation.favicon.startsWith("http") ? "URL" : "FILE";
</script>

<Card.Root class="mt-4">
  <Card.Header class="border-b">
    <Card.Title>Site Configuration</Card.Title>
    <Card.Description>Configure your site information here.</Card.Description>
  </Card.Header>
  <Card.Content>
    {#if !!base}
      <Alert.Root class="my-2">
        <Alert.Title>Sub path</Alert.Title>
        <Alert.Description>Your site is running in a subpath <span class="">{base}</span></Alert.Description>
      </Alert.Root>
    {/if}
    <form class="mx-auto mt-4 space-y-4" on:submit|preventDefault={formSubmit}>
      <div class="flex w-full flex-row justify-evenly gap-2">
        <div class="w-full">
          <Label for="title" class="">
            Site Title
            <span class="text-red-500">*</span>

            <Tooltip.Root openDelay={100}>
              <Tooltip.Trigger class="">
                <Info class="inline-block h-4 w-4 text-muted-foreground" />
              </Tooltip.Trigger>
              <Tooltip.Content>
                <div
                  class=" flex items-center justify-center rounded border bg-input p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
                >
                  Site Title will be the page title of your site. &lt;title&gt;&lt;/title&gt;
                </div>
              </Tooltip.Content>
            </Tooltip.Root>
          </Label>
          <Input
            bind:value={siteInformation.title}
            class="mt-2"
            type="text"
            id="title"
            placeholder="eg. kener"
            required
          />
        </div>
        <div class="w-full">
          <Label for="siteName">
            Site Name
            <span class="text-red-500">*</span>

            <Tooltip.Root openDelay={100}>
              <Tooltip.Trigger class="">
                <Info class="inline-block h-4 w-4 text-muted-foreground" />
              </Tooltip.Trigger>
              <Tooltip.Content>
                <div
                  class=" flex items-center justify-center rounded border bg-input p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
                >
                  This is the name of your site.<br /> It will be shown in the nav bar as brand name.
                </div>
              </Tooltip.Content>
            </Tooltip.Root>
          </Label>
          <Input
            bind:value={siteInformation.siteName}
            class="mt-2"
            type="text"
            id="siteName"
            placeholder="eg. Kener.ing"
            required
          />
        </div>
      </div>
      <div class="flex w-full flex-row justify-evenly gap-2">
        <div class="w-full">
          <Label for="siteURL">
            Site URL
            <span class="text-red-500">*</span>
            <Tooltip.Root openDelay={100}>
              <Tooltip.Trigger class="">
                <Info class="inline-block h-4 w-4 text-muted-foreground" />
              </Tooltip.Trigger>
              <Tooltip.Content>
                <div
                  class=" flex items-center justify-center rounded border bg-input p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
                >
                  The URL your kener is hosted on.
                </div>
              </Tooltip.Content>
            </Tooltip.Root>
          </Label>
          <Input
            bind:value={siteInformation.siteURL}
            class="mt-2"
            type="text"
            id="siteURL"
            placeholder="eg. https://status.example.com"
            required
          />
        </div>
      </div>
      <div class="flex w-full flex-row justify-evenly gap-2">
        <div class="w-full">
          <Label for="siteURL">
            Home Location
            <span class="text-red-500">*</span>
            <Tooltip.Root openDelay={100}>
              <Tooltip.Trigger class="">
                <Info class="inline-block h-4 w-4 text-muted-foreground" />
              </Tooltip.Trigger>
              <Tooltip.Content>
                <div
                  class=" flex items-center justify-center rounded border bg-input p-1.5 text-xs font-medium text-gray-300 shadow-popover outline-none"
                >
                  Where to go when someone clicks on the brand logo in the navbar.
                </div>
              </Tooltip.Content>
            </Tooltip.Root>
          </Label>

          <Input
            bind:value={siteInformation.home}
            class="mt-2"
            type="text"
            id="home"
            placeholder="/ or https://example.com"
            required
          />
        </div>
      </div>

      <div class="flex w-full flex-col justify-evenly gap-2">
        <div>
          <Label for="logo">Logo</Label>
        </div>
        <div class="flex gap-x-4">
          {#if !!siteInformation.logo}
            <div class="relative mt-2.5">
              <Label for="logo" class="inline-block h-[60px] w-[60px] cursor-pointer rounded-sm border p-1">
                <GMI src={siteInformation.logo} classList="w-fit hover:scale-95" alt="" />
              </Label>

              <div class="absolute -right-2 -top-2">
                <Button
                  variant="secondary"
                  class="h-5 w-5 rounded-full border p-1"
                  size="icon"
                  on:click={() => (siteInformation.logo = "")}
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>
              {#if uploadingLogo}
                <div
                  class="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 transform rounded-sm bg-[rgba(0,0,0,0.5)] p-0.5"
                >
                  <Loader class="h-4 w-4 animate-spin" />
                </div>
              {/if}
            </div>
          {/if}
          <div class="flex gap-x-2">
            <div>
              <Label for="typeOfLogoUpload" class="text-sm font-medium">Method</Label>
              <Select.Root
                portal={null}
                onSelectedChange={(e) => {
                  typeOfLogoUpload = e.value;
                }}
                selected={{
                  value: typeOfLogoUpload,
                  label: typeOfLogoUpload
                }}
              >
                <Select.Trigger class="mt-2 w-[200px]" id="typeOfLogoUpload">
                  <Select.Value bind:value={typeOfLogoUpload} placeholder="Logo Type" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    <Select.Label>Logo Type</Select.Label>
                    <Select.Item value="URL" label="URL" class="text-sm font-medium">URL</Select.Item>
                    <Select.Item value="FILE" label="FILE" class="text-sm font-medium">FILE</Select.Item>
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </div>
            {#if typeOfLogoUpload === "URL"}
              <div>
                <Label for="logo" class="text-sm font-medium">Please provide a URL of the image</Label>
                <Input
                  bind:value={siteInformation.logo}
                  class="mt-2"
                  type="text"
                  id="logo"
                  placeholder="https://example.com/logo.png"
                />
              </div>
            {:else}
              <div>
                <Label for="logo" class="text-sm font-medium">Please upload a square image of max size 100KB</Label>
                <Input
                  class="mt-2"
                  id="logo"
                  type="file"
                  accept=".jpg, .jpeg, .png, .svg"
                  disabled={uploadingLogo}
                  on:change={handleFileChangeLogo}
                />

                <p class="mt-1 text-xs font-medium text-destructive">
                  {uploadLogoStatus}
                </p>
              </div>
            {/if}
          </div>
        </div>
        <div>
          <Label for="favicon">Favicon</Label>
        </div>
        <div class="flex gap-x-4">
          {#if !!siteInformation.favicon}
            <div class="relative mt-8">
              <Label for="favicon" class="inline-block h-[40px] w-[40px] cursor-pointer rounded-sm border p-1">
                <GMI src={siteInformation.favicon} classList="w-fit hover:scale-95" alt="" />
              </Label>

              <div class="absolute -right-2 -top-2">
                <Button
                  variant="secondary"
                  class="h-5 w-5 rounded-full border p-1"
                  size="icon"
                  on:click={() => (siteInformation.favicon = "")}
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>
              {#if uploadingFavicon}
                <div
                  class="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 transform rounded-sm bg-[rgba(0,0,0,0.5)] p-0.5"
                >
                  <Loader class="h-4 w-4 animate-spin" />
                </div>
              {/if}
            </div>
          {/if}
          <div class="flex gap-x-2">
            <div>
              <Label for="typeOfFaviconUpload" class="text-sm font-medium">Method</Label>
              <Select.Root
                portal={null}
                onSelectedChange={(e) => {
                  typeOfFaviconUpload = e.value;
                }}
                selected={{
                  value: typeOfFaviconUpload,
                  label: typeOfFaviconUpload
                }}
              >
                <Select.Trigger class="mt-2 w-[200px]" id="typeOfFaviconUpload">
                  <Select.Value bind:value={typeOfFaviconUpload} placeholder="Favicon Type" />
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
            {#if typeOfFaviconUpload === "URL"}
              <div>
                <Label for="favicon" class="text-sm font-medium">Please provide a URL of the image</Label>
                <Input
                  bind:value={siteInformation.favicon}
                  class="mt-2"
                  type="text"
                  id="favicon"
                  placeholder="https://example.com/favicon.png"
                />
              </div>
            {:else}
              <div>
                <Label for="favicon" class="text-sm font-medium">Please upload a square image of max size 20KB</Label>
                <Input
                  class="mt-2"
                  id="favicon"
                  type="file"
                  accept=".jpg, .jpeg, .png, .svg"
                  disabled={uploadingFavicon}
                  on:change={handleFaviconChangeLogo}
                />

                <p class="mt-1 text-xs font-medium text-destructive">
                  {uploadFaviconStatus}
                </p>
              </div>
            {/if}
          </div>
        </div>
        <div class="flex w-full justify-end gap-x-2">
          <p class="py-2 text-sm font-medium text-destructive">
            {formErrorMessage}
          </p>
          <Button type="submit" disabled={formState === "loading"}>
            Save
            {#if formState === "loading"}
              <Loader class="ml-2 inline h-4 w-4 animate-spin" />
            {/if}
          </Button>
        </div>
      </div>
    </form>
  </Card.Content>
</Card.Root>

<!-- GitHub Settings -->

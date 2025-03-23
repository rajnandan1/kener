<script>
  import { Button } from "$lib/components/ui/button";
  import { page } from "$app/stores";
  import Plus from "lucide-svelte/icons/plus";
  import X from "lucide-svelte/icons/x";
  import Loader from "lucide-svelte/icons/loader";
  import Settings from "lucide-svelte/icons/settings";
  import Check from "lucide-svelte/icons/check";
  import ChevronRight from "lucide-svelte/icons/chevron-right";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { base } from "$app/paths";
  import * as Select from "$lib/components/ui/select";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { createEventDispatcher } from "svelte";
  import { onMount } from "svelte";
  import { IsValidURL } from "$lib/clientTools.js";
  import { DiscordJSONTemplate, WebhookJSONTemplate, SlackJSONTemplate } from "$lib/anywhere.js";
  import { clickOutsideAction, slide } from "svelte-legos";
  import * as Card from "$lib/components/ui/card";
  import CodeMirror from "svelte-codemirror-editor";
  import { json } from "@codemirror/lang-json";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
  import { mode } from "mode-watcher";

  let status = "ACTIVE";
  let formState = "idle";
  let showAddTrigger = false;
  let triggers = [];
  let loadingData = false;
  export let data;

  let newTrigger = {
    id: 0,
    name: "some name",
    trigger_type: "webhook",
    trigger_desc: "",
    trigger_status: "ACTIVE",
    trigger_meta: {
      url: "",
      headers: [],
      to: "",
      from: data.fromEmail,
      webhook_body: WebhookJSONTemplate,
      has_webhook_body: false,
      has_discord_body: false,
      discord_body: DiscordJSONTemplate,
      has_slack_body: false,
      slack_body: SlackJSONTemplate,
      email_type: data.preferredModeEmail,
      smtp_host: data.smtp?.smtp_host ? data.smtp.smtp_host : "",
      smtp_port: data.smtp?.smtp_port ? data.smtp.smtp_port : "",
      smtp_user: data.smtp?.smtp_user ? data.smtp.smtp_user : "",
      smtp_pass: data.smtp?.smtp_pass ? data.smtp.smtp_pass : "",
      smtp_secure: data.smtp?.smtp_secure ? data.smtp.smtp_secure : ""
    }
  };
  let invalidFormMessage = "";
  function resetTrigger() {
    newTrigger = {
      id: 0,
      name: "",
      trigger_type: "webhook",
      trigger_desc: "",
      trigger_status: "ACTIVE",
      trigger_meta: {
        url: "",
        headers: [],
        to: "",
        from: data.fromEmail,
        webhook_body: WebhookJSONTemplate,
        has_webhook_body: false,
        has_discord_body: false,
        discord_body: DiscordJSONTemplate,
        has_slack_body: false,
        slack_body: SlackJSONTemplate,
        email_type: data.preferredModeEmail,
        smtp_host: data.smtp?.smtp_host ? data.smtp.smtp_host : "",
        smtp_port: data.smtp?.smtp_port ? data.smtp.smtp_port : "",
        smtp_user: data.smtp?.smtp_user ? data.smtp.smtp_user : "",
        smtp_pass: data.smtp?.smtp_pass ? data.smtp.smtp_pass : "",
        smtp_secure: data.smtp?.smtp_secure ? data.smtp.smtp_secure : ""
      }
    };
  }
  function selectChange(e) {
    status = e.value;
    loadData();
  }
  function addHeader() {
    newTrigger.trigger_meta.headers = [...newTrigger.trigger_meta.headers, { key: "", value: "" }];
  }

  //validate this pattern Alerts <alert@example.com>
  function validateNameEmailPattern(input) {
    const pattern = /^([\w\s]+)\s*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>$/;
    const match = input.match(pattern);
    if (match) {
      return {
        isValid: true,
        name: match[1].trim(),
        email: match[2]
      };
    }
    return {
      isValid: false,
      name: null,
      email: null
    };
  }

  async function addNewTrigger() {
    invalidFormMessage = "";
    // formState = "loading";
    //newTrigger.trigger_type present not empty
    if (newTrigger.trigger_type == "") {
      invalidFormMessage = "Trigger Type is required";
      formState = "idle";
      return;
    }
    if (newTrigger.trigger_type == "discord") {
      if (newTrigger.trigger_meta.has_discord_body) {
        try {
          JSON.parse(newTrigger.trigger_meta.discord_body);
        } catch (e) {
          invalidFormMessage = "Invalid JSON in Discord Body";
          formState = "idle";
          return;
        }
      }
    }
    if (newTrigger.trigger_type == "slack") {
      if (newTrigger.trigger_meta.has_slack_body) {
        try {
          JSON.parse(newTrigger.trigger_meta.slack_body);
        } catch (e) {
          invalidFormMessage = "Invalid JSON in Slack Body";
          formState = "idle";
          return;
        }
      }
    }

    if (newTrigger.trigger_type == "email") {
      newTrigger.trigger_meta.url = "";

      let emValid = validateNameEmailPattern(newTrigger.trigger_meta.from);
      if (!emValid.isValid) {
        invalidFormMessage =
          "Invalid Name and Email Address for Sender. It should be like this: Name <email@example.com>";
        formState = "idle";
        return;
      }

      if (newTrigger.trigger_meta.email_type == "smtp") {
        if (newTrigger.trigger_meta.smtp_host == "") {
          invalidFormMessage = "SMTP Host is required";
          formState = "idle";
          return;
        }
        if (newTrigger.trigger_meta.smtp_port == "") {
          invalidFormMessage = "SMTP Port is required";
          formState = "idle";
          return;
        }
        if (newTrigger.trigger_meta.smtp_user == "") {
          invalidFormMessage = "SMTP User is required";
          formState = "idle";
          return;
        }
        if (newTrigger.trigger_meta.smtp_pass == "") {
          invalidFormMessage = "SMTP Password is required";
          formState = "idle";
          return;
        }
      }
    }
    if (newTrigger.trigger_type == "webhook") {
      //headers elements key value should not be empty
      if (newTrigger.trigger_meta.headers.length > 0) {
        for (let i = 0; i < newTrigger.trigger_meta.headers.length; i++) {
          if (newTrigger.trigger_meta.headers[i].key == "") {
            invalidFormMessage = "Header Key is required";
            formState = "idle";
            return;
          }
          if (newTrigger.trigger_meta.headers[i].value == "") {
            invalidFormMessage = "Header Value is required";
            formState = "idle";
            return;
          }
        }
      }

      if (newTrigger.trigger_meta.has_webhook_body) {
        if (newTrigger.trigger_meta.webhook_body == "") {
          invalidFormMessage = "Webhook Body is required";
          formState = "idle";
          return;
        }
      }
    }
    //newTrigger.name present not empty
    if (newTrigger.name == "") {
      invalidFormMessage = "Trigger Name is required";
      formState = "idle";
      return;
    }
    //newTrigger.trigger_meta.url present not empty
    if (newTrigger.trigger_type != "email" && newTrigger.trigger_meta.url == "") {
      invalidFormMessage = "Trigger URL is required";
      formState = "idle";
      return;
    }

    if (newTrigger.trigger_meta.url != "" && !IsValidURL(newTrigger.trigger_meta.url)) {
      invalidFormMessage = "Invalid URL";
      formState = "idle";
      return;
    }

    let toPost = {
      id: newTrigger.id,
      name: newTrigger.name,
      trigger_type: newTrigger.trigger_type,
      trigger_status: newTrigger.trigger_status,
      trigger_desc: newTrigger.trigger_desc,
      trigger_meta: JSON.stringify(newTrigger.trigger_meta)
    };

    try {
      let data = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "createUpdateTrigger", data: toPost })
      });
      let resp = await data.json();
      if (resp.error) {
        invalidFormMessage = resp.error;
      } else {
        showAddTrigger = false;
        loadData();
      }
    } catch (error) {
      invalidFormMessage = "Error while saving data";
    } finally {
      formState = "idle";
    }
  }

  function addNewTriggerFn() {
    resetTrigger();
    showAddTrigger = true;
  }

  function showUpdateSheet(m) {
    newTrigger = { ...newTrigger, ...m };
    newTrigger.trigger_meta = JSON.parse(newTrigger.trigger_meta);
    if (newTrigger.trigger_type === "email" && !!!newTrigger.trigger_meta.email_type) {
      newTrigger.trigger_meta.email_type = "resend";
    }
    showAddTrigger = true;
  }

  async function testTrigger(i, trigger_id, status) {
    triggers[i].testLoaders = "loading";
    try {
      let data = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "testTrigger", data: { trigger_id, status } })
      });
      let resp = await data.json();
    } catch (error) {
      alert("Error: " + error);
    } finally {
      triggers[i].testLoaders = "success";
      setTimeout(() => {
        triggers[i].testLoaders = "idle";
      }, 3000);
    }
  }

  async function loadData() {
    //fetch data
    loadingData = true;
    try {
      let apiResp = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "getTriggers", data: { status: status } })
      });
      triggers = await apiResp.json();
      triggers = triggers.map((t) => {
        t.testLoaders = "idle";
        return t;
      });
    } catch (error) {
      alert("Error: " + error);
    } finally {
      loadingData = false;
    }
  }
  let isMounted = false;

  //find trigger by id and open modal
  function findTriggerByIdAndOpenModal(id) {
    id = parseInt(id);
    const trigger = triggers.find((t) => t.id === id);
    if (trigger) {
      showUpdateSheet(trigger);
    }
  }

  onMount(async () => {
    await loadData();
    isMounted = true;
    if (window.location.hash) {
      let id = window.location.hash.replace("#", "");
      findTriggerByIdAndOpenModal(id);
    }
    window.onhashchange = function () {
      let id = window.location.hash.replace("#", "");
      findTriggerByIdAndOpenModal(id);
    };
  });
  let placeholderWebhookBody = JSON.stringify(
    {
      id: "${id}",
      alert_name: "${alert_name}",
      severity: "${severity}",
      status: "${status}",
      source: "${source}",
      timestamp: "${timestamp}",
      description: "${description}",
      details: {
        metric: "${metric}",
        current_value: "${current_value}",
        threshold: "${threshold}"
      },
      actions: [
        {
          text: "${action_text}",
          url: "${action_url}"
        }
      ]
    },
    null,
    2
  );

  $: {
    //broadcast a custom event named blockScroll
    if (!!isMounted) {
      const noScrollEvent = new CustomEvent("noScroll", {
        detail: showAddTrigger
      });
      window.dispatchEvent(noScrollEvent);
      if (!showAddTrigger) {
        window.location.hash = "";
      }
    }
    //if modal closed then clear url hashed
  }
</script>

<div class="mt-4 flex justify-between">
  <div class="flex w-40">
    <Select.Root portal={null} onSelectedChange={selectChange}>
      <Select.Trigger id="statusmonitor2">
        <Select.Value placeholder={status} />
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          <Select.Label>Status</Select.Label>
          <Select.Item value="ACTIVE" label="ACTIVE" class="text-sm font-medium">ACTIVE</Select.Item>
          <Select.Item value="INACTIVE" label="INACTIVE" class="text-sm font-medium">INACTIVE</Select.Item>
        </Select.Group>
      </Select.Content>
    </Select.Root>
    {#if loadingData}
      <Loader class="ml-2 mt-2 inline h-6 w-6 animate-spin" />
    {/if}
  </div>
  {#if $page.data.user.role != "member"}
    <Button on:click={addNewTriggerFn}>
      <Plus class="mr-2 inline h-6 w-6" />
      New Trigger
    </Button>
  {/if}
</div>

<div class="mt-4">
  {#each triggers as trigger, i}
    <Card.Root class="mb-4">
      <Card.Header class="relative">
        <Card.Title>
          {#if trigger.trigger_type == "webhook"}
            <img src={base + "/webhooks.svg"} alt={trigger.trigger_type} class="mr-2 inline-block h-6 w-6" />
          {:else if trigger.trigger_type == "slack"}
            <img src={base + "/slack.svg"} alt={trigger.trigger_type} class="mr-2 inline-block h-6 w-6" />
          {:else if trigger.trigger_type == "discord"}
            <img src={base + "/discord.svg"} alt={trigger.trigger_type} class="mr-2 inline-block h-6 w-6" />
          {:else if trigger.trigger_type == "email"}
            <img src={base + "/email.png"} alt={trigger.trigger_type} class="mr-2 inline-block h-6 w-6" />
          {/if}
          {trigger.name}
        </Card.Title>

        <div class="absolute right-3 top-3 flex gap-x-2">
          <Button
            variant="secondary"
            class="h-8   p-2 "
            disabled={trigger.testLoaders == "loading"}
            on:click={() => testTrigger(i, trigger.id, "TRIGGERED")}
          >
            {#if trigger.testLoaders == "loading"}
              <Loader class="mr-1 inline h-3 w-3 animate-spin" />
            {/if}
            {#if trigger.testLoaders == "success"}
              <Check class="mr-1 inline h-3 w-3 text-green-500 " />
            {/if}
            <span class="h-4 text-xs font-medium"> Test Trigger </span>
          </Button>
          {#if $page.data.user.role != "member"}
            <Button variant="secondary" class=" h-8 w-8 p-2" href={"#" + trigger.id}>
              <Settings class="inline h-4 w-4" />
            </Button>
          {/if}
        </div>
      </Card.Header>
    </Card.Root>
  {/each}
</div>
{#if showAddTrigger}
  <div class="fixed left-0 top-0 z-50 h-screen w-screen bg-card bg-opacity-20 backdrop-blur-sm">
    <div
      transition:slide={{ direction: "right", duration: 200 }}
      use:clickOutsideAction
      on:clickoutside={(e) => {
        showAddTrigger = false;
      }}
      class="absolute right-0 top-0 h-screen w-[800px] bg-background px-3 shadow-xl"
    >
      <Button
        variant="outline"
        size="icon"
        class="absolute right-[785px] top-8  z-10 h-8 w-8 rounded-md"
        on:click={(e) => {
          showAddTrigger = false;
        }}
      >
        <ChevronRight class="h-6 w-6 " />
      </Button>
      <div class="absolute top-0 flex h-12 w-full justify-between gap-2 border-b p-3 pr-6">
        {#if newTrigger.id}
          <h2 class="text-lg font-medium">Edit Trigger</h2>
        {:else}
          <h2 class="text-lg font-medium">Add Trigger</h2>
        {/if}
        <div>
          <label class="inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              value=""
              class="peer sr-only"
              checked={newTrigger.trigger_status == "ACTIVE"}
              on:change={() => {
                newTrigger.trigger_status = newTrigger.trigger_status == "ACTIVE" ? "INACTIVE" : "ACTIVE";
              }}
            />
            <div
              class="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800 rtl:peer-checked:after:-translate-x-full"
            ></div>
          </label>
        </div>
      </div>
      <div class="mt-12 w-full overflow-y-auto p-3" style="height: calc(100vh - 7rem);">
        <p class="mb-4">
          Select the type of Trigger you want to add. You can add multiple Triggers of different types.
        </p>
        <div class="flex justify-stretch gap-4">
          <Button
            variant={newTrigger.trigger_type != "webhook" ? "outline" : "secondary"}
            class="border"
            on:click={() => {
              newTrigger.trigger_type = "webhook";
            }}
          >
            <img src="{base}/webhooks.svg" title="webhook" class="mr-4 w-6" />
            Webhooks
          </Button>
          <Button
            variant={newTrigger.trigger_type != "discord" ? "outline" : "secondary"}
            class="border"
            on:click={() => {
              newTrigger.trigger_type = "discord";
            }}
          >
            <img src="{base}/discord.svg" title="discord" class="mr-4 w-6" />
            Discord
          </Button>
          <Button
            variant={newTrigger.trigger_type != "slack" ? "outline" : "secondary"}
            class="border"
            on:click={() => {
              newTrigger.trigger_type = "slack";
            }}
          >
            <img src="{base}/slack.svg" title="slack" class="mr-4 w-6" />
            Slack
          </Button>

          <Button
            variant={newTrigger.trigger_type != "email" ? "outline" : "secondary"}
            class="border"
            on:click={() => {
              newTrigger.trigger_type = "email";
            }}
          >
            <img src="{base}/email.png" title="email" class="mr-4 w-6" />
            Email
          </Button>
        </div>

        <div class="mt-4">
          <div class="flex flex-row gap-4">
            <div class="w-[300px]">
              <Label class="text-sm">
                Add a name for your <span class="underline">{newTrigger.trigger_type}</span>
                Trigger
                <span class="text-red-500">*</span>
              </Label>
              <Input class="mt-2" bind:value={newTrigger.name} placeholder="My Trigger" />
            </div>
          </div>

          <div class="mt-4 w-full">
            <Label class="text-sm">
              Add description for your <span class="underline">
                {newTrigger.trigger_type}
              </span>
              Trigger
            </Label>
            <Input class="mt-2" bind:value={newTrigger.trigger_desc} placeholder="Example: This is a trigger." />
          </div>
          {#if newTrigger.trigger_type != "email"}
            <div class="mt-4 w-full">
              <Label class="text-sm">
                Add URL for your <span class="underline">{newTrigger.trigger_type}</span>
                Trigger
                <span class="text-red-500">*</span>
              </Label>
              <Input class="mt-2" bind:value={newTrigger.trigger_meta.url} placeholder="https://example.com/url" />
            </div>
          {/if}
          {#if newTrigger.trigger_type == "webhook"}
            <div class="mt-4 w-full">
              <Label for="url">Add Optional Headers for Webhooks</Label>
              <div class="mt-2 grid grid-cols-6 gap-2">
                {#each newTrigger.trigger_meta.headers as header, index}
                  <div class="col-span-2">
                    <Input bind:value={header.key} id="header" placeholder="Content-Type" />
                  </div>
                  <div class="col-span-3">
                    <Input bind:value={header.value} id="header" placeholder="application/json" />
                  </div>
                  <div class="col-span-1 pt-2">
                    <Button
                      class=" h-6 w-6 p-1"
                      variant="secondary"
                      on:click={() => {
                        newTrigger.trigger_meta.headers = newTrigger.trigger_meta.headers.filter((_, i) => i !== index);
                      }}
                    >
                      <X class="h-5 w-5" />
                    </Button>
                  </div>
                {/each}
              </div>
              <div class="relative pb-8 pt-2">
                <hr class="border-1 border-border-input relative top-4 h-px border-dashed" />

                <Button
                  on:click={addHeader}
                  variant="secondary"
                  class="absolute left-1/2 h-8  -translate-x-1/2   p-2 text-xs  "
                >
                  <Plus class="mr-1 h-4 w-4" /> Add Headers
                </Button>
              </div>
              <div>
                <label class="text-sm font-medium">
                  <input
                    on:change={(e) => {
                      newTrigger.trigger_meta.has_webhook_body = e.target.checked;
                    }}
                    type="checkbox"
                    checked={newTrigger.trigger_meta.has_webhook_body}
                  />
                  Use a Custom Webhook Body
                </label>
                {#if !!newTrigger.trigger_meta.has_webhook_body}
                  <p class="my-2 text-xs text-muted-foreground">
                    You can use a custom webhook body. The body should be a valid for the Content-Type header you have
                    set. The default is JSON. There are <a
                      target="_blank"
                      class="text-blue-500"
                      href="https://kener.ing/docs/triggers#triggers-trigger-variables">mustache variables</a
                    >
                    that you can use for the webhook body. To use a variable wrap it like
                    <code>&#123;&#123;variable&#125;&#125;</code>. There are some examples
                    <a target="_blank" class="text-blue-500" href="https://kener.ing/docs/triggers#webhook-examples"
                      >here</a
                    >
                  </p>

                  <div class="overflow-hidden rounded-md">
                    <CodeMirror
                      bind:value={newTrigger.trigger_meta.webhook_body}
                      lang={json()}
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
                {/if}
              </div>
            </div>
          {:else if newTrigger.trigger_type == "slack"}
            <div class="mt-4 flex w-full flex-col gap-y-2">
              <div>
                <label class="text-sm font-medium">
                  <input
                    on:change={(e) => {
                      newTrigger.trigger_meta.has_slack_body = e.target.checked;
                    }}
                    type="checkbox"
                    checked={newTrigger.trigger_meta.has_slack_body}
                  />
                  Use Custom Slack Payload
                </label>
              </div>
              {#if !!newTrigger.trigger_meta.has_slack_body}
                <p class="my-2 text-xs text-muted-foreground">
                  You can use a custom slack body. You can use mustache variable to generate a body. See the <a
                    target="_blank"
                    class="text-blue-500"
                    href="https://kener.ing/docs/triggers#triggers-trigger-variables">variables</a
                  >
                  that you can use for the slack body.
                </p>
                <div class="overflow-hidden rounded-md">
                  <CodeMirror
                    bind:value={newTrigger.trigger_meta.slack_body}
                    lang={json()}
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
              {/if}
            </div>
          {:else if newTrigger.trigger_type == "discord"}
            <div class="mt-4 flex w-full flex-col gap-y-2">
              <div>
                <label class="text-sm font-medium">
                  <input
                    on:change={(e) => {
                      newTrigger.trigger_meta.has_discord_body = e.target.checked;
                    }}
                    type="checkbox"
                    checked={newTrigger.trigger_meta.has_discord_body}
                  />
                  Use Custom Discord Payload
                </label>
              </div>
              {#if !!newTrigger.trigger_meta.has_discord_body}
                <p class="my-2 text-xs text-muted-foreground">
                  You can use a custom discord body. You can use mustache variable to generate a body. See the <a
                    target="_blank"
                    class="text-blue-500"
                    href="https://kener.ing/docs/triggers#triggers-trigger-variables">variables</a
                  >
                  that you can use for the discord body.
                </p>
                <div class="overflow-hidden rounded-md">
                  <CodeMirror
                    bind:value={newTrigger.trigger_meta.discord_body}
                    lang={json()}
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
              {/if}
            </div>
          {:else if newTrigger.trigger_type == "email"}
            <div class="mt-4 w-full">
              <RadioGroup.Root class="my-4 flex" bind:value={newTrigger.trigger_meta.email_type}>
                <div class="flex items-center space-x-2">
                  <RadioGroup.Item value="resend" id="email-resend" />
                  <Label for="email-resend" class="cursor-pointer">Use Resend</Label>
                </div>
                <div class="flex items-center space-x-2">
                  <RadioGroup.Item value="smtp" id="email-smtp" />
                  <Label for="email-smtp" class="cursor-pointer">Use SMTP</Label>
                </div>
              </RadioGroup.Root>
              {#if !!!data.RESEND_API_KEY && newTrigger.trigger_meta.email_type == "resend"}
                <div class="rounded-md border bg-card p-2 text-xs">
                  <p class="text-sm font-semibold">Email Trigger</p>
                  <p class="text-xs">
                    Kener uses <a href="https://resend.com/" class="text-blue-500" target="_blank">resend</a>
                    to send emails. Please make sure you have created an account with resend. Also add the resend api key
                    as environment variable
                    <span class="font-mono">RESEND_API_KEY</span>.
                    <span class="text-red-500"
                      >The RESEND_API_KEY is not set in your environment variable. Please set it and restart the server</span
                    >.
                  </p>
                </div>
              {:else if newTrigger.trigger_meta.email_type == "smtp"}
                <div class="flex gap-x-2">
                  <div>
                    <Label class="text-sm">
                      Host
                      <span class="text-red-500">*</span>
                    </Label>
                    <Input class="mt-2" bind:value={newTrigger.trigger_meta.smtp_host} placeholder="smtp.example.com" />
                  </div>
                  <div>
                    <Label class="text-sm">
                      Port
                      <span class="text-red-500">*</span>
                    </Label>
                    <Input class="mt-2" bind:value={newTrigger.trigger_meta.smtp_port} placeholder="587" />
                  </div>
                  <div>
                    <Label class="text-sm">
                      User
                      <span class="text-red-500">*</span>
                    </Label>
                    <Input class="mt-2" bind:value={newTrigger.trigger_meta.smtp_user} placeholder="raj@example.com" />
                  </div>
                  <div>
                    <Label class="text-sm">
                      Password
                      <span class="text-red-500">*</span>
                    </Label>
                    <Input class="mt-2" bind:value={newTrigger.trigger_meta.smtp_pass} placeholder="*******" />
                  </div>
                </div>
                <div class="my-2">
                  <label class="text-sm">
                    <input
                      on:change={(e) => {
                        newTrigger.trigger_meta.smtp_secure = e.target.checked;
                      }}
                      type="checkbox"
                      checked={newTrigger.trigger_meta.smtp_secure}
                    />
                    Use Secure Connection
                  </label>
                </div>
              {/if}
            </div>
            <div class="mt-4 w-full">
              <Label class="text-sm">
                Add To Email Addresses, (comma separated)
                <span class="text-red-500">*</span>
              </Label>
              <Input
                class="mt-2"
                bind:value={newTrigger.trigger_meta.to}
                placeholder="john@example.com, jane@example.com"
              />
            </div>
            <div class="mt-4 w-full">
              <Label class="text-sm">
                Add Name and Sender Email Address
                <span class="text-red-500">*</span>
              </Label>
              <Input class="mt-2" bind:value={newTrigger.trigger_meta.from} placeholder="Alerts <alert@example.com>" />
            </div>
          {/if}
        </div>
      </div>
      <div class="absolute bottom-0 grid h-16 w-full grid-cols-6 justify-end gap-2 border-t p-3 pr-6">
        <div class="col-span-5 py-2.5">
          <p class="text-right text-sm font-medium text-destructive">{invalidFormMessage}</p>
        </div>
        <div class="col-span-1">
          <Button class="col-span-1 w-full" disabled={formState === "loading"} on:click={addNewTrigger}>
            Save Trigger
            {#if formState === "loading"}
              <Loader class="ml-2 inline h-4 w-4 animate-spin" />
            {/if}
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

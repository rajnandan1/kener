<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import Loader from "@lucide/svelte/icons/loader";
  import { toast } from "svelte-sonner";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  // Types
  interface AnalyticsRequirement {
    label: string;
    type: string;
    placeholder: string;
    required: boolean;
    value: string;
  }

  interface AnalyticsProvider {
    label: string;
    logo: string;
    key: string;
    isEnabled: boolean;
    activeInSite: boolean;
    requirements: AnalyticsRequirement[];
  }

  // State
  let loading = $state(true);
  let saving = $state(false);
  let selectedAnalytics = $state<AnalyticsProvider | null>(null);

  // Analytics providers configuration
  let analyticsProviders = $state<AnalyticsProvider[]>([
    {
      label: "Google Analytics",
      logo: "/ga.png",
      key: "analytics.googleTagManager",
      isEnabled: false,
      activeInSite: false,
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
      logo: "/plausible.png",
      key: "analytics.plausible",
      isEnabled: false,
      activeInSite: false,
      requirements: [
        {
          label: "Domain",
          type: "text",
          placeholder: "kener.ing",
          required: true,
          value: ""
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
      logo: "/mx.png",
      key: "analytics.mixpanel",
      isEnabled: false,
      activeInSite: false,
      requirements: [
        {
          label: "Project Token",
          type: "text",
          placeholder: "YOUR_PROJECT_TOKEN",
          required: true,
          value: ""
        },
        {
          label: "API Host",
          type: "text",
          placeholder: "https://api.mixpanel.com",
          required: false,
          value: ""
        }
      ]
    },
    {
      label: "Amplitude",
      logo: "/amplitude.png",
      key: "analytics.amplitude",
      isEnabled: false,
      activeInSite: false,
      requirements: [
        {
          label: "Amplitude API Key",
          type: "text",
          placeholder: "API key for your Amplitude project",
          required: true,
          value: ""
        },
        {
          label: "Server URL",
          type: "text",
          placeholder: "https://api2.amplitude.com/2/httpapi",
          required: false,
          value: ""
        }
      ]
    },
    {
      label: "Microsoft Clarity",
      logo: "/clarity.png",
      key: "analytics.clarity",
      isEnabled: false,
      activeInSite: false,
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
      logo: "/umami.png",
      key: "analytics.umami",
      isEnabled: false,
      activeInSite: false,
      requirements: [
        {
          label: "Website ID",
          type: "text",
          placeholder: "Website ID for your umami script and domain",
          required: true,
          value: ""
        },
        {
          label: "Script URL",
          type: "text",
          placeholder: "https://cloud.umami.is/script.js",
          required: true,
          value: "https://cloud.umami.is/script.js"
        }
      ]
    },
    {
      label: "PostHog",
      logo: "/posthog.png",
      key: "analytics.posthog",
      isEnabled: false,
      activeInSite: false,
      requirements: [
        {
          label: "API Key",
          type: "text",
          placeholder: "phc_xxxxxxxxxxxxxxxxxxxx",
          required: true,
          value: ""
        },
        {
          label: "API Host",
          type: "text",
          placeholder: "https://us.i.posthog.com",
          required: true,
          value: "https://us.i.posthog.com"
        }
      ]
    }
  ]);

  async function fetchAnalyticsData() {
    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getAllSiteData" })
      });
      const result = await response.json();

      if (!result.error) {
        // Update providers with saved data
        analyticsProviders = analyticsProviders.map((provider) => {
          const dbData = result[provider.key];
          if (dbData) {
            provider.isEnabled = dbData.isEnabled || false;
            provider.activeInSite = dbData.isEnabled || false;
            if (dbData.requirements) {
              provider.requirements = provider.requirements.map((req) => ({
                ...req,
                value: dbData.requirements[req.label] || req.value
              }));
            }
          }
          return provider;
        });
      }

      // Select the first provider by default
      selectedAnalytics = analyticsProviders[0];
    } catch (e) {
      toast.error("Failed to load analytics settings");
    } finally {
      loading = false;
    }
  }

  async function saveAnalytics() {
    if (!selectedAnalytics) return;

    saving = true;
    try {
      // Build requirements data
      const requirementsData: Record<string, string> = {};
      selectedAnalytics.requirements.forEach((req) => {
        requirementsData[req.label] = req.value;
      });

      // Build final data object
      const dataToSave: Record<string, string> = {};
      dataToSave[selectedAnalytics.key] = JSON.stringify({
        requirements: requirementsData,
        isEnabled: selectedAnalytics.isEnabled
      });

      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storeSiteData",
          data: dataToSave
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${selectedAnalytics.label} settings saved successfully`);
        // Update activeInSite status
        selectedAnalytics.activeInSite = selectedAnalytics.isEnabled;
        // Update in the providers list
        const index = analyticsProviders.findIndex((p) => p.key === selectedAnalytics!.key);
        if (index !== -1) {
          analyticsProviders[index].activeInSite = selectedAnalytics.isEnabled;
        }
      }
    } catch (e) {
      toast.error("Failed to save analytics settings");
    } finally {
      saving = false;
    }
  }

  function selectProvider(provider: AnalyticsProvider) {
    selectedAnalytics = provider;
  }

  $effect(() => {
    fetchAnalyticsData();
  });
</script>

<div class="flex w-full flex-col gap-4 px-4">
  <div>Add your analytics ID/Key here. You can add multiple analytics providers.</div>
  {#if loading}
    <div class="flex items-center justify-center py-8">
      <Spinner />
    </div>
  {:else}
    <div class="grid grid-cols-4 overflow-hidden rounded-md border">
      <!-- Provider List -->
      <div class="col-span-1 flex flex-col border-r">
        {#each analyticsProviders as provider}
          <Button
            variant={selectedAnalytics?.key === provider.key ? "secondary" : "ghost"}
            class="flex items-center justify-between gap-x-2 rounded-none border-b text-sm last:border-none"
            onclick={() => selectProvider(provider)}
          >
            <div class="flex flex-row items-center gap-x-3">
              <img src={clientResolver(resolve, provider.logo)} class="w-5" alt={provider.label} />
              <span>{provider.label}</span>
            </div>
            {#if provider.activeInSite && provider.isEnabled}
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

      <!-- Provider Configuration -->
      <form
        onsubmit={(e) => {
          e.preventDefault();
          saveAnalytics();
        }}
        class="col-span-3 flex flex-col justify-between p-4"
      >
        {#if selectedAnalytics}
          <div>
            <div class="text-muted-foreground mb-4 text-sm font-medium">
              Add details for your {selectedAnalytics.label} account
            </div>

            <div class="grid grid-cols-2 gap-4">
              {#each selectedAnalytics.requirements as req}
                <div class="flex flex-col gap-y-2">
                  <Label for={req.label}>{req.label}</Label>
                  <Input
                    bind:value={req.value}
                    type={req.type}
                    id={req.label}
                    placeholder={req.placeholder}
                    required={req.required}
                  />
                </div>
              {/each}
            </div>

            <div class="mt-4 flex flex-row items-center justify-between">
              <div class="flex flex-row items-center gap-x-3">
                <Switch bind:checked={selectedAnalytics.isEnabled} />
                <div class="text-muted-foreground text-sm font-medium">
                  {selectedAnalytics.label} is
                  <span class="underline">{selectedAnalytics.isEnabled ? "enabled" : "disabled"}</span>
                  for your site
                </div>
              </div>

              <Button type="submit" disabled={saving}>
                Save Changes for {selectedAnalytics.label}
                {#if saving}
                  <Loader class="ml-2 inline size-4 animate-spin" />
                {/if}
              </Button>
            </div>
          </div>
        {/if}
      </form>
    </div>
  {/if}
</div>

<script lang="ts">
  import ProviderSettingsPanel from "$lib/components/manage/ProviderSettingsPanel.svelte";
  import type { ProviderDefinition } from "$lib/components/manage/ProviderSettingsPanel.svelte";

  const analyticsProviders: ProviderDefinition[] = [
    {
      label: "Google Analytics",
      logo: "/ga.png",
      key: "analytics.googleTagManager",
      isEnabled: false,
      activeInSite: false,
      requirements: [
        { label: "Measurement ID", type: "text", placeholder: "G-S05E5E5E5E5", required: true, value: "" },
        {
          label: "Transport URL",
          type: "text",
          placeholder: "https://www.google-analytics.com",
          required: false,
          value: ""
        },
        {
          label: "Script Host",
          type: "text",
          placeholder: "https://www.googletagmanager.com",
          required: false,
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
        { label: "Domain", type: "text", placeholder: "kener.ing", required: true, value: "" },
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
        { label: "Project Token", type: "text", placeholder: "YOUR_PROJECT_TOKEN", required: true, value: "" },
        { label: "API Host", type: "text", placeholder: "https://api.mixpanel.com", required: false, value: "" }
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
        { label: "API Key", type: "text", placeholder: "phc_xxxxxxxxxxxxxxxxxxxx", required: true, value: "" },
        {
          label: "API Host",
          type: "text",
          placeholder: "https://us.i.posthog.com",
          required: true,
          value: "https://us.i.posthog.com"
        }
      ]
    }
  ];
</script>

<ProviderSettingsPanel
  initialProviders={analyticsProviders}
  description="Add your analytics ID/Key here. You can add multiple analytics providers."
  learnMoreUrl="https://kener.ing/docs/v4/analytics"
/>

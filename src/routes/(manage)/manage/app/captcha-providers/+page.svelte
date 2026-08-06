<script lang="ts">
  import ProviderSettingsPanel from "$lib/components/manage/ProviderSettingsPanel.svelte";
  import type { ProviderDefinition } from "$lib/components/manage/ProviderSettingsPanel.svelte";

  const captchaProviders: ProviderDefinition[] = [
    {
      label: "hCaptcha",
      key: "captcha.hcaptcha",
      isEnabled: false,
      activeInSite: false,
      requirements: [
        {
          label: "Site Key",
          type: "text",
          placeholder: "10000000-ffff-ffff-ffff-000000000001",
          required: true,
          value: ""
        },
        {
          label: "Secret Key",
          type: "password",
          placeholder: "0x0000000000000000000000000000000000000",
          required: true,
          value: ""
        }
      ]
    },
    {
      label: "Google reCAPTCHA",
      key: "captcha.recaptcha",
      isEnabled: false,
      activeInSite: false,
      requirements: [
        { label: "Site Key", type: "text", placeholder: "6Lc...", required: true, value: "" },
        { label: "Secret Key", type: "password", placeholder: "6Lc...", required: true, value: "" }
      ]
    },
    {
      label: "Cloudflare Turnstile",
      key: "captcha.turnstile",
      isEnabled: false,
      activeInSite: false,
      requirements: [
        { label: "Site Key", type: "text", placeholder: "0x4AAAAAAA...", required: true, value: "" },
        { label: "Secret Key", type: "password", placeholder: "0x4AAAAAAA...", required: true, value: "" }
      ]
    }
  ];
</script>

<ProviderSettingsPanel
  initialProviders={captchaProviders}
  description="Configure a CAPTCHA provider to protect the public subscribe form from automated abuse. Only one provider can be active at a time — enabling one disables the others."
  enforceSingleActive
/>

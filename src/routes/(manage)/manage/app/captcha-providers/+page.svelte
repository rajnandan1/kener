<script lang="ts">
  import ProviderSettingsPanel from "$lib/components/manage/ProviderSettingsPanel.svelte";
  import type { ProviderDefinition } from "$lib/components/manage/ProviderSettingsPanel.svelte";

  const captchaProviders: ProviderDefinition[] = [
    {
      label: "hCaptcha",
      logo: "/hcaptcha.png",
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
      logo: "/recaptcha.png",
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
      logo: "/turnstile.png",
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
  description="Add your CAPTCHA provider Site Key/Secret Key here. Only one provider can be active at a time."
  learnMoreUrl="https://kener.ing/docs/v4/captcha"
  enforceSingleActive
/>

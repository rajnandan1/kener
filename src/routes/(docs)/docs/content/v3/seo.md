---
title: SEO Setup | Kener
description: Learn how to set up and work with SEO in kener.
---

SEO is important for your status page to be found on the internet. Kener provides you with the ability to set up SEO for your status page.

## Analytics {#analytics}

You can add Google Analytics, Amplitude, Mixpanel. Basic events and page tracking are supported.

### Google Analytics {#google-analytics}

ADD ID. It is the measurement ID that you get from Google Analytics. You can find it in the admin section of your Google Analytics account.

### Amplitude {#amplitude}

Add API key of your Amplitude account

### Mixpanel {#mixpanel}

Add project token of your Mixpanel account.

### Plausible {#plausible}

- Add domain of your Plausible account. Example: `example.com`
- Add API key of your Plausible account. Default is `https://plausible.io/api/event`
- Add Script Source of your Plausible account. Default is `https://plausible.io/js/script.pageview-props.tagged-events.js`

### Microsoft Clarity {#microsoft-clarity}

Add Project ID of your Microsoft Clarity account.

## Search Engine Optimization {#search-engine-optimization}

You can add meta tags for SEO. You can add any `meta` that you want to add to the head of the page. Example: `og:image`, `og:title`, `og:description`, `twitter:image`, `twitter:title`, `twitter:description`.

Once added it will become

```html
<meta property="og:image" content="https://example.com/image.png" />
```

## Sitemap {#sitemap}

Kener auto generates a sitemap for your status page. You can view it at `/sitemap.xml`

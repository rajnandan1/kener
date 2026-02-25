---
title: How to Add Custom Fonts
description: Use self-hosted or external font files with Kener via Custom CSS
---

Kener supports two ways to use custom fonts on your status page:

1. **Font CSS URL** — point to a hosted stylesheet (Google Fonts, Bunny Fonts, etc.)
2. **Custom CSS** — define `@font-face` rules for self-hosted font files

## Use a hosted font {#use-a-hosted-font}

If your font is available from a CDN (Google Fonts, Bunny Fonts, etc.):

1. Go to **Manage → Customizations**.
2. In the **Font** card, set **Font CSS URL** to the stylesheet URL — e.g. `https://fonts.bunny.net/css?family=lato:400,700&display=swap`.
3. Set **Font Family Name** to the font name — e.g. `Lato`.
4. Click **Save Font**.

## Use a self-hosted font {#use-a-self-hosted-font}

If you want to use your own font files (`.woff2`, `.woff`, `.ttf`), host them on a CDN or static file server and reference them in Custom CSS.

> [!IMPORTANT]
> Kener v4 does not serve files from a local `/uploads/` directory. Font files must be hosted at a publicly accessible URL.

1. Upload your font files to a CDN or static host and note the URLs.
2. Go to **Manage → Customizations**.
3. Clear the **Font CSS URL** and **Font Family Name** fields in the **Font** card and save.
4. In the **Custom CSS** card, add your `@font-face` rules:

```css
@font-face {
    font-family: "CustomFont";
    src:
        url("https://cdn.example.com/fonts/CustomFont.woff2") format("woff2"),
        url("https://cdn.example.com/fonts/CustomFont.woff") format("woff"),
        url("https://cdn.example.com/fonts/CustomFont.ttf") format("truetype");
    font-weight: normal;
    font-style: normal;
}
* {
    font-family: "CustomFont", sans-serif;
}
```

5. Click **Save Custom CSS**.

## Verify {#verify}

Open your public status page and confirm the font renders correctly. Use browser DevTools → **Computed** tab on any text element to confirm the applied `font-family`.

## Migrating from v3 {#migrating-from-v3}

In v3, font files could be placed in the `/uploads/` directory and referenced as `/uploads/CustomFont.woff2`. This path no longer works in v4.

**Fix:** Move your font files to an external host and update the `@font-face` `src` URLs accordingly.

## See also {#see-also}

- [Site Customizations](/docs/v4/setup/customizations)

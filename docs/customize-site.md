---
title: Customize Site - Site.yaml - Kener
description: Customize your Kener site using site.yaml
---

# Customize Site

There is a folder called `./config`. Inside which there is a `site.yaml` file. You can modify this file to have your own branding and do few other things.

## Sample site.yaml

```yaml
title: "Kener"
siteName: "Kener.ing"
logo: "/logo.svg"
favicon: "/logo96.png"
home: "/"
theme: dark
themeToggle: true
github:
    owner: "rajnandan1"
    repo: "kener"
    incidentSince: 72
metaTags:
    description: "Your description"
    keywords: "keyword1, keyword2"
nav:
    - name: "Documentation"
      url: "/docs"
	- name: "Github"
      iconURL: "/github.svg"
      url: "https://github.com/rajnandan1/kener"
siteURL: https://kener.ing
hero:
    title: Kener is a Open-Source Status Page System
    subtitle: Let your users know what's going on.
footerHTML: |
    Made using
    <a href="https://github.com/rajnandan1/kener" target="_blank" rel="noreferrer" class="font-medium underline underline-offset-4">
      Kener
    </a>
    an open source status page system built with Svelte and TailwindCSS.
i18n:
    defaultLocale: "en"
    locales:
        en: "English"
        hi: "हिन्दी"
        zh-CN: "中文"
        ja: "日本語"
        vi: "Tiếng Việt"
pattern: "squares"
font:
  cssSrc: "https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap"
  family: '"Lato", sans-serif'
analytics:
  - id: "G-QsFT"
    type: "GA"
  - id: "deasf0d350"
    type: "AMPLITUDE"
  - id: "FKOdsKener"
    type: "MIXPANEL"
```

---

## title

This translates to

```html
<title>Your Title</title>
```

---

## siteName

This is the name that will be shown in the nav bar, top left corner of the page

## logo

URL of the logo that will be shown in the nav bar. You can also add your logo in the `static` folder. Use the path `/logo.svg` to refer to it if you have added `logo.svg` in the `static` folder. Otherwise, you can use any URL.

## favicon

URL of the favicon that will be shown in the browser tab. You can also add your favicon in the `static` folder. Use the path `/logo96.png` to refer to it if you have added `logo96.png` in the `static` folder. Otherwise, you can use any URL.

## home

This is the location where someone will be taken when they click on the site name in the nav bar

## theme

This is the default theme of the site that will be used when a user lands for the first time. It can be `light` or `dark` or `system`. Defaults to `system`. The user still gets the option to change the theme.

## themeToggle

This is the option to show the theme toggle. It can be `true` or `false`. Defaults to `true`.

As of now there is no option to change the colors of the theme using `site.yaml`. If you still want to change the colors you can do so by modifying the `src/app.postcss` file.

## favicon

It can be set by modifying the `<head>` tag in `src/app.html` file.
Example add a png called `logo.png` file in `static/` and then

```html
...
<link rel="icon" href="/logo.png" />
...
```

---

## github

For incident kener uses github comments. Create an empty [github](https://github.com) repo and add them to `site.yaml`

```yaml
github:
    owner: "username"
    repo: "repository"
    incidentSince: 72
```

### owner

Owner of the github repository. If the repository is `https://github.com/rajnandan1/kener` then the owner is `rajnandan1`

### repo

Repository name of the github repository. If the repository is `https://github.com/rajnandan1/kener` then the repo is `kener`

### incidentSince

`incidentSince` is in hours. It means if an issue is created before X hours then kener would not honor it. What it means is that kener would not show it active incident pages nor it will update the uptime. Default is 30\*24 hours.

---

## metaTags

Meta tags are nothing but html `<meta>`. You can use them for SEO purposes

```yaml
metaTags:
    description: "Your description"
    keywords: "keyword1, keyword2"
    og:image: "https://example.com/og.png"
```

will become

```html
<head>
	<meta name="description" content="Your description" />
	<meta name="keywords" content="keyword1, keyword2" />
	<meta name="og:image" content="https://example.com/og.png" />
</head>
```

---

## siteURL

You can set this to generate SiteMaps

```yaml
siteURL: https://kener.ing
```

Sitemaps urls will be `https://kener.ing/sitemap.xml`

---

## hero

Use hero to add a banner to your kener page

```yaml
hero:
    title: Kener is a Open-Source Status Page System
    subtitle: Let your users know what's going on.
```

### title

Title of the hero section

### subtitle

Subtitle of the hero section

---

## nav

You can add more links to your navbar.

```yaml
nav:
    - name: "Home"
      url: "/home"
```

### name

Name of the link

### url

URL of the link

### iconURL

Icon of the link. You can add an icon in the `static` folder and refer to it using the path `/github.svg`

---

## categories

You can define categories for your monitors. Each category can have a description. The monitors can be grouped by categories.
`name=home` will be shown in the home page. Categories are shown in the order they are defined in the yaml file. A dropdown will appear in the nav bar to select the category.

```yaml
categories:
    - name: API
      description: "Kener provides a simple API for you to use to update your status page."
    - name: home
      description: "loroem ipsum lorem ipsum"
```

### name

Name of the category

### description

Description of the category

---

## footerHTML

You can add HTML to the footer. You can add links to your social media or anything else.

```yaml
footerHTML: |
	Made using <a href="https://kener.ing" target="_blank" rel="noreferrer" class="font-medium underline underline-offset-4">Kener</a> an open source status page system built with Svelte and TailwindCSS.
```

---

## i18n

You can add translations to your site. By default it is set to `en`. Available translations are present in `locales/` folders in the root directory. You can add more translations by adding a new file in the `locales` folder.

### Enable

Once you have added a new translation file in the `locales` folder, you can enable it by adding the locale code in the `site.yaml` file.

Let us say you have added a `hi.json` file in the `locales` folder. You can enable it by adding the following to the `site.yaml` file.

```yaml
i18n:
    defaultLocale: en
    locales:
        en: English
        hi: हिन्दी
```

### defaultLocale

**_defaultLocale_**: The default locale to be used for a user when he or she visits for the first time. It is important to note that the default locale json file should be present in the locales folder.

### locales

**_locales_**: A list of locales that you want to enable. The key is the locale code and the value is the name of the language. The locale code should be the same as the json file name in the locales folder. `en` means `en.json` should be present in the locales folder.

Adding more than one locales will enable a dropdown in the navbar to select the language.

Selected languages are stored in cookies and will be used when the user visits the site again.

There is no auto detection of the language. The user has to manually select the language.

### Variables

There are few variables that you you should not change,

-   %hours : This will be replaced by the hours
-   %minutes : This will be replaced by the minutes
-   %minute : This will be replaced by the minute
-   %status : This will be replaced by the status

---

## pattern

You can set the background pattern of the site. It can be `squares`, `dots`, `none`

---

## font

You can set the font of the site. You can use google fonts or any other font.

```yaml
font:
    cssSrc: "https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap"
    family: '"Lato", sans-serif'
```

### cssSrc

URL of the font css

### family

Font family

---

## analytics

You can add analytics to your site. You can add multiple analytics. Supported analytics are `GA`, `AMPLITUDE`, `MIXPANEL`

```yaml
analytics:
	- id: "G-QsFT"
	  type: "GA"
	- id: "deasf0d350"
	  type: "AMPLITUDE"
	- id: "FKOdsKener"
	  type: "MIXPANEL"
```

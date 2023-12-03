# Getting Started
## Clone the repository
```bash
git clone https://github.com/rajnandan1/kener.git
```

## Install Dependencies
```bash
npm install
```

## Start Kener
```bash
npm run kener
```

Kener would be running at PORT 3000. Go to [http://localhost:3000](http://localhost:3000)

![alt text](ss.png "SS")

# Modify Site

There is a folder called `/config`. Inside which there is a `site.yaml` file. You can modify this file to have your own branding.

```yaml
title: "Kener"
theme: "dark"
siteURL: "https://kener.netlify.app"
home: "/"
logo: "/logo.svg"
favicon: "/kener.png"
github:
  owner: "rajnandan1"
  repo: "kener"
metaTags:
  description: "Your description"
  keywords: "keyword1, keyword2"
nav:
  - name: "Documentation"
    url: "/docs"
hero:
  title: Kener is a Open-Source Status Page System
  subtitle: Let your users know what's going on.
    
```

## title

This translates to

```html
<title>Your Title</title>
```

## theme
Can be `light` or `dark`. Defaults to `light`

## siteURL
Root URL where you are hosting kenner
```yaml
...
siteURL: https://status.example.com
...
```
## home

Location when someone clicks on the your brand in the top nav bar
```yaml
...
home: "https://www.example.com
...
```

## logo
URL of the logo that will be shown in the nav bar. You can also add your logo in the `static` folder
```yaml
...
logo: "https://www.example.com/logo.png
...
```

## favicon
```yaml
...
favicon: "https://www.example.com/favicon.ico
...
```
## github
For incident kener uses github comments. Create an empty [github](https://github.com) public repo and add them to `site.yaml`
```yaml
github:
  owner: "username"
  repo: "your-reponame"
```
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
	<meta name="description" content="Your description">
	<meta name="keywords" content="keyword1, keyword2">
	<meta name="og:image" content="https://example.com/og.png">
</head>
```

## hero
Use hero to add a banner to your kener page
```yaml
hero:
  title: Kener is a Open-Source Status Page System
  subtitle: Let your users know what's going on.
```

![alt text](ss2.png "SS")

## nav
You can add more links to your navbar.
```yaml
nav:
  - name: "Home"
    url: "/home"
```
![alt text](ss3.png "SS")
# Add Monitors

Inside `config/` folder there is a file called `monitors.yaml`. We will be adding our monitors here. Please note that your yaml must be valid. It is an array.

## A Simple GET Monitor

```yaml
- name: Google Search
  description: Search the world's information, including webpages, images, videos and more.
  tag: "google-search"
  image: "/google.png"
  method: GET
  url: https://www.google.com/webhp
```
---
title: Basic Setup
description: Learn how to set up Kener with a simple configuration
---

Once you have Kener running, you should now have a basic status page up and running. However, you may want to customize it further to fit your needs. In this section, we will go through some of the basic setup options available in Kener.

Most of the default settings are designed to work out of the box, but you can customize them by using the dashboard.

## Customize {#customize}

### Site Configuration {#site-configuration}

- **Site Name**: The name of your status page. This will be displayed in the header and title of the page.
- **Site URL**: The URL of your status page. This is used for sharing and linking to your status page.
- **Home Path**: The path to the home page of your status page. This is used for routing and navigation within your status page. By default, it is set to `/`, but you can change it to something else if you want.

> [!NOTE]
> If you are hosting site on a subpath, make sure to set the Home Path to the correct value. For example, if your site is hosted at `https://example.com/status`, then you should set the Home Path to `/status`.

> [!IMPORTANT]
> Setting up the Site URL correctly is very important for Kener to function properly.

## Add your first monitor (website) {#add-your-first-monitor-website}

Use this flow to add a simple HTTP/website monitor.

### Step 1: Create a new monitor {#create-new-monitor}

1. Open **Manage → Monitors**.
2. Click **New Monitor**.
3. In **General Settings**, set at least:
    - **Tag** (unique id, e.g. `homepage`)
    - **Name** (display name)
    - **Monitor Type** = API/Website monitor

### Step 2: Configure website check {#configure-website-check}

In **Configuration**, set your target URL and check interval/cron.

Example target URL:

```text
https://example.com
```

### Step 3: Make it visible on status page {#make-monitor-visible}

Open **Page Visibility** and add the monitor to at least one page.

> [!IMPORTANT]
> A monitor not added to any page will not appear on the public status page.

### Step 4: Verify {#verify-monitor}

1. Save the monitor.
2. Open **View** from the monitor page.
3. Confirm it appears and starts collecting checks.

For all API/website monitor options, see [API Monitors](/docs/v4/monitors/api).

---
title: Site Analytics | Kener
description: Add Google Analytics, Amplitude, Mixpanel etc to your Kener site
---

# Site Analytics

You can add Google Analytics, Amplitude, Mixpanel etc to your Kener site. In order to do this, you need to add the following configuration to your `site.yaml` file.

```yaml
analytics:
	- id: "G-QsFT"
	  type: "GA"
	- id: "deasf0d350"
	  type: "AMPLITUDE"
	- id: "FKOdsKener"
	  type: "MIXPANEL"
```

## Google Analytics

To add Google Analytics to your site, you need to add the following configuration to your `site.yaml` file.

```yaml
analytics:
	- id: "G-QsFT"
	  type: "GA"
```

`id` is the tracking ID of your Google Analytics account. You can find this in your Google Analytics account.

## Amplitude

To add Amplitude to your site, you need to add the following configuration to your `site.yaml` file.

```yaml
analytics:
	- id: "deasf0d350"
	  type: "AMPLITUDE"
```

`id` is the API key of your Amplitude account. You can find this in your Amplitude account.

## Mixpanel

To add Mixpanel to your site, you need to add the following configuration to your `site.yaml` file.

```yaml
analytics:
	- id: "FKOdsKener"
	  type: "MIXPANEL"
```

`id` is the token of your Mixpanel account. You can find this in your Mixpanel account.

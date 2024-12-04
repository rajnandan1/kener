---
title: Quick Start | Kener
description: Get started with Kener
---

# Quick Start

Please make sure you have [Node](https://nodejs.org/en) installed in your system. Minimum version required is `v16.17.0`.

## Clone the repository

```shell
git clone https://github.com/rajnandan1/kener.git
cd kener
```

## Install Dependencies

```shell
npm install
```

## Setup Configuration

-   Rename `config/site.example.yaml` -> `config/site.yaml`
-   Rename `config/monitors.example.yaml` -> `config/monitors.yaml`
-   Rename `config/server.example.yaml` -> `config/server.yaml`

```shell
cp config/site.example.yaml config/site.yaml
cp config/monitors.example.yaml config/monitors.yaml
cp config/server.example.yaml config/server.yaml
```

## Start Kener

```bash
npm run dev
```

Kener Development Server would be running at PORT 3000. Go to [http://localhost:3000](http://localhost:3000)

## Next Steps

-   [Configure Site](/docs/customize-site)
-   [Add Monitors](/docs/monitors)
-   [Alerting](/docs/alerting)

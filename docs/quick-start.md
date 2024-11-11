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

## Configs

-   Rename `config/site.example.yaml` -> `config/site.yaml`
-   Rename `config/monitors.example.yaml` -> `config/monitors.yaml`

```shell
mv src/lib/server/config/site.example.yaml src/lib/server/config/site.yaml
mv src/lib/server/config/monitors.example.yaml src/lib/server/config/monitors.yaml
```

## Start Kener Development Server

```bash
npm run dev
```

Kener Development Server would be running at PORT 3000. Go to [http://localhost:3000](http://localhost:3000)

# Quick Start

Kener has been tested from Node18. It should work with Node 16 and above. It uses [SvelteKit](https://kit.svelte.dev/) and [shadcn-svelte](https://www.shadcn-svelte.com/)

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
mv config/site.example.yaml config/site.yaml
mv config/monitors.example.yaml config/monitors.yaml
mkdir -p ./static/kener
```

## Start Kener Dev

```bash
npm run kener:dev
```

Kener Development Server would be running at PORT 5173. Go to [http://localhost:5173](http://localhost:5173)

![alt text](ss.png "SS")

## Concepts

Kener has two parts. One is a svelte app which you can find in the src folder and there are code for monitors which you would find in scripts folder. If you want to update the frontend application then you should modify the src folder.

## Folder structure

```shell
├── src (svelte frontend files)
├── static (things put here can be referenced directly example static/logo.png -> /logo.png)
├── scripts (nodejs server files)
├── prod.js(starts an express server, runs the scripts and serves the svelte site)
├── dev.js (starts the dev server)
```

## Environment Variable

#### PUBLIC_KENER_FOLDER (Required)

```shell
export PUBLIC_KENER_FOLDER=/path/to/a/directory
```

#### PORT

Defaults to 3000 if not specified

```shell
export PORT=4242
```

#### GH_TOKEN

A github token to read issues and create labels

```shell
export GH_TOKEN=your-github-token
```

#### API_TOKEN

To talk to kener apis you will need to set up a token. It uses Bearer Authorization

```shell
export API_TOKEN=sometoken
```

#### API_IP

While using API you can set this variable to accept request from a specific IP

```shell
export API_IP=127.0.0.1
```

#### MONITOR_YAML_PATH

```shell
export MONITOR_YAML_PATH=/your/path/monitors.yaml
```

#### SITE_YAML_PATH

```shell
export SITE_YAML_PATH=/your/path/site.yaml
```

#### KENER_BASE_PATH

By default kener runs on `/` but you can change it to `/status` or any other path.

-   Important: The base path should not have a trailing slash and should start with `/`
-   Important: This env variable should be present during both build and run time
-   If you are using docker you will have to do your own build and set this env variable during `docker build`

```shell
export KENER_BASE_PATH=/status
```

If you do not specify MONITOR_YAML_PATH or SITE_YAML_PATH it will take the values from /config/site.yaml and /config/monitor.yaml respectively

## Production Deployment

```shell
export NODE_ENV=production
npm i
npm run build
npm run serve
```

It also needs 2 yaml files to work

-   site.yaml: Contains information about the site
-   monitors.yaml: Contains your monitors and their related specifications

By default these are present in `config/`. However you can use different location either passing them as argument or having the path as enviorment variable

### Add as Enviroment variables

```shell
export MONITOR_YAML_PATH=/your/path/monitors.yaml
export SITE_YAML_PATH=/your/path/site.yaml
```

### Add as argument to prod.js

```shell
npm run serve -- --monitors /your/path/monitors.yaml --site /your/path/site.yaml
```

## Install using Docker

[Dockerhub](https://hub.docker.com/r/rajnandan1/kener)

```shell
docker.io/rajnandan1/kener:latest
```

[Github Packages](https://github.com/rajnandan1/kener/pkgs/container/kener)

```shell
ghcr.io/rajnandan1/kener:latest
```

You should mount a host directory to persist your configuration and expose the web port. Environmental variables [found above](#environment-variable) can be passed with `-e` An example `docker run` command:

Make sure you have a `/static` folder inside your config folder

```shell
docker run -d -v /path/on/host/config:/config -p 3000:3000 -e "GH_TOKEN=1234" rajnandan1/kener
```

Or use **Docker Compose** with the example [docker-compose.yaml](https://raw.githubusercontent.com/rajnandan1/kener/main/docker-compose.yml)

### Using PUID and PGID

If you are

-   running on a **linux host** (ie unraid) and
-   **not** using [rootless containers with Podman](https://developers.redhat.com/blog/2020/09/25/rootless-containers-with-podman-the-basics#why_podman_)

then you must set the [environmental variables **PUID** and **PGID**.](https://docs.linuxserver.io/general/understanding-puid-and-pgid) in the container in order for it to generate files/folders your normal user can interact it.

Run these commands from your terminal

-   `id -u` -- prints UID for **PUID**
-   `id -g` -- prints GID for **PGID**

Then add to your docker command like so:

```shell
docker run -d ... -e "PUID=1000" -e "PGID=1000" ... rajnandan1/kener
```

or substitute them in [docker-compose.yml](https://raw.githubusercontent.com/rajnandan1/kener/main/docker-compose.yml)

## Github Setup

Kener uses github for incident management. Issues created in github using certain tags go to kener as incidents.

### Step 1: Github Repository and Add to site.yaml

Create a Github Repository. It can be either public or private. After you have created a repository open `site.yaml` and add them like this

```yaml
github:
    owner: "username"
    repo: "repository"
```

### Step 2: Create Github Token

You can create either a classic token or personal access token

#### Creating Personal Access Token

-   Go to [Personal Access Token](https://github.com/settings/personal-access-tokens/new)
-   Token Name: kener
-   Expiration: Use custom to select a calendar date
-   Description: My Kener
-   Repository access: Check Only Selected Repositories. Select your github repository
-   Repository Permission: Select Issues Read Write
-   Click on generate token

### Creating Classic Token

-   Go to [Tokens](https://github.com/settings/tokens/new)
-   Note: kener
-   Expiration: No Expiration
-   Scopes: write:packages
-   Click on generate Token

Set the token as an environment variable

```shell
export GH_TOKEN=github_pat_11AD3ZA3Y0
```

---

# Modify Site

There is a folder called `/config`. Inside which there is a `site.yaml` file. You can modify this file to have your own branding.

```yaml
title: "Kener"
home: "/"
logo: "/logo.svg"
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

It can be set by modifying the `<html>` class in `src/app.html` file

### Dark Theme

```html
<!doctype html>
<html lang="en" class="dark dark:bg-background"></html>
```

### Light theme

```html
<!doctype html>
<html lang="en"></html>
```

Can be `light` or `dark`. Defaults to `light`

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

It can be set by modifying the `<head>` tag in `src/app.html` file.
Example add a png called `logo.png` file in `static/` and then

```html
...
<link rel="icon" href="/logo.png" />
...
```

## github

For incident kener uses github comments. Create an empty [github](https://github.com) repo and add them to `site.yaml`

```yaml
github:
    owner: "username"
    repo: "repository"
    incidentSince: 72
```

`incidentSince` is in hours. It means if an issue is created before 72 hours then kener would not honor it. Default is 24

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

## siteURL

You can set this to generate SiteMaps

```yaml
siteURL: https://kener.ing
```

Sitemaps urls will be `https://kener.ing/sitemap.xml`

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

## i18n

You can add translations to your site. By default it is set to `en`. Available translations are present in `locales/` folders in the root directory. You can add more translations by adding a new file in the `locales` folder.

### How to enable a translation

```yaml
i18n:
    defaultLocale: en
    locales:
        en: English
        hi: Hindi
```

-   defaultLocale: The default locale to be used. This will be the language used when a user visits the site for the first time. It is important to note that the default locale json file should be present in the locales folder.
-   locales: A list of locales that you want to enable. The key is the locale code and the value is the name of the language. The locale code should be the same as the json file name in the locales folder. `en` means `en.json` should be present in the locales folder.
-   Adding more than one locales will enable a dropdown in the navbar to select the language.
-   Selected languages are stored in cookies and will be used when the user visits the site again.
-   There is no auto detection of the language. The user has to manually select the language.

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

## Base Path

To set the base path of your kener instance you can set the `KENER_BASE_PATH` environment variable. This will be used to prefix all the routes in the application. The env variable should not have a trailing slash and should start with `/`

It should be present during both build and run time. If you are using docker you will have to do your own build and set this env variable during `docker build`

Please also adjust files in static folder by prefixing them with the base path. For example if you set `KENER_BASE_PATH=/status` then the logo should be `/status/logo.png`

## Custom Scripts

You can include any script in the `app.html` file like google analytics etc

## Custom CSS

You can add custom css in `static/kener.css`

---

# Add Monitors

Inside `config/` folder there is a file called `monitors.yaml`. We will be adding our monitors here. Please note that your yaml must be valid. It is an array.

## Understanding monitors

Each monitor runs at 1 minute interval by default. Monitor runs in below priorty order.

-   defaultStatus Data
-   API call Data overrides above data(if specified)
-   Pushed Status Data overrides API Data using [Kener Update Statue API](https://kener.ing/docs#h2update-status)
-   Manual Incident Data overrides Pushed Status Data

Sample

```yaml
- name: Google Search
  description: Search the world's information, including webpages, images, videos and more.
  tag: "google-search"
  image: "/google.png"
  cron: "* * * * *"
  defaultStatus: "UP"
  api:
	timeout: 4000
	method: POST
	url: https://www.google.com/webhp
	headers:
		Content-Type: application/json
	body: '{"order_amount":1,"order_currency":"INR"}'
	eval: |
		(function(statusCode, responseTime, responseDataBase64){
		const resp = JSON.parse(atob(responseDataBase64));
		return {
			status: statusCode == 200 ? 'UP':'DOWN',
			latency: responseTime,
		}
		})
```

| name                      | Required          | This will be shown in the UI to your users. Keep it short and unique                                                                                       |
| ------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name                      | Required + Unique | This will be shown in the UI to your users. Keep it short and unique                                                                                       |
| description               | Optional          | This will be show below your name                                                                                                                          |
| tag                       | Required + Unique | This is used to tag incidents created in Github using comments                                                                                             |
| image                     | Optional          | To show a logo before the name                                                                                                                             |
| cron                      | Optional          | Use cron expression to specify the interval to run the monitors. Defaults to `* * * * *` i.e every minute                                                  |
| api.timeout               | Optional          | timeout for the api in milliseconds. Default is 10000(10 secs)                                                                                             |
| api.method                | Optional          | HTTP Method                                                                                                                                                |
| api.url                   | Optional          | HTTP URL                                                                                                                                                   |
| api.headers               | Optional          | HTTP headers                                                                                                                                               |
| api.body                  | Optional          | HTTP Body as string                                                                                                                                        |
| api.eval                  | Optional          | Evaluator written in JS, to parse HTTP response and calculate uptime and latency                                                                           |
| defaultStatus             | Optional          | If no API is given this will be the default status. can be UP/DOWN/DEGRADED                                                                                |
| hidden                    | Optional          | If set to `true` will not show the monitor in the UI                                                                                                       |
| category                  | Optional          | Use this to group your monitors. Make sure you have defined category in `site.yaml` and use the `name` attribute here                                      |
| dayDegradedMinimumCount   | Optional          | Default is 1. It means minimum this number of count for the day to be classified as DEGRADED(Yellow Bar) in 90 day view. Has to be `number` greater than 0 |
| dayDownMinimumCount       | Optional          | Default is 1. It means minimum this number of count for the day to be classified as DOWN(Red Bar) in 90 day view. Has to be `number` greater than 0        |
| includeDegradedInDowntime | Optional          | By deafault uptime percentage is calculated as (UP+DEGRADED/UP+DEGRADED+DOWN). Setting it as `true` will change the calculation to (UP/UP+DEGRADED+DOWN)   |
| ping.hostsV4 | Optional          | Array of hosts / IP to monitor ping response. Either domain name or IP4 |
| ping.hostsV6 | Optional          | Array of hosts / IP to monitor ping response. Either domain name or IP6 |

## cron

Kener fills data every minute in UTC so if you give an expression that is not per minute, kener will backfill data using the latest status.
Example for `cron: "*/15 * * * *"`

-   First run at "2023-12-02T18:00:00.000Z" - Status DOWN
-   Second run at "2023-12-02T18:15:00.000Z" - Status UP

Kener will fill data from 18:01:00 to 18:14:00 as UP

## eval

This is a anonymous JS function, by default it looks like this.

> **_NOTE:_** The eval function should always return a json object. The json object can have only status(UP/DOWN/DEGRADED) and lantecy(number)
> `{status:"DEGRADED", latency: 200}`.

```js
(function (statusCode, responseTime, responseDataBase64) {
	let statusCodeShort = Math.floor(statusCode/100);
	let status = 'DOWN'
    if(statusCodeShort >=2 && statusCodeShort <= 3) {
        status = 'UP',
    }
	return {
		status: 'DOWN',
		latency: responseTime,
	}
})
```

-   `statusCode` **REQUIRED** is a number. It is the HTTP status code
-   `responseTime` **REQUIRED**is a number. It is the latency in milliseconds
-   `responseDataBase64` **REQUIRED** is a string. It is the base64 encoded response data. To use it you will have to decode it

```js
let decodedResp = atob(responseDataBase64);
//let jsonResp = JSON.parse(decodedResp)
```

---

# Monitor Examples

Here are some exhaustive examples for monitors

## A Simple GET Monitor

```yaml
- name: Google Search
  tag: "google-search"
  api:
  	method: GET
  	url: https://www.google.com/webhp
```

## A Monitor with HTML description

Use tailwind classes to style your description

```yaml
- name: Google Search
  tag: "google-search"
  description: "Hello <b>world</b>"
  api:
  	method: GET
  	url: https://www.google.com/webhp
```

## A GET Monitor with image

google.png is in the static folder

```yaml
- name: Google Search
  tag: "google-search"
  image: "/google.png"
  api:
  	method: GET
  	url: https://www.google.com/webhp
```

## Get Monitor 15 Minute

```yaml
- name: Google Search
  description: Search the world's information, including webpages, images, videos and more.
  tag: "google-search"
  cron: "*/15 * * * *"
  api:
  	method: GET
  	url: https://www.google.com/webhp
```

## POST Monitor With Body

```yaml
- name: Google Search
  description: Google Search
  tag: "google-search-post"
  api:
  	method: POST
  	url: https://www.google.com/webhp
  	headers:
    	Content-Type: application/json
  	body: '{"order_amount":22222.1,"order_currency":"INR"}'
```

## Secrets in Header

You can set ENV variables in your machine and use them in your monitors. Example below has `GH_TOKEN` as an environment variable. It uses process.env.GH_TOKEN.
`export GH_TOKEN=some.token.for.github`

> **_NOTE:_** DO NOT forget the `$` sign in your monitor secret, otherwise it will not be picked up.

```yaml
- name: Github Issues
  description: Github Issues Fetch
  tag: "gh-search-issue"
  api:
  	method: GET
  	url: https://api.github.com/repos/rajnandan1/kener/issues
  	headers:
		Authorization: Bearer $GH_TOKEN
```

## Secrets in Body

Assuming `ORDER_ID` is present in env

```yaml
- name: Github Issues
  description: Github Issues Fetch
  tag: "gh-search-issue"
  api:
  	method: POST
  	url: https://api.github.com/repos/rajnandan1/kener/issues
  	headers:
		Content-Type: application/json
  	body: '{"order_amount":22222.1,"order_currency":"INR", "order_id": "$ORDER_ID"}'
```

## Eval Body

Read more about [eval](https://kener.ing/docs#h2eval-body)

```yaml
- name: Github Issues
  description: Github Issues Fetch
  tag: "gh-search-issue"
  api:
  	method: GET
  	url: https://api.github.com/repos/rajnandan1/kener/issues
  	eval: |
		(function(statusCode, responseTime, responseDataBase64){
		const resp = JSON.parse(atob(responseDataBase64));
		let status = 'DOWN'
		if(statusCode == 200) status = 'UP';
		if(Object.keys(resp).length == 0) status = 'DOWN';
		if(statusCode == 200 && responseTime > 2000) status = 'DEGRADED';
		return {
			status: status,
			latency: responseTime,
		}
		})
```

## With defaultStatus UP

Each minute it will set the status as UP

```yaml
- name: Earth
  description: Our Planent
  tag: "earth"
  defaultStatus: UP
```

## With Category

Add this monitor to the API category instead of the default home category

```yaml
- name: Earth
  description: Our Planent
  tag: "earth"
  category: API
```

## Ping Monitor

Add this monitor to the API category instead of the default home category

```yaml
- name: Earth
  description: Our Planent
  tag: "earth"
  ping: 
    hostsV4: 
      - www.frogment.com
      - 52.84.205.24
    hostsV6:
      - ipv6.google.com
```

If both ping and api monitors are present then API data will overwrite ping data

## Custom Thresholds

Add this monitor to the API category instead of the default home category

```yaml
- name: Earth
  description: Our blue planet
  tag: "earth"
  defaultStatus: "UP"
  dayDegradedMinimumCount: 3
  dayDownMinimumCount: 2
  includeDegradedInDowntime: true
```

---

# Incident Management

Kener uses Github to power incident management using labels

## Labels

Kener auto creates labels for your monitors using the `tag` parameter

-   `incident`: If an issue is marked as incident it will show up in kener home page
-   `incident-down`: If an issue is marked as incident-down and incident kener would make that monitor down
-   `incident-degraded`: If an issue is marked as incident-degraded and incident then kener would make the monitor degraded
-   `resolved`: Use this tag to mark the incident has RESOLVED
-   `identified`: Use this tag to show that the root cause of the incident has been identified

## Creating your first incident

-   Go to your github repo of kener
-   Go to issues
-   Create an issue. Give it a title
-   In the body add [start_datetime:1702651340] and [end_datetime:1702651140] and add some description. Time is UTC
-   Add `incident`, `incident-down` and the monitor tag. This will make the monitor down for 4 minutes

Here is a [sample incident](https://github.com/rajnandan1/kener/issues/15) for your reference.

---

# API

Kener also gives APIs to push data and create incident. Before you use kener apis you will have to set an authorization token called `API_TOKEN`. This also has to be set as an environment variable.

```shell
export API_TOKEN=some-token-set-by-you
```

Additonally you can set IP whitelisting by setting another environment token called `API_IP`

```shell
export API_IP=127.0.0.1
```

## Update Status

The update status API can be used to manually update the state of a monitor from a remote server.

### Request Body

| Parameter          | Description                                                                          |
| ------------------ | ------------------------------------------------------------------------------------ |
| status             | `Required` Can be only UP/DOWN/DEGRADED                                              |
| latency            | `Required` In Seconds. Leave 0 if not required                                       |
| timestampInSeconds | `Optional` Timestamp in UTC seconds. Defaults to now. Should between 90 Days and now |
| tag                | `Required` Monitor Tag set in monitors.yaml                                          |

```shell
curl --request POST \
  --url http://your-kener.host/api/status \
  --header 'Authorization: Bearer some-token-set-by-you' \
  --header 'Content-Type: application/json' \
  --data '{
	"status": "DOWN",
	"latency": 1213,
	"timestampInSeconds": 1702405860,
	"tag": "google-search"
}'
```

### Response

```json
{
	"status": 200,
	"message": "success at 1702405860"
}
```

This will update the status of the monitor with tag `google-search` to DOWN at UTC 1702405860

## Get Status

Use this API to get the status of a monitor.

### Request

Replace `google-search` with your monitor tag in query param

```shell
curl --request GET \
  --url 'http://your-kener.host/api/status?tag=google-search' \
  --header 'Authorization: Bearer some-token-set-by-you'
```

### Response

```json
{
	"status": "UP",
	"uptime": "9.0026",
	"lastUpdatedAt": 1706447160
}
```

## Create an Incident

Can be use to create an incident from a remote server

### Request Body

| Parameter     | Description                                              |
| ------------- | -------------------------------------------------------- |
| startDatetime | `Optional` When did the incident start in UTC second     |
| endDatetime   | `Optional` When did the incident end in UTC seconds      |
| title         | `Required` Title of the incident                         |
| body          | `Optional` Body of the incident                          |
| tags          | `Required` Array of String, Monitor Tags of the incident |
| impact        | `Optional` Can be only DOWN/DEGRADED                     |
| isMaintenance | `Optional` Boolean if incident is a maintenance          |
| isIdentified  | `Optional` Incident identified                           |
| isResolved    | `Optional` Incident resolved                             |

```shell
curl --request POST \
  --url http://your-kener.host/api/incident \
  --header 'Authorization: Bearer some-token-set-by-you' \
  --header 'Content-Type: application/json' \
  --data '{
	"startDatetime": 1702405740,
	"endDatetime": 1702405920,
	"title": "Outage in Mumbai",
	"body": "Login cluster is down in mumbai region",
	"tags": ["google-search"],
	"impact": "DOWN",
	"isMaintenance": false,
	"isIdentified": true,
	"isResolved": false
}'
```

### Response

```json
{
	"createdAt": 1703940450,
	"closedAt": null,
	"title": "Outage in Mumbai",
	"tags": ["google-search"],
	"incidentNumber": 12,
	"startDatetime": 1702405740,
	"endDatetime": 1702405920,
	"body": "Login cluster is down in mumbai region",
	"impact": "DOWN",
	"isMaintenance": false,
	"isIdentified": true,
	"isResolved": false
}
```

## Update an Incident

Can be use to update an incident from a remote server. It will clear values if not passed

### Request Param

-   `incidentNumber`: Number of the incident

### Request Body

| Parameter     | Description                                              |
| ------------- | -------------------------------------------------------- |
| startDatetime | `Optional` When did the incident start in UTC second     |
| endDatetime   | `Optional` When did the incident end in UTC seconds      |
| title         | `Required` Title of the incident                         |
| body          | `Optional` Body of the incident                          |
| tags          | `Required` Array of String, Monitor Tags of the incident |
| impact        | `Optional` Can be only DOWN/DEGRADED                     |
| isMaintenance | `Optional` Boolean if incident is a maintenance          |
| isIdentified  | `Optional` Incident identified                           |
| isResolved    | `Optional` Incident resolved                             |

```shell
curl --request PATCH \
  --url http://your-kener.host/api/incident/{incidentNumber} \
  --header 'Authorization: Bearer some-token-set-by-you' \
  --header 'Content-Type: application/json' \
  --data '{
	"startDatetime": 1702405740,
	"endDatetime": 1702405920,
	"title": "Outage in Mumbai",
	"body": "Login cluster is down in mumbai region",
	"tags": ["google-search"],
	"impact": "DOWN",
	"isMaintenance": false,
	"isIdentified": true,
	"isResolved": false
}'
```

### Response

```json
{
	"createdAt": 1703940450,
	"closedAt": null,
	"title": "Outage in Mumbai",
	"tags": ["google-search"],
	"incidentNumber": 12,
	"startDatetime": 1702405740,
	"endDatetime": 1702405920,
	"body": "Login cluster is down in mumbai region",
	"impact": "DOWN",
	"isMaintenance": false,
	"isIdentified": true,
	"isResolved": false
}
```

## Get an Incident

Use `incidentNumber` to fetch an incident

### Request Body

```shell
curl --request GET \
  --url http://your-kener.host/api/incident/{incidentNumber} \
  --header 'Authorization: Bearer some-token-set-by-you' \
```

### Response

```json
{
	"createdAt": 1703940450,
	"closedAt": null,
	"title": "Outage in Mumbai",
	"tags": ["google-search"],
	"incidentNumber": 12,
	"startDatetime": 1702405740,
	"endDatetime": 1702405920,
	"body": "Login cluster is down in mumbai region",
	"impact": "DOWN",
	"isMaintenance": false,
	"isIdentified": true,
	"isResolved": false
}
```

## Add Comment

Add comments for incident using `incidentNumber`

### Request

```shell
curl --request POST \
  --url http://your-kener.host/api/incident/{incidentNumber}/comment \
  --header 'Authorization: Bearer some-token-set-by-you' \
  --header 'Content-Type: application/json' \
  --data '{
	"body": "comment 1"
}'
```

### Response

```json
{
	"commentID": 1873376745,
	"body": "comment 1",
	"createdAt": 1704123938
}
```

## Get Comments

Use this API to fetch all the comments for an incident

### Request

```shell
curl --request GET \
  --url http://your-kener.host/api/incident/{incidentNumber}/comment \
  --header 'Authorization: Bearer some-token-set-by-you' \
```

### Response

```json
[
	{
		"commentID": 1873372042,
		"body": "comment 1",
		"createdAt": 1704123116
	},
	{
		"commentID": 1873372169,
		"body": "comment 2",
		"createdAt": 1704123139
	}
]
```

## Update Incident Status

Use this to API to update the status of an ongoing incident.

### Request Body

| Parameter    | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| isIdentified | `Optional` Boolean, set it when incident has been identified |
| isResolved   | `Optional` Boolean, set it when incident has been resolved   |
| endDatetime  | `Optional` When did the incident end in UTC seconds          |

### Request

```shell
curl --request POST \
  --url http://your-kener.host/api/incident/{incidentNumber}/status \
  --header 'Authorization: Bearer some-token-set-by-you' \
  --header 'Content-Type: application/json' \
  --data '{
	"isIdentified": true,
	"isResolved": false
	"endDatetime": 1702405920
}'
```

### Response

```json
{
	"createdAt": 1703940450,
	"closedAt": null,
	"title": "Outage in Mumbai",
	"tags": ["google-search"],
	"incidentNumber": 12,
	"startDatetime": 1702405740,
	"endDatetime": 1702405920,
	"body": "Login cluster is down in mumbai region",
	"impact": "DOWN",
	"isMaintenance": false,
	"isIdentified": true,
	"isResolved": false
}
```

## Search Incidents

Use this to API to search incidents.

### Request Body

| Parameter          | Description                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| state              | `Optional` open or closed. Default is open                                                     |
| tags               | `Optional` Comma separated monitor tags, example: earth,google-seach                           |
| page               | `Optional` Page number, starts with 1, defaults to 1                                           |
| per_page           | `Optional` Page size, defaults to 10, max is 100                                               |
| created_after_utc  | `Optional` timestamp in UTC seconds when the incident was created after. Example: 1702405920   |
| created_before_utc | `Optional` timestamp in UTC seconds when the incident was created before . Example: 1702405920 |
| title_like         | `Optional` search incidents with title                                                         |

### Request

Search incidents that are closed and title contains `hello incident`

```shell
curl --request POST \
  --url http://your-kener.host/api/incident?state=closed&title_like=Hello%20Incident \
  --header 'Authorization: Bearer some-token-set-by-you' \
  --header 'Content-Type: application/json' \
  --data '{
	"isIdentified": true,
	"isResolved": false
	"endDatetime": 1702405920
}'
```

### Response

```json
[
	{
		"createdAt": 1703940450,
		"closedAt": null,
		"title": "Outage in Mumbai - Hello Incident",
		"tags": ["google-search"],
		"incidentNumber": 12,
		"startDatetime": 1702405740,
		"endDatetime": 1702405920,
		"body": "Login cluster is down in mumbai region",
		"impact": "DOWN",
		"isMaintenance": false,
		"isIdentified": true,
		"isResolved": false
	}
]
```

---

# Badge

There are two types of badges

Syntax

```md
http://[hostname]/badge/[tag]/status
http://[hostname]/badge/[tag]/uptime
```

## Status

Shows the last health check was UP/DOWN/DEGRADED

![Earth Status](https://kener.ing/badge/earth/status)

Example in HTML

```html
<img src="https://kener.ing/badge/earth/status" />
```

Example in MarkDown

```md
![Status Badge](https://kener.ing/badge/[monitor.tag]/status)
```

## Uptime

Shows the 90 Day uptime by default. You can `sinceLast` as query param to get uptime since last x seconds.

![Earth Uptime](https://kener.ing/badge/earth/uptime)

### 90 Day Uptime

Example in HTML

```html
<img src="https://kener.ing/badge/earth/uptime" />
```

Example in MarkDown

```md
![Uptime Badge](https://kener.ing/badge/[monitor.tag]/uptime)
```

### 15 Minute Uptime

Example in HTML

```html
<img src="https://kener.ing/badge/earth/uptime?sinceLast=900" />
```

Example in MarkDown

```md
![Uptime Badge](https://kener.ing/badge/[monitor.tag]/uptime?sinceLast=900)
```

## Customize Badges

You can set different colors for badges and style.

### With Custom Label Color

![Earth Status](https://kener.ing/badge/earth/status?labelColor=F2BED1)

```md
![Earth Status](https://kener.ing/badge/earth/status?labelColor=F2BED1)
```

### With Custom Value Color

![Earth Status](https://kener.ing/badge/earth/status?color=FFC0D9)

```md
![Earth Status](https://kener.ing/badge/earth/status?color=FFC0D9)
```

### With Both Different Colors

![Earth Status](https://kener.ing/badge/earth/uptime?color=D0BFFF&labelColor=FFF3DA)

```md
![Earth Status](https://kener.ing/badge/earth/uptime?color=D0BFFF&labelColor=FFF3DA)
```

### Style Of the Badge

You can change the style of the badge. Supported Styles are `plastic`, `flat`, `flat-square`, `for-the-badge` or `social`. Default is `flat`

#### plastic

![Earth Uptime](https://kener.ing/badge/earth/uptime?style=plastic)

```md
![Earth Uptime](https://kener.ing/badge/earth/uptime?style=plastic)
```

#### flat

![Earth Uptime](https://kener.ing/badge/earth/uptime?style=flat)

```md
![Earth Uptime](https://kener.ing/badge/earth/uptime?style=flat)
```

#### flat-square

![Earth Uptime](https://kener.ing/badge/earth/uptime?style=flat-square)

```md
![Earth Uptime](https://kener.ing/badge/earth/uptime?style=flat-square)
```

#### for-the-badge

![Earth Uptime](https://kener.ing/badge/earth/uptime?style=for-the-badge)

```md
![Earth Uptime](https://kener.ing/badge/earth/uptime?style=for-the-badge)
```

#### social

![Earth Uptime](https://kener.ing/badge/earth/uptime?style=social)

```md
![Earth Uptime](https://kener.ing/badge/earth/uptime?style=social)
```

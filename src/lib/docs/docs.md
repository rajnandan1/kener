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
npm run kener:dev
```
Kener would be running at PORT 3000. Go to [http://localhost:3000](http://localhost:3000)

![alt text](ss.png "SS")
## Folder structure

```
├── src (svelte frontend files)
├── static (things put here can be referenced directly example static/logo.png -> /logo.png)
├── scripts (nodejs server files)
├── config
│   ├── site.yaml (to personalize your kener instance)
│   ├── monitors.yaml (to add monitors)

```

## Production Deployment
Once you have added the `config/site.yaml` or `config/monitors.yaml` or changed anything in `src/`
```shell
npm i
npm run kener:build
npm run kener
```



## Custom Deployment
Kener should be run using `prod.js` script. It needs two environment variables `PUBLIC_KENER_FOLDER=./build/client/kener` and `tz=UTC`

```shell
export PUBLIC_KENER_FOLDER=./build/client/kener
export tz=UTC
node prod.js
``` 
- 
---
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
---
# Add Monitors

Inside `config/` folder there is a file called `monitors.yaml`. We will be adding our monitors here. Please note that your yaml must be valid. It is an array.

Sample

```yaml
- name: Google Search
  description: Search the world's information, including webpages, images, videos and more.
  tag: "google-search"
  image: "/google.png"
  cron: "* * * * *"
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

| Parameter Name        | Usage          | Description                                      |
| ----------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| name        | Required + Unique | This will be shown in the UI to your users. Keep it short and unique                                      |
| description | Optional          | This will be show below your name                                                                         |
| tag         | Required + Unique | This is used to tag incidents created in Github using comments                                            |
| image       | Optional          | To show a logo before the name                                                                            |
| cron        | Optional           | Use cron expression to specify the interval to run the monitors. Defaults to `* * * * *` i.e every minute |
| method      | Optional          | HTTP Method                                                                                               |
| url         | Optional          | HTTP URL                                                                                                  |
| headers     | Optional          | HTTP headers                                                                                              |
| body        | Optional          | HTTP Body as string                                                                                       |
| eval        | Optional          | Evaluator written in JS, to parse HTTP response and calculate uptime and latency                                                                                                          |

## cron

Kener fills data every minute in UTC so if you give an expression that is not per minute, kener will backfill data using the latest status.
Example for `cron: "*/15 * * * *"` 
- First run at "2023-12-02T18:00:00.000Z" - Status DOWN
- Second run at "2023-12-02T18:15:00.000Z" - Status UP

Kener will fill data from 18:01:00 to 18:14:00 as UP

## eval

This is a anonymous JS function, by default it looks like this. 
> **_NOTE:_**  The eval function should always return a json object. The json object can have only status(UP/DOWN/DEGRADED) and lantecy(number)
`{status:"DEGRADED", latency: 200}`. 
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
- `statusCode` **REQUIRED** is a number. It is the HTTP status code
- `responseTime` **REQUIRED**is a number. It is the latency in milliseconds
- `responseDataBase64` **REQUIRED** is a string. It is the base64 encoded response data. To use it you will have to decode it 

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
  method: GET
  url: https://www.google.com/webhp
```
## A GET Monitor with image
google.png is in the static folder
```yaml
- name: Google Search
  tag: "google-search"
  method: GET
  image: "/google.png"
  url: https://www.google.com/webhp
```

## Get Monitor 15 Minute

```yaml
- name: Google Search
  description: Search the world's information, including webpages, images, videos and more.
  tag: "google-search"
  cron: "*/15 * * * *"
  method: GET
  url: https://www.google.com/webhp
```

## Post Monitor With Body
```yaml
- name: Google Search
  description: Google Search
  tag: "google-search-post"
  method: POST
  url: https://www.google.com/webhp
  headers:
    Content-Type: application/json
  body: '{"order_amount":22222.1,"order_currency":"INR"}'
```

## Secrets in Header

You can set ENV variables in your machine and use them in your monitors. Example below has `GH_TOKEN` as an environment variable. It uses process.env.GH_TOKEN. 
`export GH_TOKEN=some.token.for.github`
> **_NOTE:_**  DO NOT forget the `$` sign in your monitor
```yaml
- name: Github Issues
  description: Github Issues Fetch
  tag: "gh-search-issue"
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
  method: POST
  url: https://api.github.com/repos/rajnandan1/kener/issues
  headers:
	Content-Type: application/json
  body: '{"order_amount":22222.1,"order_currency":"INR", "order_id": "$ORDER_ID"}'	
```

## Eval Body

```yaml
- name: Github Issues
  description: Github Issues Fetch
  tag: "gh-search-issue"
  method: GET
  url: https://api.github.com/repos/rajnandan1/kener/issues
  eval: |
    (function(statusCode, responseTime, responseDataBase64){
      const resp = JSON.parse(atob(responseDataBase64));
	  let status = 'DOWN'
	  if(statusCode == 200) status = 'UP';
	  if(resp.length == 0) status = 'DOWN';
	  if(statusCode == 200 && responseTime > 2000) status = 'DEGRADED';
      return {
        status: status,
        latency: responseTime,
      }
    })
```
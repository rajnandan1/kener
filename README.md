
<p align="center">
	<img src="https://kener.ing/ss.png" width="100%" height="auto" alt="kener example illustration">
</p>
 

<p align="center">
	<img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/rajnandan1/kener?label=Star%20Repo&style=social">
	<a href="https://github.com/ivbeg/awesome-status-pages"><img src="https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg" alt="Awesome status page" /></a>
</p>

#### 👉 Visit a live server [here](https://kener.ing)

#### 👉 Read the documentation [here](https://kener.ing/docs) 

# Kener - Status Page System
Kener: Open-source Node.js status page tool, designed to make service monitoring and incident handling a breeze. It offers a sleek and user-friendly interface that simplifies tracking service outages and improves how we communicate during incidents. And the best part? Kener integrates seamlessly with GitHub, making incident management a team effort—making it easier for us to track and fix issues together in a collaborative and friendly environment.

It uses files to store the data. Other adapters are coming soon
  

## Features

**Monitoring and Tracking:**
- Real-time monitoring
- Polls HTTP endpoint or Push data to monitor using Rest APIs
- Handles Timezones for visitors
- Categorize Monitors into different Sections
- Cron-based scheduling for monitors. Minimum per minute
- Flexible monitor configuration using YAML. Define your own parsing for monitor being UP/DOWN/DEGRADED
- Construct complex API Polls - Chain, Secrets etc
- Supports a Default Status for Monitors. Example defaultStatus=DOWN if you dont hit API per minute with Status UP

**Customization and Branding:**
- Customizable status page using yaml or code
- Badge generation for status and uptime of Monitors
- Support for custom domains
- Embed Monitor as an iframe or widget
- Light + Dark Theme

**Incident Management:**
- Create Incidents using Github Issues - Rich Text
- Or use APIs to create Incidents

**User Experience and Design:**
- 100% Accessibility Score
- Easy installation and setup
- User-friendly interface
- Responsive design for various devices
- Auto SEO and Social Media ready



## Technologies used
- [SvelteKit](https://kit.svelte.dev/)
- [shadcn-svelte](https://www.shadcn-svelte.com/)

## Inspired from 
- [Upptime](https://upptime.js.org/)

## Roadmap

- [x] Add api to create incident
- [x] Add docker file
- [ ] Add notification
- [ ] Add Mysql adapter

## Screenshots

![image](static/marken_90.png)
![image](static/marken_api.png)
![image](static/marken_badge.png)
![image](static/marken_embed.png)
![image](static/marken_inci.png)
![image](static/marken_share.png)
![image](static/marken_td.png)
![image](static/marken_tl.png)
![image](static/marken_theme.png)


## Support

<a href="https://stackexchange.com/users/3713933"><img src="https://stackexchange.com/users/flair/3713933.png" width="108" height="28" alt="profile for Raj Nandan Sharma on Stack Exchange, a network of free, community-driven Q&amp;A sites" title="profile for Raj Nandan Sharma on Stack Exchange, a network of free, community-driven Q&amp;A sites"></a>

<a href="https://www.buymeacoffee.com/rajnandan1"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=rajnandan1&button_colour=5F7FFF&font_colour=ffffff&font_family=Poppins&outline_colour=000000&coffee_colour=FFDD00" /></a>

<a href="https://www.paypal.com/paypalme/rajnandan1"><img style="height:90px;margin-left:-15px" src="static/paypal.png" /></a>



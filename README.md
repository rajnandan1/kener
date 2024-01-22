
<p align="center"><img src="https://kener.ing/ss.png" width="100%" height="auto" alt="kener example illustration"></p>

<style>
.carousel {
  display: flex;
  overflow: hidden;
}

.slide {
  flex: 0 0 100%;
  transition: transform 0.5s ease;
}

.carousel input[type="radio"] {
  display: none;
}

.carousel input[type="radio"]:checked ~ .slides .slide {
  transform: translateX(-100%);
}
</style>

<div class="carousel">
  <input type="radio" name="carousel" id="slide1" checked>
  <input type="radio" name="carousel" id="slide2">
  <input type="radio" name="carousel" id="slide3">
  
  <div class="slides">
    <div class="slide">
      <h2>Slide 1</h2>
      <p>This is the content of slide 1.</p>
    </div>
    
    <div class="slide">
      <h2>Slide 2</h2>
      <p>This is the content of slide 2.</p>
    </div>
    
    <div class="slide">
      <h2>Slide 3</h2>
      <p>This is the content of slide 3.</p>
    </div>
  </div>
</div>


<p align="center">
	<img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/rajnandan1/kener?label=Star%20Repo&style=social">
	<a href="https://github.com/ivbeg/awesome-status-pages"><img src="https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg" alt="Awesome status page" /></a>
</p>

#### 👉 Visit a live server [here](https://kener.ing)

#### 👉 Read the documentation [here](https://kener.ing/docs) 

# Kener - Status Page System
Kener: Open-source Node.js status page tool, designed to make service monitoring and incident handling a breeze. It offers a sleek and user-friendly interface that simplifies tracking service outages and improves how we communicate during incidents. And the best part? Kener integrates seamlessly with GitHub, making incident management a team effort—making it easier for us to track and fix issues together in a collaborative and friendly environment.

It uses files to store the data. Other adapters are coming soon



![alt text](static/ss.png "SS")

## Features

- Real-time monitoring
- Handles Timezones without you knowing it
- Customizable status page
- 100% Accessiblty Score
- Easy installation and setup
- Automated incident management
- GitHub integration for issue tracking
- Environment variable configuration
- Production and custom deployment options
- API for status updates
- Badge generation for status and uptime display + Customization
- Support for custom domains
- Embed as an iframe or widget
- Categories for monitors
- Branding and theme (light + dark) customization
- Flexible monitor configuration using YAML
- Cron-based scheduling for monitors
- Secrets management for headers and bodies
- Evaluators for HTTP response parsing
- Incident tagging and labeling
- User-friendly interface
- Support for light and dark themes
- Responsive design for various devices
- Auto SEO and Social Media ready


## Technologies used
- [SvelteKit](https://kit.svelte.dev/)
- [shadcn-svelte](https://www.shadcn-svelte.com/)

## Inspired from 
- [Upptime](https://upptime.js.org/)

## Roadmap
- [ ] Add notification
- [x] Add api to create incident
- [ ] Add Mysql adapter

## Support

<a href="https://stackexchange.com/users/3713933"><img src="https://stackexchange.com/users/flair/3713933.png" width="208" height="58" alt="profile for Raj Nandan Sharma on Stack Exchange, a network of free, community-driven Q&amp;A sites" title="profile for Raj Nandan Sharma on Stack Exchange, a network of free, community-driven Q&amp;A sites"></a>

<a href="https://www.buymeacoffee.com/app/rajnandan1"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=rajnandan1&button_colour=5F7FFF&font_colour=ffffff&font_family=Poppins&outline_colour=000000&coffee_colour=FFDD00" /></a>

<a href="hhttps://www.paypal.com/paypalme/rajnandan1"><img style="height:90px;margin-left:-15px" src="static/paypal.png" /></a>



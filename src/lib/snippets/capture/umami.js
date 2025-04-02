/**
 * ***************************************************
 * *                                                 *
 * *      Umami Analytics Capture Snippet         *
 * *                                                 *
 * ***************************************************
 **/
// @ts-nocheck

(function () {
  let loadJS = function (url, implementationCode, location) {
    //url is URL of external file, implementationCode is the code
    //to be called from the file, location is the location to
    //insert the <script> element

    let scriptTag = document.createElement("script");
    scriptTag.src = url;

    scriptTag.onload = implementationCode;
    scriptTag.dataset.websiteId = "{{website_id}}";
    scriptTag.onreadystatechange = implementationCode;

    location.appendChild(scriptTag);
  };
  let initJS = function () {
    window.addEventListener("analyticsEvent", function (e) {
      // Extract event name and data from the custom event
      const eventName = e.detail.event;
      const eventData = e.detail.data || {};
      window.umami.track(eventName, eventData);
    });
  };

  //on dom ready
  document.addEventListener("DOMContentLoaded", function () {
    loadJS("https://cloud.umami.is/script.js", initJS, document.getElementsByTagName("head")[0]);
  });
})();

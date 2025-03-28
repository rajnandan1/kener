/**
 * ***************************************************
 * *                                                 *
 * *      Google Analytics Capture Snippet         *
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
    scriptTag.onreadystatechange = implementationCode;

    location.appendChild(scriptTag);
  };
  let initJS = function () {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    gtag("js", new Date());

    gtag("config", "{{id}}");

    window.addEventListener("analyticsEvent", function (e) {
      // Extract event name and data from the custom event
      const eventName = e.detail.event;
      const eventData = e.detail.data || {};
      // Send the event to Google Tag Manager
      if (window.dataLayer && eventName) {
        gtag("event", eventName, eventData);
      }
    });
  };

  //on dom ready
  document.addEventListener("DOMContentLoaded", function () {
    loadJS("https://www.googletagmanager.com/gtag/js?id={{id}}", initJS, document.getElementsByTagName("head")[0]);
  });
})();

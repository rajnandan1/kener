// @ts-nocheck
/**
 * ***************************************************
 * *                                                 *
 * *      Google Analytics Capture Snippet         *
 * *                                                 *
 * ***************************************************
 **/

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

    var gtagConfig = {};
    var transportUrl = "{{transport_url}}";
    if (!!transportUrl) {
      gtagConfig.transport_url = transportUrl;
    }
    gtag("config", "{{id}}", gtagConfig);

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
    var scriptHost = "{{script_host}}" || "https://www.googletagmanager.com";
    loadJS(scriptHost + "/gtag/js?id={{id}}", initJS, document.getElementsByTagName("head")[0]);
  });
})();

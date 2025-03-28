/**
 * ***************************************************
 * *                                                 *
 * *      Plausible Analytics Capture Snippet         *
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
    scriptTag.defer = true;
    scriptTag.dataset.domain = "{{domain}}";
    scriptTag.dataset.api = "{{api}}";
    scriptTag.onload = implementationCode;
    scriptTag.onreadystatechange = implementationCode;

    location.appendChild(scriptTag);
  };
  let initJS = function () {
    window.plausible =
      window.plausible ||
      function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
      };

    window.addEventListener("analyticsEvent", function (e) {
      // Extract event name and data from the custom event
      const eventName = e.detail.event;
      const eventData = e.detail.data || {};
      if (eventName) {
        window.plausible(eventName, { props: eventData });
      }
    });
  };

  //on dom ready
  document.addEventListener("DOMContentLoaded", function () {
    loadJS("{{script_src}}", initJS, document.getElementsByTagName("head")[0]);
  });
})();

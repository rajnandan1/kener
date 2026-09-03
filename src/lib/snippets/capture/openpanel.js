// @ts-nocheck

/**
 * ***************************************************
 * *                                                 *
 * *      OpenPanel Analytics Capture Snippet        *
 * *                                                 *
 * ***************************************************
 **/

(function () {
  // Queue stub from https://openpanel.dev/docs/sdks/script: buffers op() calls until op1.js loads and drains window.op.q.
  window.op =
    window.op ||
    (function () {
      var n = [];
      return new Proxy(
        function () {
          arguments.length && n.push([].slice.call(arguments));
        },
        {
          get: function (t, r) {
            return "q" === r
              ? n
              : function () {
                  n.push([r].concat([].slice.call(arguments)));
                };
          },
          has: function (t, r) {
            return "q" === r;
          },
        },
      );
    })();

  window.op("init", {
    clientId: "{{client_id}}",
    apiUrl: "{{api_url}}",
    trackScreenViews: true,
    trackOutgoingLinks: true,
    trackAttributes: true,
  });

  window.addEventListener("analyticsEvent", function (e) {
    const eventName = e.detail.event;
    const eventData = e.detail.data || {};
    if (eventName) {
      window.op("track", eventName, eventData);
    }
  });

  var scriptTag = document.createElement("script");
  scriptTag.src = "{{script_url}}";
  document.head.appendChild(scriptTag);
})();

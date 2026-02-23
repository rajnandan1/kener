<script lang="ts">
  import { onMount, onDestroy, beforeUpdate } from "svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let monitor: string;
  export let theme: string = "light";
  export let bgc: string = "transparent";
  export let locale: string = "en";

  interface MessageData {
    height?: string;
    width?: string;
  }

  let iframe: HTMLIFrameElement | null = null;
  let listeners: ((event: MessageEvent<MessageData>) => void) | null = null;
  let containerId = `embed-container-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  let isMounted = false;
  let prevMonitor: string | undefined;
  let prevTheme: string | undefined;
  let prevBgc: string | undefined;
  let prevLocale: string | undefined;

  onMount(() => {
    if (!monitor) return;

    isMounted = true;
    prevMonitor = monitor;
    prevTheme = theme;
    prevBgc = bgc;
    prevLocale = locale;

    const container = document.getElementById(containerId);
    if (!container) return;

    const uid = "KENER_" + ~~(new Date().getTime() / 86400000);
    const uriEmbedded = `${monitor}?theme=${theme}&bgc=${bgc}&locale=${locale}`;

    iframe = document.createElement("iframe");
    iframe.src = uriEmbedded;
    iframe.id = uid;
    iframe.width = "0%";
    iframe.height = "0";
    iframe.frameBorder = "0";
    (iframe as HTMLIFrameElement & { allowTransparency: boolean }).allowTransparency = true;
    iframe.sandbox.add(
      "allow-modals",
      "allow-forms",
      "allow-same-origin",
      "allow-scripts",
      "allow-popups",
      "allow-top-navigation-by-user-activation",
      "allow-downloads"
    );
    iframe.allow = "midi; geolocation; microphone; camera; display-capture; encrypted-media;";

    container.appendChild(iframe);

    const setHeight = (data: MessageData) => {
      if (data.height !== undefined && iframe) {
        iframe.height = data.height;
      }
    };

    const setWidth = (data: MessageData) => {
      if (data.width !== undefined && iframe) {
        iframe.width = data.width;
      }
    };

    listeners = (event: MessageEvent<MessageData>) => {
      if (event.data && event.data.height !== undefined) {
        setHeight(event.data);
      }
      if (event.data && event.data.width !== undefined) {
        setWidth(event.data);
      }
    };

    window.addEventListener("message", listeners, false);
  });

  beforeUpdate(() => {
    if (
      isMounted &&
      iframe &&
      (monitor !== prevMonitor || theme !== prevTheme || bgc !== prevBgc || locale !== prevLocale)
    ) {
      iframe.src = `${monitor}?theme=${theme}&bgc=${bgc}&locale=${locale}`;

      // Update previous values
      prevMonitor = monitor;
      prevTheme = theme;
      prevBgc = bgc;
      prevLocale = locale;
      dispatch("update", {
        monitor: prevMonitor,
        theme: prevTheme,
        bgc: prevBgc,
        locale: prevLocale
      });
    }
  });

  onDestroy(() => {
    if (iframe && listeners) {
      window.removeEventListener("message", listeners);
      iframe.remove();
    }
  });
</script>

<!-- Dynamic container with unique ID -->
<div id={containerId}></div>

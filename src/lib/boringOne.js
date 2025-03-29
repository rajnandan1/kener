// @ts-ignore
export const analyticsEvent = (event, data) => {
  // Do something with the event and data

  if (typeof document !== "undefined") {
    event = "kener_" + event;
    document.dispatchEvent(
      new CustomEvent("analyticsEvent", {
        bubbles: true,
        detail: {
          event,
          data,
        },
      }),
    );
  }
};

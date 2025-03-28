// @ts-ignore
export const analyticsEvent = (event, data) => {
  // Do something with the event and data
  event = "kener:" + event;
  if (typeof document !== "undefined") {
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

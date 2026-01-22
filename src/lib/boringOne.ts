export interface AnalyticsEventDetail {
  event: string;
  data: unknown;
}

export const analyticsEvent = (event: string, data: unknown): void => {
  // Do something with the event and data

  if (typeof document !== "undefined") {
    event = "kener_" + event;
    document.dispatchEvent(
      new CustomEvent<AnalyticsEventDetail>("analyticsEvent", {
        bubbles: true,
        detail: {
          event,
          data,
        },
      }),
    );
  }
};

export interface AnalyticsEventDetail {
  event: string;
  data: unknown;
}

const analyticsEvent = (event: string, data: unknown): void => {
  //log event data
  // console.log("Analytics Event:", event, data);

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
export default analyticsEvent;

// @ts-ignore
export const analyticsEvent = (event, data) => {
	// Do something with the event and data
	document.dispatchEvent(
		new CustomEvent("analyticsEvent", {
			bubbles: true,
			detail: {
				event,
				data
			}
		})
	);
};

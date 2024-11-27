// @ts-nocheck
class Slack {
	url;
	headers;
	method;
	siteData;
	monitorData;

	constructor(url, siteData, monitorData) {
		const kenerHeader = {
			"Content-Type": "application/json",
			"User-Agent": "Kener"
		};

		this.url = url;
		this.headers = Object.assign(kenerHeader, {});
		this.method = "POST";
		this.siteData = siteData;
		this.monitorData = monitorData;
	}

	transformData(alert) {
		return {
			blocks: [
				{
					type: "header",
					text: {
						type: "plain_text",
						text: alert.alert_name,
						emoji: true
					}
				},
				{
					type: "header",
					text: {
						type: "plain_text",
						text: alert.status === "TRIGGERED" ? "🔴 Triggered" : "🟢 Resolved",
						emoji: true
					}
				},
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: `${alert.description}\n*Source:* ${alert.source}\n*Severity:* ${alert.severity}\n*Status:* ${alert.status}`
					}
				},
				{
					type: "section",
					fields: [
						{
							type: "mrkdwn",
							text: `*Metric:*\n${alert.details.metric}`
						},
						{
							type: "mrkdwn",
							text: `*Current Value:*\n${alert.details.current_value}`
						},
						{
							type: "mrkdwn",
							text: `*Threshold:*\n${alert.details.threshold}`
						},
						{
							type: "mrkdwn",
							text: `*Timestamp:*\n<!date^${Math.floor(new Date(alert.timestamp).getTime() / 1000)}^{date} at {time}|${alert.timestamp}>`
						}
					]
				},
				{
					type: "actions",
					elements: alert.actions.map((action) => ({
						type: "button",
						text: {
							type: "plain_text",
							text: action.text
						},
						url: action.url,
						style: "primary"
					}))
				}
			]
		};
	}

	async send(data) {
		try {
			const response = await fetch(this.url, {
				method: this.method,
				headers: this.headers,
				body: JSON.stringify(this.transformData(data))
			});
			return response;
		} catch (error) {
			console.error("Error sending webhook", error);
			return error;
		}
	}
}

export default Slack;

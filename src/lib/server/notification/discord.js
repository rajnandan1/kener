// @ts-nocheck
class Discord {
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

	transformData(data) {
		let siteURL = this.siteData.siteURL;
		let logo = this.siteData.logo;

		let color = 13250616; //down;
		if (data.severity === "warning") {
			color = 15125089;
		}
		if (data.status === "RESOLVED") {
			color = 5156244;
		}
		return {
			username: this.siteData.siteName,
			avatar_url: logo,
			content: `## ${data.alert_name}\n${data.status === "TRIGGERED" ? "🔴 Triggered" : "🟢 Resolved"}\n${data.description}\nClick [here](${data.actions[0].url}) for more.`,
			embeds: [
				{
					title: data.alert_name,
					description: data.description,
					url: data.actions[0].url,
					color: color,
					fields: [
						{
							name: "Monitor",
							value: data.details.metric,
							inline: false
						},
						{
							name: "Alert ID",
							value: data.id,
							inline: false
						},
						{
							name: "Current Value",
							value: data.details.current_value,
							inline: true
						},
						{
							name: "Threshold",
							value: data.details.threshold,
							inline: true
						}
					],
					footer: {
						text: "Kener",
						icon_url: logo
					},
					timestamp: data.timestamp
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

export default Discord;

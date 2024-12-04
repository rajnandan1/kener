// @ts-nocheck
import Webhook from "./webhook.js";
import Discord from "./discord.js";
import Slack from "./slack.js";

class Notification {
	client;

	constructor(config, siteData, monitorData) {
		if (config.type === "webhook") {
			this.client = new Webhook(
				config.url,
				config.headers,
				config.method,
				siteData,
				monitorData
			);
		} else if (config.type === "discord") {
			this.client = new Discord(config.url, siteData, monitorData);
		} else if (config.type === "slack") {
			this.client = new Slack(config.url, siteData, monitorData);
		} else {
			console.log("Invalid Notification");
			process.exit(1);
		}
	}

	async send(data) {
		return await this.client.send(data);
	}
}
export default Notification;

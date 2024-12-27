// @ts-nocheck
import Webhook from "./webhook.js";
import Discord from "./discord.js";
import Slack from "./slack.js";
import Email from "./email.js";

class Notification {
	client;

	constructor(trigger, siteData, monitorData) {
		let triggerMeta = JSON.parse(trigger.triggerMeta);
		if (trigger.triggerType === "webhook") {
			this.client = new Webhook(
				triggerMeta.url,
				triggerMeta.headers,
				"POST",
				siteData,
				monitorData
			);
		} else if (trigger.triggerType === "discord") {
			this.client = new Discord(triggerMeta.url, siteData, monitorData);
		} else if (trigger.triggerType === "slack") {
			this.client = new Slack(triggerMeta.url, siteData, monitorData);
		} else if (trigger.triggerType === "email") {
			this.client = new Email(triggerMeta, siteData, monitorData);
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

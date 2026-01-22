import Webhook from "./webhook.js";
import Discord from "./discord.js";
import Slack from "./slack.js";
import Email from "./email.js";
import type { SiteDataForNotification, AlertData } from "./variables.js";
import type { TriggerRecord, MonitorRecord } from "../types/db.js";

type NotificationClient = Webhook | Discord | Slack | Email;

class Notification {
  client: NotificationClient;

  constructor(trigger: TriggerRecord, siteData: SiteDataForNotification, monitor?: MonitorRecord) {
    let trigger_meta = JSON.parse(trigger.trigger_meta);
    if (trigger.trigger_type === "webhook") {
      this.client = new Webhook(trigger_meta, "POST", siteData, monitor);
    } else if (trigger.trigger_type === "discord") {
      this.client = new Discord(trigger_meta.url, siteData, trigger_meta, monitor);
    } else if (trigger.trigger_type === "slack") {
      this.client = new Slack(trigger_meta.url, siteData, trigger_meta, monitor);
    } else if (trigger.trigger_type === "email") {
      this.client = new Email(trigger_meta, siteData, monitor);
    } else {
      console.log("Invalid Notification");
      process.exit(1);
    }
  }

  async send(data: AlertData): Promise<unknown> {
    return await this.client.send(data);
  }
}
export default Notification;

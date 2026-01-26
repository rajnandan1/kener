import Webhook from "./webhook.js";
import Discord from "./discord.js";
import Slack from "./slack.js";
import Email from "./email.js";
import type { SiteDataForNotification, AlertData } from "./variables.js";
import type { TriggerRecord, MonitorRecord } from "../types/db.js";
import GC from "../../global-constants.js";

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

//create and export a function to create test alert data
export function createTestAlertData(siteURL?: string): AlertData {
  return {
    alert_id: "test",
    alert_name: "Test Alert",
    alert_for: "STATUS",
    alert_value: Math.floor(Math.random() * 100) % 2 == 0 ? GC.DOWN : GC.DEGRADED,
    alert_status: Math.floor(Math.random() * 100) % 2 == 0 ? GC.TRIGGERED : GC.RESOLVED,
    alert_severity: Math.floor(Math.random() * 100) % 2 == 0 ? GC.CRITICAL : GC.WARNING,
    alert_message: "This is a test alert message",
    alert_source: "ALERT",
    alert_timestamp: new Date().toISOString(),
    alert_cta_url: (siteURL || "") + "/monitor-test",
    alert_cta_text: "View Monitor",
    alert_failure_threshold: Math.floor(Math.random() * 5) + 1,
    alert_success_threshold: Math.floor(Math.random() * 5) + 1,
    // alert_cta_text:
  };
}

import db from "../db/db.js";
import { GetSiteLogoURL, GetAllSiteData } from "./siteDataController.js";
import { SendEmailWithTemplate } from "./emailController.js";
import Queue from "queue";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
const eventQueue = new Queue({
  concurrency: 10, // Number of tasks that can run concurrently
  timeout: 10000, // Timeout in ms after which a task will be considered as failed (optional)
  autostart: true, // Automatically start the queue (optional)
});

interface EventData {
  incident_type: string;
  message: string;
  title: string;
}

export const PushDataToQueue = async (eventID: number, eventName: string, eventData: EventData): Promise<void> => {
  //fetch subscription trigger config from db of email type
  let subscription = await db.getSubscriptionTriggerByType("email");
  if (!subscription) {
    return;
  }
  let config: Record<string, boolean>;
  try {
    config = JSON.parse(subscription.config || "{}");
  } catch (e) {
    return;
  }

  if (!config[eventName]) {
    return;
  }

  //get incident data from db using incident id
  let tags = ["_"];
  let monitors = await db.getIncidentMonitorsByIncidentID(eventID); //get email template
  if (monitors) {
    for (let i = 0; i < monitors.length; i++) {
      const monitor = monitors[i];
      tags.push(monitor.monitor_tag);
    }
  }
  //get all the eligible emails that are there in subscription table

  //get email template
  // const emailTemplate = fs.readFileSync(path.join(__dirname, "../templates/event_update.html"), "utf8");
  // let siteData = await GetAllSiteData();
  // let base = !!process.env.KENER_BASE_PATH ? process.env.KENER_BASE_PATH : "";
  // let emailData = {
  //   brand_name: siteData.siteName || "",
  //   logo_url: await GetSiteLogoURL(siteData.siteURL || "", siteData.logo || "", base),
  //   incident_url: await GetSiteLogoURL(
  //     siteData.siteURL || "",
  //     `/view/events/${eventData.incident_type.toLowerCase()}-${eventID}`,
  //     base,
  //   ),
  //   update_message: eventData.message,
  //   title: `[${eventData.incident_type}] ` + eventData.title,
  // };

  // let eligibleEmails = await db.getSubscriberEmails(tags);
  // if (eligibleEmails) {
  //   for (let i = 0; i < eligibleEmails.length; i++) {
  //     let email = eligibleEmails[i];
  //     eventQueue.push(async (cb) => {
  //       await SendEmailWithTemplate(
  //         emailTemplate,
  //         emailData,
  //         email.subscriber_send,
  //         `[${eventData.incident_type}] ${eventData.title}`,
  //         eventData.message,
  //       );
  //       if (cb) cb();
  //     });
  //   }
  // }
};

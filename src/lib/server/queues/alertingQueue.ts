import type { MonitoringResult } from "../types/monitor.js";
import { Queue, Worker, Job, type JobsOptions } from "bullmq";
import q from "./q.js";
import {
  CreateIncident,
  InsertMonitoringData,
  AddIncidentComment,
  AddIncidentMonitor,
  GetIncidentByIDDashboard,
  GetAllSiteData,
} from "../controllers/controller.js";
import { SetLastMonitoringValue } from "../cache/setGet.js";
import type {
  MonitorSettings,
  MonitorAlertConfigRecord,
  MonitorAlertV2Record,
  TriggerRecordParsed,
  TriggerMetaEmailJson,
  TriggerMetaWebhookJson,
  TriggerMetaSlackJson,
  TriggerMetaDiscordJson,
} from "../types/db.js";
import { GetMonitorsParsed } from "../controllers/controller.js";
import {
  AddIncidentToAlert,
  CreateMonitorAlertV2,
  GetMonitorAlertConfigs,
  GetTriggersByMonitorAlertConfigId,
  GetTriggersParsedByMonitorAlertConfigId,
  UpdateMonitorAlertV2Status,
} from "../controllers/monitorAlertConfigController.js";
import type { IncidentInput } from "../controllers/incidentController.js";
let alertingQueue: Queue | null = null;
import { InsertNewAlert } from "../controllers/controller.js";
import { GetMonitorAlertsV2 } from "../controllers/monitorAlertConfigController.js";
import db from "../db/db.js";
import { getUnixTime, differenceInSeconds } from "date-fns";
import GC from "../../global-constants.js";
import { alertToVariables, siteDataToVariables } from "../notification/notification_utils.js";
import sendEmail from "../notification/email_notification.js";
import sendWebhook from "$lib/server/notification/webhook_notification.js";
import sendSlack from "$lib/server/notification/slack_notification.js";
import sendDiscord from "$lib/server/notification/discord_notification.js";

import { GetTemplateById } from "../controllers/templateController.js";

let worker: Worker | null = null;
const queueName = "alertingQueue";
const jobNamePrefix = "alertingJob";

interface JobData {
  monitor_name: string;
  monitor_tag: string;
  monitor_settings: MonitorSettings;
  monitor_alerts_configured: MonitorAlertConfigRecord;
  monitor_type: string;
  monitor_image: string;
  monitor_id: number;
  monitor_description: string;
  ts: number;
  status: string;
}

async function createNewIncident(
  alert: MonitorAlertV2Record,
  config: MonitorAlertConfigRecord,
  monitorName: string,
  monitorTag: string,
): Promise<{ incident_id: number }> {
  let startDateTime = getUnixTime(new Date(alert.created_at));
  let incidentInput: IncidentInput = {
    title: monitorName + " " + config.alert_for + ": " + config.alert_value,
    start_date_time: startDateTime,
    incident_source: "ALERT",
  };

  let newIncident = await CreateIncident(incidentInput);
  let incidentId = newIncident.incident_id;
  let update = config.alert_description || "Alert triggered";
  update = `${config.alert_description || "Alert triggered"}\n\n`;
  update = update + `| Setting | Value |\n`;
  update = update + `| :--- | :--- |\n`;
  update = update + `| **Monitor Name** | ${monitorName} |\n`;
  update = update + `| **Monitor Tag** | ${monitorTag} |\n`;
  update = update + `| **Incident Status** | ${alert.alert_status} |\n`;
  update = update + `| **Severity** | ${config.severity} |\n`;
  update = update + `| **Alert Type** | ${config.alert_for} |\n`;
  update = update + `| **Alert Value** | ${config.alert_value} |\n`;
  update = update + `| **Failure Threshold** | ${config.failure_threshold} |\n`;

  //add update to incident
  await AddIncidentComment(newIncident.incident_id, update, GC.INVESTIGATING, startDateTime);

  //add monitor to incident
  await AddIncidentMonitor(newIncident.incident_id, monitorTag, config.alert_value);

  return { incident_id: incidentId };
}

async function closeIncident(
  alert: MonitorAlertV2Record,
  config: MonitorAlertConfigRecord,
  monitorName: string,
  monitorTag: string,
): Promise<void> {
  //check if incident is already resolved
  if (!alert.incident_id) {
    console.log("No incident associated with this alert");
    return;
  }
  let incident = await GetIncidentByIDDashboard({
    incident_id: alert.incident_id,
  });
  if (!incident || incident.status === GC.CLOSED || incident.state === GC.RESOLVED) {
    console.log("Incident is already resolved or not found");
    return;
  }

  let incident_id = alert.incident_id;
  const comment = createClosureComment(alert, config, monitorName, monitorTag);
  const updatedAt = getUnixTime(new Date(alert.updated_at));
  await AddIncidentComment(incident_id, comment, GC.RESOLVED, updatedAt);
}

function createClosureComment(
  alert: MonitorAlertV2Record,
  config: MonitorAlertConfigRecord,
  monitorName: string,
  monitorTag: string,
): string {
  let comment = "The alert has been auto resolved";

  // Calculate duration in seconds between created_at and updated_at
  const durationInSeconds = differenceInSeconds(new Date(alert.updated_at), new Date(alert.created_at));
  const durationInMinutes = Math.round(durationInSeconds / 60);

  comment = comment + `, Total duration: ${durationInMinutes} minutes`;

  // Add alert details
  comment = comment + `\n\n#### Alert Details\n\n`;
  comment = comment + `| Setting | Value |\n`;
  comment = comment + `| :--- | :--- |\n`;
  comment = comment + `| **Monitor Name** | ${monitorName} |\n`;
  comment = comment + `| **Monitor Tag** | ${monitorTag} |\n`;
  comment = comment + `| **Alert Type** | ${config.alert_for} |\n`;
  comment = comment + `| **Alert Value** | ${config.alert_value} |\n`;
  comment = comment + `| **Severity** | ${config.severity} |\n`;
  comment = comment + `| **Failure Threshold** | ${config.failure_threshold} |\n`;
  comment = comment + `| **Success Threshold** | ${config.success_threshold} |\n`;

  return comment;
}

async function sendAlertNotifications(
  activeAlert: MonitorAlertV2Record,
  monitor_alerts_configured: MonitorAlertConfigRecord,
  templateSiteVars: any,
): Promise<void> {
  const templateAlertVars = alertToVariables(monitor_alerts_configured, activeAlert);
  const triggers = await GetTriggersParsedByMonitorAlertConfigId(monitor_alerts_configured.id);

  for (let i = 0; i < triggers.length; i++) {
    const trigger = triggers[i];
    if (!trigger.template_id) {
      console.error(`No template associated with trigger ID ${trigger.id}`);
      continue;
    }

    // Fetch trigger template
    const template = await GetTemplateById(trigger.template_id);
    if (!template) {
      console.error(`Template not found for trigger ID ${trigger.id}`);
      continue;
    }

    // Handle only email for now
    if (trigger.trigger_type === "email") {
      await sendEmail(
        trigger as TriggerRecordParsed<TriggerMetaEmailJson>,
        templateAlertVars,
        template,
        templateSiteVars,
      );
    } else if (trigger.trigger_type === "webhook") {
      await sendWebhook(
        trigger as TriggerRecordParsed<TriggerMetaWebhookJson>,
        templateAlertVars,
        template,
        templateSiteVars,
      );
    } else if (trigger.trigger_type === "slack") {
      await sendSlack(
        trigger as TriggerRecordParsed<TriggerMetaSlackJson>,
        templateAlertVars,
        template,
        templateSiteVars,
      );
    } else if (trigger.trigger_type === "discord") {
      await sendDiscord(
        trigger as TriggerRecordParsed<TriggerMetaDiscordJson>,
        templateAlertVars,
        template,
        templateSiteVars,
      );
    }
  }
}

const getQueue = () => {
  if (!alertingQueue) {
    alertingQueue = q.createQueue(queueName);
  }
  return alertingQueue;
};

const addWorker = () => {
  if (worker) return worker;

  worker = q.createWorker(getQueue(), async (job: Job): Promise<void> => {
    const { monitor_name, monitor_tag, ts, status, monitor_alerts_configured } = job.data as JobData;
    const siteData = await GetAllSiteData();
    const templateSiteVars = siteDataToVariables(siteData);
    try {
      const typeOfConfig = monitor_alerts_configured.alert_for;
      const alertValue = monitor_alerts_configured.alert_value;
      const failureThreshold = monitor_alerts_configured.failure_threshold;
      if (typeOfConfig === "STATUS") {
        //alertValue can be DOWN or DEGRADED
        let isAffected = await db.consecutivelyStatusFor(monitor_tag, alertValue, failureThreshold);
        let alertsExisting = await GetMonitorAlertsV2({
          config_id: monitor_alerts_configured.id,
          alert_status: GC.TRIGGERED,
        });
        let activeAlert = null;
        if (alertsExisting.length > 0) {
          activeAlert = alertsExisting[0];
        }

        if (isAffected) {
          if (!activeAlert) {
            activeAlert = await CreateMonitorAlertV2(monitor_alerts_configured.id);
            if (monitor_alerts_configured.create_incident === GC.YES) {
              let newIncidentNumber = await createNewIncident(
                activeAlert,
                monitor_alerts_configured,
                monitor_name,
                monitor_tag,
              );
              //update alert with incident number
              if (newIncidentNumber && newIncidentNumber.incident_id > 0) {
                activeAlert = await AddIncidentToAlert(activeAlert.id, newIncidentNumber.incident_id);
              }
            }
            // Send triggered alert notifications
            await sendAlertNotifications(activeAlert, monitor_alerts_configured, templateSiteVars);
          }
        } else {
          //all good, resolve any existing alert
          if (activeAlert) {
            //resolve the alert
            activeAlert = await UpdateMonitorAlertV2Status(activeAlert.id, GC.RESOLVED);

            // If alert has an incident, add closure comment
            if (activeAlert.incident_id) {
              await closeIncident(activeAlert, monitor_alerts_configured, monitor_name, monitor_tag);
            }

            // Send resolution notifications
            await sendAlertNotifications(activeAlert, monitor_alerts_configured, templateSiteVars);
          }
        }
      }
    } catch (error) {
      console.error("Error processing alerting job:", error);
    }

    // return { monitor_tag, monitor_settings_json, ts, status };
  });

  worker.on("completed", (job: Job, returnvalue: any) => {
    // const { monitor_tag, ts, status } = job.data as JobData;
    // console.log(`🚨 Alerting: ${monitor_tag} @ ${new Date(ts * 1000).toISOString()}`);
  });

  return worker;
};

export const push = async (monitor_tag: string, ts: number, status: string, options?: JobsOptions) => {
  if (!options) {
    options = {};
  }
  const queue = getQueue();
  addWorker();

  //fetch monitorTyped from monitor_tag
  const monitors = await GetMonitorsParsed({ tag: monitor_tag });
  if (monitors.length === 0) {
    return;
  }
  const monitor = monitors[0];
  const monitorSettings = monitor.monitor_settings_json as MonitorSettings;

  //check if alerting is enabled for this monitor
  //get all monitor alert configs
  const monitorAlertsConfigurations = await GetMonitorAlertConfigs({
    monitor_tag: monitor.tag,
    is_active: "YES",
  });
  if (monitorAlertsConfigurations.length === 0) {
    return;
  }

  for (const monitorAlertConfig of monitorAlertsConfigurations) {
    const deDupId = `${monitor_tag}-${ts}-${monitorAlertConfig.id}`;

    if (!options.deduplication) {
      options.deduplication = {
        id: deDupId,
      };
    }
    await queue.add(
      jobNamePrefix + "_" + monitor_tag,
      {
        monitor_name: monitor.name,
        monitor_tag,
        monitor_settings: monitorSettings,
        monitor_alerts_configured: monitorAlertConfig,
        monitor_type: monitor.monitor_type,
        monitor_image: monitor.image,
        monitor_id: monitor.id,
        monitor_description: monitor.description,
        ts,
        status,
      },
      options,
    );
  }
};

//graceful shutdown
export const shutdown = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};

export default {
  push,
  shutdown,
};

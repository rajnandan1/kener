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
  CreateNewIncidentWithCommentAndMonitor,
  IncidentCreateAlertMarkdown,
  ClosureCommentAlertMarkdown,
  IsUptimeLessThanXPercent,
  IsUptimeGreaterThanXPercent,
} from "../controllers/controller.js";
import type { MonitorSettings, MonitorAlertConfigRecord, MonitorAlertV2Record, TriggerMeta } from "../types/db.js";
import { GetMonitorsParsed } from "../controllers/controller.js";
import {
  AddIncidentToAlert,
  CreateMonitorAlertV2,
  GetMonitorAlertConfigs,
  GetTriggersByMonitorAlertConfigId,
  UpdateMonitorAlertV2Status,
} from "../controllers/monitorAlertConfigController.js";
import type { IncidentInput } from "../controllers/incidentController.js";
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

import type { SiteDataForNotification, SubscriptionVariableMap } from "../notification/types.js";
import mdToHTML from "../../marked.js";
import subscriberQueue from "./subscriberQueue.js";
let alertingQueue: Queue | null = null;

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
  numerator: string;
  denominator: string;
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

  let update = IncidentCreateAlertMarkdown(alert, config, monitorName, monitorTag, GC.TRIGGERED);
  let incidentCreated = await CreateNewIncidentWithCommentAndMonitor(
    incidentInput,
    update,
    monitorTag,
    config.alert_value,
  );

  const updateVariables: SubscriptionVariableMap = {
    title: incidentInput.title,
    cta_url: "/incidents/" + incidentCreated.incident_id,
    cta_text: "View Incident",
    update_text: mdToHTML(update),
    update_subject: `[#${incidentCreated.incident_id}:${GC.TRIGGERED}] ${incidentInput.title}`,
    update_id: String(incidentCreated.incident_id),
    event_type: "incidents",
  };
  subscriberQueue.push(updateVariables);
  return incidentCreated;

  /*
	
	
	
		subscriberQueue.push(updateVariables);*/
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
  const comment = ClosureCommentAlertMarkdown(alert, config, monitorName, monitorTag, GC.RESOLVED);
  const updatedAt = getUnixTime(new Date(alert.updated_at));
  const updateMessage: SubscriptionVariableMap = {
    title: incident.title,
    cta_url: `/incidents/${incident_id}`,
    cta_text: "View Incident",
    update_text: mdToHTML(comment),
    update_subject: `[#${incident.id}:${GC.RESOLVED}] ${incident.title}`,
    update_id: String(incident_id),
    event_type: "incidents",
  };
  subscriberQueue.push(updateMessage);
  await AddIncidentComment(incident_id, comment, GC.RESOLVED, updatedAt);
}

async function sendAlertNotifications(
  activeAlert: MonitorAlertV2Record,
  monitor_alerts_configured: MonitorAlertConfigRecord,
  templateSiteVars: SiteDataForNotification,
): Promise<void> {
  const templateAlertVars = alertToVariables(monitor_alerts_configured, activeAlert);
  const triggers = await GetTriggersByMonitorAlertConfigId(monitor_alerts_configured.id);

  for (let i = 0; i < triggers.length; i++) {
    const trigger = triggers[i];

    // Fetch trigger template
    const triggerMetaParsed = JSON.parse(trigger.trigger_meta) as TriggerMeta;
    // Handle only email for now
    if (trigger.trigger_type === "email") {
      const toAddresses = triggerMetaParsed.to
        .trim()
        .split(",")
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);
      if (toAddresses.length === 0) {
        continue;
      }
      await sendEmail(
        triggerMetaParsed.email_body,
        triggerMetaParsed.email_subject,
        { ...templateAlertVars, ...templateSiteVars },
        toAddresses,
        triggerMetaParsed.from,
      );
    } else if (trigger.trigger_type === "webhook") {
      await sendWebhook(
        triggerMetaParsed.webhook_body,
        { ...templateAlertVars, ...templateSiteVars },
        triggerMetaParsed.url,
        JSON.stringify(triggerMetaParsed.headers),
      );
    } else if (trigger.trigger_type === "discord") {
      await sendDiscord(
        triggerMetaParsed.discord_body,
        { ...templateAlertVars, ...templateSiteVars },
        triggerMetaParsed.url,
      );
    } else if (trigger.trigger_type === "slack") {
      await sendSlack(
        triggerMetaParsed.slack_body,
        { ...templateAlertVars, ...templateSiteVars },
        triggerMetaParsed.url,
      );
    } else {
      throw new Error("Unsupported trigger type for testing");
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
    const { monitor_name, monitor_tag, numerator, denominator, status, monitor_alerts_configured } =
      job.data as JobData;
    const siteData = await GetAllSiteData();
    const templateSiteVars = siteDataToVariables(siteData);
    try {
      const typeOfConfig = monitor_alerts_configured.alert_for;
      const alertValue = monitor_alerts_configured.alert_value;
      const failureThreshold = monitor_alerts_configured.failure_threshold;
      const successThreshold = monitor_alerts_configured.success_threshold;

      // Determine if monitor is affected based on alert type
      let isAffected = false;
      let isUp = false;
      if (typeOfConfig === GC.STATUS) {
        //alertValue can be DOWN or DEGRADED
        isAffected = await db.consecutivelyStatusFor(monitor_tag, alertValue, failureThreshold);
      } else if (typeOfConfig === GC.LATENCY) {
        isAffected = await db.consecutivelyLatencyGreaterThan(monitor_tag, parseFloat(alertValue), failureThreshold);
      } else if (typeOfConfig === GC.UPTIME) {
        isAffected = await IsUptimeLessThanXPercent(
          monitor_tag,
          parseFloat(alertValue),
          failureThreshold,
          numerator,
          denominator,
        );
      } else {
        return;
      }

      // Get existing alerts
      let alertsExisting = await GetMonitorAlertsV2({
        config_id: monitor_alerts_configured.id,
        alert_status: GC.TRIGGERED,
      });
      let activeAlert = null;
      if (alertsExisting.length > 0) {
        activeAlert = alertsExisting[0];
      }

      if (isAffected) {
        // Trigger alert if not already active
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
        // Resolve any existing alert
        if (activeAlert) {
          if (typeOfConfig === GC.STATUS) {
            isUp = await db.consecutivelyStatusFor(monitor_tag, GC.UP, successThreshold);
          } else if (typeOfConfig === GC.LATENCY) {
            isUp = await db.consecutivelyLatencyLessThan(monitor_tag, parseFloat(alertValue), successThreshold);
          } else if (typeOfConfig === GC.UPTIME) {
            isUp = await IsUptimeGreaterThanXPercent(
              monitor_tag,
              parseFloat(alertValue),
              successThreshold,
              numerator,
              denominator,
            );
          } else {
            isUp = false;
          }

          if (!isUp) {
            // Not yet recovered
            return;
          }

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
        numerator: monitor.monitor_settings_json?.uptime_formula_numerator || GC.defaultNumeratorStr,
        denominator: monitor.monitor_settings_json?.uptime_formula_denominator || GC.defaultDenominatorStr,
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

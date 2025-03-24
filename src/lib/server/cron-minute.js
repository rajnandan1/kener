// @ts-nocheck
import axios from "axios";
import { Ping, ExtractIPv6HostAndPort, TCP } from "./ping.js";
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL, DEFAULT_STATUS } from "./constants.js";
import Service from "./services/service.js";
import { GetMinuteStartNowTimestampUTC, ReplaceAllOccurrences, GetRequiredSecrets, Wait } from "./tool.js";

import alerting from "./alerting.js";
import Queue from "queue";
import dotenv from "dotenv";
import path from "path";
import db from "./db/db.js";
import notification from "./notification/notif.js";
import DNSResolver from "./dns.js";

dotenv.config();

const alertingQueue = new Queue({
  concurrency: 10, // Number of tasks that can run concurrently
  timeout: 10000, // Timeout in ms after which a task will be considered as failed (optional)
  autostart: true, // Automatically start the queue (optional)
});
const apiQueue = new Queue({
  concurrency: 10, // Number of tasks that can run concurrently
  timeout: 2 * 60 * 1000, // Timeout in ms after which a task will be considered as failed (optional)
  autostart: true, // Automatically start the queue (optional)
});

async function manualIncident(monitor) {
  let startTs = GetMinuteStartNowTimestampUTC();
  let incidentArr = await db.getIncidentsByMonitorTagRealtime(monitor.tag, startTs);
  let maintenanceArr = await db.getMaintenanceByMonitorTagRealtime(monitor.tag, startTs);

  let impactArr = incidentArr.concat(maintenanceArr);

  let impact = "";
  if (impactArr.length == 0) {
    return {};
  }

  for (let i = 0; i < impactArr.length; i++) {
    const element = impactArr[i];

    if (element.monitor_impact === "DOWN") {
      impact = "DOWN";
      break;
    }
    if (element.monitor_impact === "DEGRADED") {
      impact = "DEGRADED";
    }
  }

  if (impact === "") {
    return {};
  }

  let manualData = {
    [startTs]: {
      status: impact,
      latency: 0,
      type: MANUAL,
    },
  };

  return manualData;
}

const Minuter = async (monitor) => {
  try {
    let realTimeData = {};
    let manualData = {};

    const startOfMinute = GetMinuteStartNowTimestampUTC();
    const serviceClient = new Service(monitor);
    if (monitor.monitor_type === "API") {
      let apiResponse = await serviceClient.execute();

      realTimeData[startOfMinute] = apiResponse;

      //if timeout, retry after 500ms
      if (apiResponse.type === TIMEOUT) {
        apiQueue.push(async (cb) => {
          await Wait(500); //wait for 500ms
          console.log("Retrying api call for " + monitor.name + " at " + startOfMinute + " due to timeout");
          serviceClient.execute().then(async (data) => {
            await db.insertMonitoringData({
              monitor_tag: monitor.tag,
              timestamp: startOfMinute,
              status: data.status,
              latency: data.latency,
              type: data.type,
            });
            cb();
          });
        });
      }
    } else if (monitor.monitor_type === "PING") {
      realTimeData[startOfMinute] = await serviceClient.execute();
    } else if (monitor.monitor_type === "TCP") {
      realTimeData[startOfMinute] = await serviceClient.execute();
    } else if (monitor.monitor_type === "DNS") {
      realTimeData[startOfMinute] = await serviceClient.execute();
    } else if (monitor.monitor_type === "GROUP") {
      realTimeData[startOfMinute] = await serviceClient.execute(startOfMinute);
    } else if (monitor.monitor_type === "SSL") {
      realTimeData[startOfMinute] = await serviceClient.execute();
    } else if (monitor.monitor_type === "SQL") {
      realTimeData[startOfMinute] = await serviceClient.execute();
    } else if (monitor.monitor_type === "HEARTBEAT") {
      realTimeData[startOfMinute] = await serviceClient.execute();
    }

    manualData = await manualIncident(monitor);

    //merge noData, apiData, webhookData, dayData
    let mergedData = {};

    if (monitor.default_status !== undefined && monitor.default_status !== null) {
      if ([UP, DOWN, DEGRADED].indexOf(monitor.default_status) !== -1) {
        mergedData[startOfMinute] = {
          status: monitor.default_status,
          latency: 0,
          type: DEFAULT_STATUS,
        };
      }
    }

    for (const timestamp in realTimeData) {
      if (!!realTimeData[timestamp] && !!realTimeData[timestamp].status) {
        mergedData[timestamp] = realTimeData[timestamp];
      }
    }

    for (const timestamp in manualData) {
      if (!!manualData[timestamp] && !!manualData[timestamp].status) {
        mergedData[timestamp] = manualData[timestamp];
      }
    }

    for (const timestamp in mergedData) {
      const element = mergedData[timestamp];
      db.insertMonitoringData({
        monitor_tag: monitor.tag,
        timestamp: parseInt(timestamp),
        status: element.status,
        latency: element.latency,
        type: element.type,
      });
    }
  } catch (e) {
    console.log(`[Error] in Running Monitor name: ${monitor.name}, tag: ${monitor.tag} error:`, e);
  }

  alertingQueue.push(async (cb) => {
    setTimeout(async () => {
      try {
        await alerting(monitor);
        cb();
      } catch (e) {
        console.log(`[Error] in Running Alerting name: ${monitor.name}, tag: ${monitor.tag} error:`, e);
        cb();
      }
    }, 1042);
  });
};

alertingQueue.start((err) => {
  if (err) {
    console.error("Error occurred:", err);
    process.exit(1);
  }
});
apiQueue.start((err) => {
  if (err) {
    console.error("Error occurred:", err);
    process.exit(1);
  }
});
export { Minuter };

// @ts-nocheck
import db from "../db/db.js";
import { InterpolateData, GetLastStatusBefore } from "./controller.js";
import { format } from "date-fns";

/**
 * Generate downtime report for a monitor within a date range
 * @param {string} monitor_tag - Monitor tag
 * @param {number} startTimestamp - Start timestamp in seconds
 * @param {number} endTimestamp - End timestamp in seconds
 * @returns {Promise<Object>} Report object with downtimes and summary
 */
export const GenerateDowntimeReport = async (monitor_tag, startTimestamp, endTimestamp) => {
  // Get monitor info
  const monitor = await db.getMonitorByTag(monitor_tag);
  if (!monitor) {
    throw new Error(`Monitor ${monitor_tag} not found`);
  }

  // Get all monitoring data for the period
  const rawData = await db.getMonitoringData(monitor_tag, startTimestamp, endTimestamp);
  const anchorStatus = await GetLastStatusBefore(monitor_tag, startTimestamp);
  const interpolatedData = InterpolateData(rawData, startTimestamp, anchorStatus, endTimestamp);

  // Get alerts for the period
  const alerts = await db.getAlertsForPeriod(monitor_tag, startTimestamp, endTimestamp);
  // Convert alert created_at to timestamps for comparison
  const alertTimestamps = new Set(
    alerts.map((a) => Math.floor(new Date(a.created_at).getTime() / 1000))
  );

  // Calculate downtime periods
  const downtimes = [];
  let currentDowntime = null;

  for (let i = 0; i < interpolatedData.length; i++) {
    const entry = interpolatedData[i];
    const isDown = entry.status === "DOWN" || entry.status === "DEGRADED";

    if (isDown && !currentDowntime) {
      // Start of downtime
      currentDowntime = {
        startTimestamp: entry.timestamp,
        status: entry.status,
        hasAlert: alertTimestamps.has(entry.timestamp),
      };
    } else if (!isDown && currentDowntime) {
      // End of downtime
      const durationMinutes = (entry.timestamp - currentDowntime.startTimestamp) / 60;
      downtimes.push({
        startDateTime: format(new Date(currentDowntime.startTimestamp * 1000), "yyyy-MM-dd HH:mm:ss"),
        endDateTime: format(new Date(entry.timestamp * 1000), "yyyy-MM-dd HH:mm:ss"),
        durationMinutes: parseFloat(durationMinutes.toFixed(2)),
        durationHours: parseFloat((durationMinutes / 60).toFixed(2)),
        status: currentDowntime.status,
        alertGenerated: currentDowntime.hasAlert,
      });
      currentDowntime = null;
    } else if (isDown && currentDowntime) {
      // Continue downtime, check for alerts
      if (alertTimestamps.has(entry.timestamp)) {
        currentDowntime.hasAlert = true;
      }
      // Update status if it changed (e.g., from DEGRADED to DOWN)
      if (entry.status === "DOWN" && currentDowntime.status !== "DOWN") {
        currentDowntime.status = "DOWN";
      }
    }
  }

  // If still in downtime at the end
  if (currentDowntime) {
    const durationMinutes = (endTimestamp - currentDowntime.startTimestamp) / 60;
    downtimes.push({
      startDateTime: format(new Date(currentDowntime.startTimestamp * 1000), "yyyy-MM-dd HH:mm:ss"),
      endDateTime: format(new Date(endTimestamp * 1000), "yyyy-MM-dd HH:mm:ss"),
      durationMinutes: parseFloat(durationMinutes.toFixed(2)),
      durationHours: parseFloat((durationMinutes / 60).toFixed(2)),
      status: currentDowntime.status,
      alertGenerated: currentDowntime.hasAlert,
    });
  }

  // Calculate summary
  const totalDowntimeMinutes = downtimes.reduce((sum, d) => sum + d.durationMinutes, 0);
  const totalMinutesInPeriod = (endTimestamp - startTimestamp) / 60;
  const uptimePercentage =
    totalMinutesInPeriod > 0
      ? ((totalMinutesInPeriod - totalDowntimeMinutes) / totalMinutesInPeriod) * 100
      : 100;
  const alertsGenerated = downtimes.filter((d) => d.alertGenerated).length;

  return {
    monitor: {
      tag: monitor.tag,
      name: monitor.name,
    },
    period: {
      start: startTimestamp,
      end: endTimestamp,
      startFormatted: format(new Date(startTimestamp * 1000), "yyyy-MM-dd HH:mm:ss"),
      endFormatted: format(new Date(endTimestamp * 1000), "yyyy-MM-dd HH:mm:ss"),
    },
    downtimes: downtimes,
    summary: {
      totalDowntimeMinutes: parseFloat(totalDowntimeMinutes.toFixed(2)),
      totalDowntimeHours: parseFloat((totalDowntimeMinutes / 60).toFixed(2)),
      uptimePercentage: parseFloat(uptimePercentage.toFixed(4)),
      downtimePercentage: parseFloat((100 - uptimePercentage).toFixed(4)),
      alertsGenerated: alertsGenerated,
      totalEvents: downtimes.length,
    },
  };
};

/**
 * Export report data to CSV format
 * @param {Object} report - Report object from GenerateDowntimeReport
 * @returns {Array<Array<string>>} CSV data as array of arrays
 */
export const ExportReportToCSV = (report) => {
  const rows = [];

  // Header with report info
  rows.push(["Downtime Report"]);
  rows.push(["Monitor", report.monitor.name]);
  rows.push(["Tag", report.monitor.tag]);
  rows.push(["Period", `${report.period.startFormatted} to ${report.period.endFormatted}`]);
  rows.push([]);

  // Data header
  rows.push([
    "Start Date/Time",
    "End Date/Time",
    "Duration (Minutes)",
    "Duration (Hours)",
    "Status",
    "Alert Generated",
  ]);

  // Data rows
  for (const downtime of report.downtimes) {
    rows.push([
      downtime.startDateTime,
      downtime.endDateTime,
      downtime.durationMinutes,
      downtime.durationHours,
      downtime.status,
      downtime.alertGenerated ? "Yes" : "No",
    ]);
  }

  // Summary section
  rows.push([]);
  rows.push(["SUMMARY"]);
  rows.push(["Total Downtime Events", report.summary.totalEvents]);
  rows.push(["Total Downtime (Minutes)", report.summary.totalDowntimeMinutes]);
  rows.push(["Total Downtime (Hours)", report.summary.totalDowntimeHours]);
  rows.push(["Uptime Percentage", `${report.summary.uptimePercentage}%`]);
  rows.push(["Downtime Percentage", `${report.summary.downtimePercentage}%`]);
  rows.push(["Alerts Generated", report.summary.alertsGenerated]);

  return rows;
};

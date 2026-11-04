import { format } from "date-fns";
import db from "../db/db.js";
import GC from "../../global-constants.js";
import mdToHTML from "../../marked.js";
import { GetLastSubscriberStatus, SetLastSubscriberStatus } from "../cache/setGet.js";
import { siteDataToVariables } from "../notification/notification_utils.js";
import type { SubscriptionVariableMap } from "../notification/types.js";
import subscriberQueue from "../queues/subscriberQueue.js";
import { GetAllSiteData } from "./siteDataController.js";

const NOTIFIED_STATUSES: string[] = [GC.UP, GC.DOWN, GC.DEGRADED];
// Incident and maintenance rows carry the status an admin set; the incident and maintenance mails
// already tell subscribers about those, so they neither notify nor move the remembered status.
const OVERLAY_TYPES: string[] = [GC.INCIDENT, GC.MAINTENANCE];

/**
 * Emails the subscribers of a monitor when its status changes between UP, DOWN and DEGRADED.
 * Call it with each committed status of the monitor. NO_DATA is skipped, so a gap in checks is not
 * a change, and a minute older than the last one seen (a backfill) is ignored. The first status seen
 * after a cache reset only sets the baseline.
 */
export const NotifySubscribersOfStatusChange = async (
  monitorTag: string,
  ts: number,
  status: string,
  type: string,
): Promise<void> => {
  if (!NOTIFIED_STATUSES.includes(status) || OVERLAY_TYPES.includes(type)) return;

  const last = await GetLastSubscriberStatus(monitorTag);
  if (last && last.ts >= ts) return;
  await SetLastSubscriberStatus(monitorTag, { status, ts });
  if (!last || last.status === status) return;

  const monitor = await db.getMonitorByTag(monitorTag);
  if (!monitor || monitor.is_hidden === "YES") return;

  const siteUrl = siteDataToVariables(await GetAllSiteData()).site_url;
  const at = format(new Date(ts * 1000), "PPpp");
  const variables: SubscriptionVariableMap = {
    title: `${monitor.name} is ${status}`,
    cta_url: `${siteUrl}monitors/${monitor.tag}`,
    cta_text: "View Monitor",
    update_text: mdToHTML(`**${monitor.name}** changed from **${last.status}** to **${status}** at ${at}.`),
    update_subject: `[${status}] ${monitor.name}`,
    update_id: `monitor_${monitor.tag}_${ts}`,
    event_type: "monitors",
    update_state: status,
    is_up: status === GC.UP,
    is_down: status === GC.DOWN,
    is_degraded: status === GC.DEGRADED,
  };
  await subscriberQueue.push(variables, [monitor.tag], {
    deduplication: { id: `subscriber-monitors-${monitor.tag}-${ts}` },
  });
};

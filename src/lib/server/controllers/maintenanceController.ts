import db from "../db/db.js";
import pkg from "rrule";
const { RRule, rrulestr } = pkg;
import { addDays } from "date-fns";
import type {
  MaintenanceRecord,
  MaintenanceRecordInsert,
  MaintenanceEventRecord,
  MaintenanceEventRecordInsert,
  MaintenanceMonitorRecord,
  MaintenanceFilter,
  MaintenanceEventFilter,
} from "../types/db.js";

// ============ Input Interfaces ============

export interface MonitorWithStatusInput {
  monitor_tag: string;
  monitor_impact: "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE";
}

export interface CreateMaintenanceInput {
  title: string;
  description?: string | null;
  start_date_time: number; // Unix timestamp - when the first occurrence starts
  rrule: string; // iCalendar RRULE string (e.g., FREQ=WEEKLY;BYDAY=SU or FREQ=MINUTELY;COUNT=1)
  duration_seconds: number; // Duration of each maintenance window in seconds
  // Monitors with their status during maintenance
  monitors?: MonitorWithStatusInput[];
}

export interface UpdateMaintenanceInput {
  title?: string;
  description?: string | null;
  start_date_time?: number;
  rrule?: string;
  duration_seconds?: number;
  status?: "ACTIVE" | "INACTIVE";
  monitors?: MonitorWithStatusInput[];
}

export interface CreateMaintenanceEventInput {
  maintenance_id: number;
  start_date_time: number;
  end_date_time: number;
}

export interface MaintenanceMonitorWithStatus {
  monitor_tag: string;
  monitor_impact: "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE";
}

export interface MaintenanceWithMonitors extends MaintenanceRecord {
  monitors?: MaintenanceMonitorWithStatus[];
}

export interface MaintenanceWithEvents extends MaintenanceWithMonitors {
  events?: MaintenanceEventRecord[];
  upcoming_event?: MaintenanceEventRecord | null;
}

// ============ Helper to generate upcoming events from RRULE ============

/**
 * Generate maintenance events for the next N days based on the RRULE
 * @param maintenance_id - The maintenance record ID
 * @param start_date_time - Unix timestamp for the DTSTART
 * @param rrule - The RRULE string (e.g., FREQ=WEEKLY;BYDAY=SU)
 * @param duration_seconds - Duration of each maintenance window
 * @param daysAhead - Number of days to look ahead (default 7)
 */
export const GenerateMaintenanceEvents = async (
  maintenance_id: number,
  start_date_time: number,
  rrule: string,
  duration_seconds: number,
  daysAhead: number = 7,
): Promise<MaintenanceEventRecord[]> => {
  const createdEvents: MaintenanceEventRecord[] = [];

  // Convert start timestamp to Date (UTC)
  const dtstart = new Date(start_date_time * 1000);

  // Define the window to generate events
  const now = new Date();
  const windowEnd = addDays(now, daysAhead);

  try {
    // Build the full RRULE string with DTSTART
    const fullRrule = `DTSTART:${dtstart.toISOString().replace(/[-:]/g, "").split(".")[0]}Z\nRRULE:${rrule}`;

    // Parse the RRULE
    const rule = rrulestr(fullRrule);

    // Get occurrences between now and window end
    // For one-time (COUNT=1), we use dtstart as the reference
    let occurrences: Date[];

    if (rrule.includes("COUNT=1")) {
      // One-time maintenance: only create event if start_date_time is in the future or within window
      if (dtstart >= now || (dtstart <= windowEnd && dtstart >= addDays(now, -1))) {
        occurrences = [dtstart];
      } else {
        occurrences = [];
      }
    } else {
      // Recurring: get all occurrences in the window
      occurrences = rule.between(now, windowEnd, true);
    }

    // Create events for each occurrence
    for (const occurrence of occurrences) {
      const eventStart = Math.floor(occurrence.getTime() / 1000);
      const eventEnd = eventStart + duration_seconds;

      // Check if event already exists for this time
      const existing = await db.getMaintenanceEventsByMaintenanceId(maintenance_id);
      const alreadyExists = existing.some((e) => e.start_date_time === eventStart);

      if (!alreadyExists) {
        const event = await db.createMaintenanceEvent({
          maintenance_id,
          start_date_time: eventStart,
          end_date_time: eventEnd,
          status: "SCHEDULED",
        });
        createdEvents.push(event);
      }
    }
  } catch (err) {
    console.error("Error generating maintenance events:", err);
  }

  return createdEvents;
};

// ============ Maintenance CRUD ============

export const CreateMaintenance = async (data: CreateMaintenanceInput): Promise<{ maintenance_id: number }> => {
  // Validate required fields
  if (!data.title) {
    throw new Error("Title is required");
  }
  if (!data.start_date_time) {
    throw new Error("Start date/time is required");
  }
  if (!data.rrule) {
    throw new Error("RRULE is required");
  }
  if (!data.duration_seconds || data.duration_seconds <= 0) {
    throw new Error("Duration must be greater than 0");
  }

  // Create the maintenance record
  const maintenance = await db.createMaintenance({
    title: data.title,
    description: data.description || null,
    start_date_time: data.start_date_time,
    rrule: data.rrule,
    duration_seconds: data.duration_seconds,
    status: "ACTIVE",
  });

  // Add monitors with their status to the maintenance if provided
  if (data.monitors && data.monitors.length > 0) {
    await db.addMonitorsToMaintenanceWithStatus(maintenance.id, data.monitors);
  }

  // Generate initial events for the next 7 days
  await GenerateMaintenanceEvents(maintenance.id, data.start_date_time, data.rrule, data.duration_seconds, 7);

  return {
    maintenance_id: maintenance.id,
  };
};

export const GetMaintenanceById = async (id: number): Promise<MaintenanceRecord | undefined> => {
  return await db.getMaintenanceById(id);
};

export const GetMaintenanceWithMonitors = async (id: number): Promise<MaintenanceWithMonitors | null> => {
  const maintenance = await db.getMaintenanceById(id);
  if (!maintenance) return null;

  const monitorRecords = await db.getMaintenanceMonitors(id);

  return {
    ...maintenance,
    monitors: monitorRecords.map((m) => ({ monitor_tag: m.monitor_tag, monitor_impact: m.monitor_impact })),
  };
};

export const GetMaintenanceWithEvents = async (
  id: number,
  pastLimit: number = 5,
  daysInPast: number = 7,
): Promise<MaintenanceWithEvents | null> => {
  const maintenance = await db.getMaintenanceById(id);
  if (!maintenance) return null;

  const now = Math.floor(Date.now() / 1000);
  const events = await db.getMaintenanceEventsByMaintenanceIdWithLimits(id, now, pastLimit, daysInPast);
  const monitorRecords = await db.getMaintenanceMonitors(id);

  // Find the next upcoming or current event (events are sorted by start_date_time asc)
  // Find the first event that hasn't ended yet (ongoing or future)
  const upcomingEvent = events.find((e) => e.end_date_time > now);

  return {
    ...maintenance,
    monitors: monitorRecords.map((m) => ({
      monitor_tag: m.monitor_tag,
      monitor_impact: m.monitor_impact,
    })),
    events,
    upcoming_event: upcomingEvent || null,
  };
};

export const GetMaintenancesDashboard = async (data: {
  page: number;
  limit: number;
  filter?: { status?: string };
}): Promise<{ maintenances: MaintenanceWithEvents[]; total: number }> => {
  const filter: MaintenanceFilter = {};
  if (data.filter?.status && data.filter.status !== "ALL") {
    filter.status = data.filter.status as "ACTIVE" | "INACTIVE";
  }

  const maintenances = await db.getMaintenancesPaginated(data.page, data.limit, filter);
  const totalResult = await db.getMaintenancesCount(filter);
  const total = totalResult ? Number(totalResult.count) : 0;

  // Enrich with events and monitors
  const enriched: MaintenanceWithEvents[] = [];
  for (const m of maintenances) {
    const events = await db.getMaintenanceEventsByMaintenanceId(m.id);
    const monitorRecords = await db.getMaintenanceMonitors(m.id);
    const now = Math.floor(Date.now() / 1000);
    // Find the first event that hasn't ended yet (ongoing or future)
    const upcomingEvent = events.find((e) => e.end_date_time > now);
    enriched.push({
      ...m,
      monitors: monitorRecords.map((mr) => ({
        monitor_tag: mr.monitor_tag,
        monitor_impact: mr.monitor_impact,
      })),
      events,
      upcoming_event: upcomingEvent || null,
    });
  }

  return { maintenances: enriched, total };
};

export const UpdateMaintenance = async (id: number, data: UpdateMaintenanceInput): Promise<number> => {
  const existing = await db.getMaintenanceById(id);
  if (!existing) {
    throw new Error(`Maintenance with id ${id} does not exist`);
  }

  // Extract monitors separately as it's not part of the record
  const { monitors, ...updateData } = data;

  // Check if schedule has changed (start_date_time, rrule, or duration_seconds)
  const scheduleChanged =
    (data.start_date_time !== undefined && data.start_date_time !== existing.start_date_time) ||
    (data.rrule !== undefined && data.rrule !== existing.rrule) ||
    (data.duration_seconds !== undefined && data.duration_seconds !== existing.duration_seconds);

  // Update the maintenance record
  const result = await db.updateMaintenance(id, updateData);

  // Update monitors if provided
  if (monitors !== undefined) {
    await db.removeAllMonitorsFromMaintenance(id);
    if (monitors.length > 0) {
      await db.addMonitorsToMaintenanceWithStatus(id, monitors);
    }
  }

  // If schedule changed, delete future SCHEDULED events and regenerate
  if (scheduleChanged) {
    // Get current values (may have been updated)
    const updated = await db.getMaintenanceById(id);
    if (updated) {
      // Delete future scheduled events
      const events = await db.getMaintenanceEventsByMaintenanceId(id);
      const now = Math.floor(Date.now() / 1000);
      for (const event of events) {
        // Only delete SCHEDULED events in the future
        if (event.status === "SCHEDULED" && event.start_date_time > now) {
          await db.deleteMaintenanceEvent(event.id);
        }
      }

      // Regenerate events for the next 7 days
      await GenerateMaintenanceEvents(id, updated.start_date_time, updated.rrule, updated.duration_seconds, 7);
    }
  }

  return result;
};

export const DeleteMaintenance = async (id: number): Promise<number> => {
  const existing = await db.getMaintenanceById(id);
  if (!existing) {
    throw new Error(`Maintenance with id ${id} does not exist`);
  }

  return await db.deleteMaintenance(id);
};

// ============ Maintenance Events CRUD ============

export const CreateMaintenanceEvent = async (data: CreateMaintenanceEventInput): Promise<MaintenanceEventRecord> => {
  // Validate maintenance exists
  const maintenance = await db.getMaintenanceById(data.maintenance_id);
  if (!maintenance) {
    throw new Error(`Maintenance with id ${data.maintenance_id} does not exist`);
  }

  // Validate times
  if (data.end_date_time <= data.start_date_time) {
    throw new Error("End date/time must be after start date/time");
  }

  const event = await db.createMaintenanceEvent({
    maintenance_id: data.maintenance_id,
    start_date_time: data.start_date_time,
    end_date_time: data.end_date_time,
    status: "SCHEDULED",
  });

  return event;
};

export const GetMaintenanceEventById = async (id: number): Promise<MaintenanceEventRecord | null> => {
  const event = await db.getMaintenanceEventById(id);
  if (!event) return null;
  return event;
};

export const GetMaintenanceEventsByMaintenanceId = async (
  maintenance_id: number,
): Promise<MaintenanceEventRecord[]> => {
  return await db.getMaintenanceEventsByMaintenanceId(maintenance_id);
};

export const UpdateMaintenanceEvent = async (
  id: number,
  data: Partial<MaintenanceEventRecordInsert>,
): Promise<number> => {
  const existing = await db.getMaintenanceEventById(id);
  if (!existing) {
    throw new Error(`Maintenance event with id ${id} does not exist`);
  }

  // Validate times if both provided
  const startTime = data.start_date_time || existing.start_date_time;
  const endTime = data.end_date_time || existing.end_date_time;
  if (endTime <= startTime) {
    throw new Error("End date/time must be after start date/time");
  }

  return await db.updateMaintenanceEvent(id, data);
};

export const UpdateMaintenanceEventStatus = async (id: number, status: string): Promise<number> => {
  const validStatuses = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const existing = await db.getMaintenanceEventById(id);
  if (!existing) {
    throw new Error(`Maintenance event with id ${id} does not exist`);
  }

  return await db.updateMaintenanceEventStatus(id, status);
};

export const DeleteMaintenanceEvent = async (id: number): Promise<number> => {
  const existing = await db.getMaintenanceEventById(id);
  if (!existing) {
    throw new Error(`Maintenance event with id ${id} does not exist`);
  }

  return await db.deleteMaintenanceEvent(id);
};

// ============ Maintenance Monitors ============

export const AddMonitorToMaintenance = async (maintenance_id: number, monitor_tag: string): Promise<void> => {
  const maintenance = await db.getMaintenanceById(maintenance_id);
  if (!maintenance) {
    throw new Error(`Maintenance with id ${maintenance_id} does not exist`);
  }

  // Verify monitor exists
  const monitor = await db.getMonitorByTag(monitor_tag);
  if (!monitor) {
    throw new Error(`Monitor with tag ${monitor_tag} does not exist`);
  }

  await db.addMonitorToMaintenance({ maintenance_id, monitor_tag });
};

export const RemoveMonitorFromMaintenance = async (maintenance_id: number, monitor_tag: string): Promise<number> => {
  const maintenance = await db.getMaintenanceById(maintenance_id);
  if (!maintenance) {
    throw new Error(`Maintenance with id ${maintenance_id} does not exist`);
  }

  return await db.removeMonitorFromMaintenance(maintenance_id, monitor_tag);
};

export const GetMaintenanceMonitors = async (
  maintenance_id: number,
): Promise<Array<{ monitor_tag: string; monitor_impact: string }>> => {
  const records = await db.getMaintenanceMonitors(maintenance_id);
  return records.map((r) => ({ monitor_tag: r.monitor_tag, monitor_impact: r.monitor_impact }));
};

export const UpdateMaintenanceMonitorImpact = async (
  maintenance_id: number,
  monitor_tag: string,
  monitor_impact: "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE",
): Promise<number> => {
  const maintenance = await db.getMaintenanceById(maintenance_id);
  if (!maintenance) {
    throw new Error(`Maintenance with id ${maintenance_id} does not exist`);
  }

  // Verify monitor is attached to this maintenance
  const monitors = await db.getMaintenanceMonitors(maintenance_id);
  const monitorExists = monitors.some((m) => m.monitor_tag === monitor_tag);
  if (!monitorExists) {
    throw new Error(`Monitor ${monitor_tag} is not attached to maintenance ${maintenance_id}`);
  }

  return await db.updateMonitorImpactInMaintenanceMonitors(maintenance_id, monitor_tag, monitor_impact);
};

// ============ Status Page Queries ============

export const GetActiveMaintenancesForStatusPage = async (
  start: number,
  end: number,
): Promise<MaintenanceEventRecord[]> => {
  // Get events in the time range
  const events = await db.getActiveMaintenanceEvents(start, end);
  return events;
};

export const GetMaintenanceEventsForMonitor = async (
  monitor_tag: string,
  start: number,
  end: number,
): Promise<MaintenanceEventRecord[]> => {
  return await db.getMaintenanceEventsForMonitor(monitor_tag, start, end);
};

// ============ Helper to check if RRULE is one-time ============
export const isOneTimeRrule = (rrule: string): boolean => {
  // One-time RRULEs typically have COUNT=1
  return rrule.includes("COUNT=1");
};

// ============ Helper to format duration ============
export const formatDurationSeconds = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

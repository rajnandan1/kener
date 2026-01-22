import db from "../db/db.js";
import type {
  MonitorRecordInsert,
  TriggerRecordInsert,
  MonitoringDataInsert,
  MonitorAlertInsert,
  IncidentFilter,
  MonitorAlert,
  TriggerFilter,
  SubscriberRecordInsert,
  UserRecordInsert,
  UserRecord,
  MonitorRecordTyped,
  IncidentRecord,
  IncidentCommentRecord,
} from "../types/db.js";
import * as queueController from "./queueController.js";
import type { NumberWithChange } from "../../types/monitor.js";

interface IncidentsDashboardInput {
  page: number;
  limit: number;
  filter: {
    status: string;
  };
}

interface IncidentInput {
  title: string;
  start_date_time: number;
  end_date_time?: number | null;
  status?: string;
  state?: string;
  incident_type?: string;
  incident_source?: string;
}

interface IncidentUpdateInput {
  title?: string;
  start_date_time?: number;
  end_date_time?: number | null;
  status?: string;
  state?: string;
}

export const GetIncidentsOpenHome = async (
  homeIncidentCount: number | null,
  start: number,
  end: number,
): Promise<unknown[]> => {
  homeIncidentCount = parseInt(String(homeIncidentCount));

  if (homeIncidentCount < 0) {
    homeIncidentCount = 0;
  }

  if (homeIncidentCount === 0) {
    return [];
  }
  let incidents = (await db.getRecentUpdatedIncidents(homeIncidentCount, start, end)) as (IncidentRecord & {
    monitors?: unknown[];
    comments?: unknown[];
  })[];
  for (let i = 0; i < incidents.length; i++) {
    incidents[i].monitors = await GetIncidentMonitors(incidents[i].id);
  }

  //get comments
  for (let i = 0; i < incidents.length; i++) {
    incidents[i].comments = await GetIncidentActiveComments(incidents[i].id);
  }

  return incidents;
};

export const GetIncidentComments = async (incident_id: number): Promise<IncidentCommentRecord[]> => {
  let incidentExists = await db.getIncidentById(incident_id);
  if (!incidentExists) {
    throw new Error(`Incident with id ${incident_id} does not exist`);
  }
  return await db.getIncidentComments(incident_id);
};
export const GetIncidentActiveComments = async (incident_id: number): Promise<IncidentCommentRecord[]> => {
  let incidentExists = await db.getIncidentById(incident_id);
  if (!incidentExists) {
    throw new Error(`Incident with id ${incident_id} does not exist`);
  }
  return await db.getActiveIncidentComments(incident_id);
};

export const GetIncidentMonitors = async (
  incident_id: number,
): Promise<Array<{ monitor_tag: string; monitor_impact: string | null }>> => {
  let incidentExists = await db.getIncidentById(incident_id);
  if (!incidentExists) {
    throw new Error(`Incident with id ${incident_id} does not exist`);
  }
  let incidentMonitors = await db.getIncidentMonitorsByIncidentID(incident_id);
  return incidentMonitors.map((m) => ({
    monitor_tag: m.monitor_tag,
    monitor_impact: m.monitor_impact,
  }));
};

export const RemoveIncidentMonitor = async (incident_id: number, monitor_tag: string): Promise<number> => {
  let incidentExists = await db.getIncidentById(incident_id);
  if (!incidentExists) {
    throw new Error(`Incident with id ${incident_id} does not exist`);
  }
  return await db.removeIncidentMonitor(incident_id, monitor_tag);
};

export const GetIncidentsDashboard = async (
  data: IncidentsDashboardInput,
): Promise<{ incidents: unknown[]; total: number }> => {
  let filter: IncidentFilter = {};
  if (data.filter.status != "ALL") {
    filter = { status: data.filter.status };
  }

  let incidents = (await db.getIncidentsPaginatedDesc(data.page, data.limit, filter)) as (IncidentRecord & {
    monitors?: unknown[];
    isAutoCreated?: boolean;
  })[];
  let totalResult = await db.getIncidentsCount(filter);
  let total = totalResult ? Number(totalResult.count) : 0;

  for (let i = 0; i < incidents.length; i++) {
    incidents[i].monitors = await GetIncidentMonitors(incidents[i].id);
    incidents[i].isAutoCreated = await db.alertExistsIncident(incidents[i].id);
  }

  return {
    incidents: incidents,
    total: total,
  };
};
export const GetIncidentByIDDashboard = async (data: {
  incident_id: number;
}): Promise<Omit<IncidentRecord, "incident_source"> | undefined> => {
  let incident = await db.getIncidentById(data.incident_id);

  return incident;
};
export const GetIncidentsPaginated = async (
  page: number,
  limit: number,
  filter: IncidentFilter,
  direction: "after" | "before",
): Promise<unknown[]> => {
  let incidents = (await db.getIncidentsPaginated(page, limit, filter, direction)) as (IncidentRecord & {
    monitors?: Array<{ monitor_tag: string; monitor_impact: string | null }>;
    comments?: unknown[];
  })[];

  let allMonitors: Record<string, unknown> = {};

  for (let i = 0; i < incidents.length; i++) {
    let incidentMonitors = await GetIncidentMonitors(incidents[i].id);
    incidents[i].monitors = incidentMonitors;
  }

  //for each monitor tag, in monitorsTagAndImpact for every incident, call get monitor by tag
  for (let i = 0; i < incidents.length; i++) {
    const monitors = incidents[i].monitors || [];
    for (let j = 0; j < monitors.length; j++) {
      let monitorTag = monitors[j].monitor_tag;
      let monitorImpact = monitors[j].monitor_impact;
      if (!allMonitors[monitorTag]) {
        let monitor = await db.getMonitorByTag(monitorTag);
        if (monitor) {
          allMonitors[monitorTag] = {
            id: monitor.id,
            tag: monitor.tag,
            name: monitor.name,
            image: monitor.image,
            impact_type: monitorImpact,
          };
        }
      }
      (incidents[i].monitors as unknown[])[j] = allMonitors[monitorTag];
    }
  }

  //get comments
  for (let i = 0; i < incidents.length; i++) {
    incidents[i].comments = await GetIncidentActiveComments(incidents[i].id);
  }

  return incidents;
};
export const GetIncidentsPage = async (start: number, open: number): Promise<unknown[]> => {
  let incidents = (await db.getIncidentsBetween(start, open)) as (IncidentRecord & {
    monitors?: unknown[];
    comments?: unknown[];
  })[];
  for (let i = 0; i < incidents.length; i++) {
    incidents[i].monitors = await GetIncidentMonitors(incidents[i].id);
  }

  //get comments
  for (let i = 0; i < incidents.length; i++) {
    incidents[i].comments = await GetIncidentActiveComments(incidents[i].id);
  }

  return incidents;
};
export const GetIncidentsByIDS = async (ids: number[]): Promise<unknown[]> => {
  if (ids.length == 0) {
    return [];
  }
  let incidents = (await db.getIncidentsByIds(ids)) as (IncidentRecord & {
    monitors?: unknown[];
    comments?: unknown[];
  })[];
  for (let i = 0; i < incidents.length; i++) {
    incidents[i].monitors = [];
  }

  //get comments
  for (let i = 0; i < incidents.length; i++) {
    incidents[i].comments = await GetIncidentActiveComments(incidents[i].id);
  }

  return incidents;
};

export const CreateIncident = async (data: IncidentInput): Promise<{ incident_id: number }> => {
  //return error if no title or startDateTime
  if (!data.title || !data.start_date_time) {
    throw new Error("Title and startDateTime are required");
  }

  let incident = {
    title: data.title,
    start_date_time: data.start_date_time,
    status: !!data.status ? data.status : "OPEN",
    end_date_time: !!data.end_date_time ? data.end_date_time : null,
    state: !!data.state ? data.state : "INVESTIGATING",
    incident_type: !!data.incident_type ? data.incident_type : "INCIDENT",
    incident_source: !!data.incident_source ? data.incident_source : "DASHBOARD",
  };

  //incident_type == INCIDENT delete endDateTime
  if (incident.incident_type === "INCIDENT") {
    incident.end_date_time = null;
  }

  //if endDateTime is provided and it is less than startDateTime, throw error
  if (!!incident.end_date_time && incident.end_date_time < incident.start_date_time) {
    throw new Error("End date time cannot be less than start date time");
  }

  let newIncident = await db.createIncident(incident);
  queueController.PushDataToQueue(newIncident.id, "createIncident", {
    message: `${incident.incident_type} Created`,
    ...incident,
  });
  return {
    incident_id: newIncident.id,
  };
};

export const UpdateIncident = async (incident_id: number, data: IncidentUpdateInput): Promise<number> => {
  let incidentExists = await db.getIncidentById(incident_id);

  if (!incidentExists) {
    throw new Error(`Incident with id ${incident_id} does not exist`);
  }

  let endDateTime = data.end_date_time;
  if (endDateTime && endDateTime < incidentExists.start_date_time) {
    throw new Error("End date time cannot be less than start date time");
  }

  let updateObject: Partial<IncidentRecord> & { id: number } = {
    id: incident_id,
    title: data.title || incidentExists.title,
    start_date_time: data.start_date_time || incidentExists.start_date_time,
    status: data.status || incidentExists.status,
    state: data.state || incidentExists.state,
    end_date_time: data.end_date_time || incidentExists.end_date_time,
  };

  //check if updateObject same as incidentExists
  if (
    JSON.stringify(updateObject) ===
    JSON.stringify({
      id: incidentExists.id,
      title: incidentExists.title,
      start_date_time: incidentExists.start_date_time,
      status: incidentExists.status,
      state: incidentExists.state,
      end_date_time: incidentExists.end_date_time,
    })
  ) {
    queueController.PushDataToQueue(incident_id, "updateIncident", {
      message: `${incidentExists.incident_type} has been updated to ${updateObject.state}`,
      incident_type: incidentExists.incident_type,
      title: incidentExists.title,
    });
  }

  return await db.updateIncident(updateObject as IncidentRecord);
};

export const AddIncidentMonitor = async (
  incident_id: number,
  monitor_tag: string,
  monitor_impact: string,
): Promise<number[]> => {
  //monitor_impact must be DOWN or DEGRADED or MAINTENANCE or NONE
  if (!["DOWN", "DEGRADED", "MAINTENANCE"].includes(monitor_impact)) {
    throw new Error("Monitor impact must be either DOWN, DEGRADED, MAINTENANCE");
  }

  //check if monitor exists
  let monitorExists = await db.getMonitorByTag(monitor_tag);
  if (!monitorExists) {
    throw new Error(`Monitor with tag ${monitor_tag} does not exist`);
  }

  //check if incident exists
  let incidentExists = await db.getIncidentById(incident_id);
  if (!incidentExists) {
    throw new Error(`Incident with id ${incident_id} does not exist`);
  }

  queueController.PushDataToQueue(incident_id, "insertIncidentMonitor", {
    title: incidentExists.title,
    message: `Monitor ${monitor_tag} added to ${incidentExists.incident_type}. Impact is ${monitor_impact}`,
    incident_type: incidentExists.incident_type,
  });
  return await db.insertIncidentMonitorWithMerge({
    incident_id,
    monitor_tag,
    monitor_impact,
  });
};

export const UpdateCommentByID = async (
  incident_id: number,
  comment_id: number,
  comment: string,
  state: string,
  commented_at: number,
): Promise<number> => {
  let incidentExists = await db.getIncidentById(incident_id);
  if (!incidentExists) {
    throw new Error(`Incident with id ${incident_id} does not exist`);
  }
  let commentExists = await db.getIncidentCommentByIDAndIncident(incident_id, comment_id);
  if (!commentExists) {
    throw new Error(`Comment with id ${comment_id} does not exist`);
  }
  queueController.PushDataToQueue(incident_id, "updateIncidentComment", {
    title: incidentExists.title,
    message: `${comment}`,
    incident_type: incidentExists.incident_type,
  });
  let c = await db.updateIncidentCommentByID(comment_id, comment, state, commented_at);
  if (c) {
    let incidentUpdate: IncidentUpdateInput = {
      state: state,
    };
    if (state === "RESOLVED") {
      incidentUpdate.end_date_time = commented_at;
    } else {
      if (incidentExists.state === "RESOLVED") {
        await db.setIncidentEndTimeToNull(incident_id);
      }
    }
    await UpdateIncident(incident_id, incidentUpdate);
  }
  return c;
};
export const AddIncidentComment = async (
  incident_id: number,
  comment: string,
  state: string,
  commented_at: number,
): Promise<number[]> => {
  let incidentExists = await db.getIncidentById(incident_id);
  if (!incidentExists) {
    throw new Error(`Incident with id ${incident_id} does not exist`);
  }

  if (!!!state) {
    state = incidentExists.state;
  }
  queueController.PushDataToQueue(incident_id, "insertIncidentComment", {
    title: incidentExists.title,
    message: `${comment}`,
    incident_type: incidentExists.incident_type,
  });
  let c = await db.insertIncidentComment(incident_id, comment, state, commented_at);
  let incidentType = incidentExists.incident_type;
  //update incident state
  if (c && incidentType === "INCIDENT") {
    let incidentUpdate: IncidentUpdateInput = {
      state: state,
    };
    if (state === "RESOLVED") {
      incidentUpdate.end_date_time = commented_at;
    } else {
      if (incidentExists.state === "RESOLVED") {
        await db.setIncidentEndTimeToNull(incident_id);
      }
    }
    await UpdateIncident(incident_id, incidentUpdate);
  }

  return c;
};

export const UpdateCommentStatusByID = async (
  incident_id: number,
  comment_id: number,
  status: string,
): Promise<number> => {
  let commentExists = await db.getIncidentCommentByIDAndIncident(incident_id, comment_id);
  if (!commentExists) {
    throw new Error(`Comment with id ${comment_id} does not exist`);
  }
  return await db.updateIncidentCommentStatusByID(comment_id, status);
};

export const ParseIncidentToAPIResp = async (
  incident_id: number,
): Promise<{
  id: number;
  start_date_time: number;
  end_date_time: number | null;
  created_at: Date;
  updated_at: Date;
  title: string;
  status: string;
  state: string;
}> => {
  let incident = await db.getIncidentById(incident_id);
  if (!incident) {
    throw new Error(`Incident with id ${incident_id} not found`);
  }
  let resp = {
    id: incident.id,
    start_date_time: incident.start_date_time,
    end_date_time: incident.end_date_time,
    created_at: incident.created_at,
    updated_at: incident.updated_at,
    title: incident.title,
    status: incident.status,
    state: incident.state,
  };

  return resp;
};

import db from "../db/db.js";
import type {
  MonitorAlertConfigRecord,
  MonitorAlertConfigInsert,
  MonitorAlertConfigUpdate,
  MonitorAlertConfigFilter,
  MonitorAlertConfigWithTriggers,
  MonitorAlertConfigCreateInput,
  MonitorAlertConfigUpdateInput,
  AlertForType,
  AlertSeverityType,
  YesNoType,
  MonitorAlertV2Record,
  MonitorAlertV2Insert,
  MonitorAlertV2Filter,
  MonitorAlertStatusType,
  MonitorAlertV2WithConfig,
  TriggerRecord,
} from "../types/db.js";

// Re-export types for convenience
export type {
  MonitorAlertConfigRecord,
  MonitorAlertConfigWithTriggers,
  MonitorAlertConfigCreateInput,
  MonitorAlertConfigUpdateInput,
  AlertForType,
  AlertSeverityType,
  YesNoType,
  MonitorAlertV2Record,
  MonitorAlertStatusType,
  MonitorAlertV2WithConfig,
};

// ============ Validation ============

const VALID_ALERT_FOR: AlertForType[] = ["STATUS", "LATENCY", "UPTIME"];
const VALID_SEVERITY: AlertSeverityType[] = ["CRITICAL", "WARNING"];
const VALID_YES_NO: YesNoType[] = ["YES", "NO"];
const VALID_STATUS_VALUES = ["DOWN", "DEGRADED", "UP"];

function validateAlertFor(value: string): asserts value is AlertForType {
  if (!VALID_ALERT_FOR.includes(value as AlertForType)) {
    throw new Error(`Invalid alert_for value: ${value}. Must be one of: ${VALID_ALERT_FOR.join(", ")}`);
  }
}

function validateSeverity(value: string): asserts value is AlertSeverityType {
  if (!VALID_SEVERITY.includes(value as AlertSeverityType)) {
    throw new Error(`Invalid severity value: ${value}. Must be one of: ${VALID_SEVERITY.join(", ")}`);
  }
}

function validateYesNo(value: string): asserts value is YesNoType {
  if (!VALID_YES_NO.includes(value as YesNoType)) {
    throw new Error(`Invalid value: ${value}. Must be one of: ${VALID_YES_NO.join(", ")}`);
  }
}

function validateAlertValue(alertFor: AlertForType, alertValue: string): void {
  if (alertFor === "STATUS") {
    if (!VALID_STATUS_VALUES.includes(alertValue)) {
      throw new Error(
        `Invalid alert_value for STATUS alert: ${alertValue}. Must be one of: ${VALID_STATUS_VALUES.join(", ")}`,
      );
    }
  } else if (alertFor === "LATENCY") {
    const numValue = Number(alertValue);
    if (isNaN(numValue) || numValue <= 0) {
      throw new Error(`Invalid alert_value for LATENCY alert: ${alertValue}. Must be a positive number (milliseconds)`);
    }
  } else if (alertFor === "UPTIME") {
    const numValue = Number(alertValue);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      throw new Error(
        `Invalid alert_value for UPTIME alert: ${alertValue}. Must be a number between 0 and 100 (percentage)`,
      );
    }
  }
}

function validateThreshold(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Invalid ${fieldName}: ${value}. Must be a positive integer >= 1`);
  }
}

function validateMonitorAlertConfigInput(data: MonitorAlertConfigCreateInput | MonitorAlertConfigUpdateInput): void {
  if ("alert_for" in data && data.alert_for) {
    validateAlertFor(data.alert_for);
  }

  if ("severity" in data && data.severity) {
    validateSeverity(data.severity);
  }

  if ("create_incident" in data && data.create_incident) {
    validateYesNo(data.create_incident);
  }

  if ("is_active" in data && data.is_active) {
    validateYesNo(data.is_active);
  }

  if ("failure_threshold" in data && data.failure_threshold !== undefined) {
    validateThreshold(data.failure_threshold, "failure_threshold");
  }

  if ("success_threshold" in data && data.success_threshold !== undefined) {
    validateThreshold(data.success_threshold, "success_threshold");
  }

  // Validate alert_value based on alert_for
  if ("alert_for" in data && data.alert_for && "alert_value" in data && data.alert_value) {
    validateAlertValue(data.alert_for, data.alert_value);
  }
}

// ============ Create Operations ============

/**
 * Create a new monitor alert config with optional triggers
 */
export async function CreateMonitorAlertConfig(
  data: MonitorAlertConfigCreateInput,
): Promise<MonitorAlertConfigWithTriggers> {
  // Validate input
  validateMonitorAlertConfigInput(data);

  if (!data.monitor_tag) {
    throw new Error("monitor_tag is required");
  }

  // Check if monitor exists
  const monitor = await db.getMonitorByTag(data.monitor_tag);
  if (!monitor) {
    throw new Error(`Monitor with tag '${data.monitor_tag}' not found`);
  }

  // Prepare insert data
  const insertData: MonitorAlertConfigInsert = {
    monitor_tag: data.monitor_tag,
    alert_for: data.alert_for,
    alert_value: data.alert_value,
    failure_threshold: data.failure_threshold,
    success_threshold: data.success_threshold,
    alert_description: data.alert_description || null,
    create_incident: data.create_incident || "NO",
    is_active: data.is_active || "YES",
    severity: data.severity || "WARNING",
  };

  // Insert alert config
  const id = await db.insertMonitorAlertConfig(insertData);

  // Add triggers if provided
  if (data.trigger_ids && data.trigger_ids.length > 0) {
    await db.addTriggersToMonitorAlertConfig(id, data.trigger_ids);
  }

  // Return the created config with triggers
  const result = await db.getMonitorAlertConfigWithTriggers(id);
  if (!result) {
    throw new Error("Failed to retrieve created monitor alert config");
  }

  return result;
}

// ============ Update Operations ============

/**
 * Update an existing monitor alert config with optional trigger updates
 */
export async function UpdateMonitorAlertConfig(
  data: MonitorAlertConfigUpdateInput,
): Promise<MonitorAlertConfigWithTriggers> {
  // Validate input
  validateMonitorAlertConfigInput(data);

  if (!data.id) {
    throw new Error("id is required for update");
  }

  // Check if alert config exists
  const existingConfig = await db.getMonitorAlertConfigById(data.id);
  if (!existingConfig) {
    throw new Error(`Monitor alert config with id '${data.id}' not found`);
  }

  // If alert_value is being updated, we need alert_for for validation
  if (data.alert_value !== undefined) {
    const alertFor = data.alert_for || existingConfig.alert_for;
    validateAlertValue(alertFor, data.alert_value);
  }

  // Prepare update data
  const updateData: MonitorAlertConfigUpdate = {};
  if (data.alert_for !== undefined) updateData.alert_for = data.alert_for;
  if (data.alert_value !== undefined) updateData.alert_value = data.alert_value;
  if (data.failure_threshold !== undefined) updateData.failure_threshold = data.failure_threshold;
  if (data.success_threshold !== undefined) updateData.success_threshold = data.success_threshold;
  if (data.alert_description !== undefined) updateData.alert_description = data.alert_description;
  if (data.create_incident !== undefined) updateData.create_incident = data.create_incident;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  if (data.severity !== undefined) updateData.severity = data.severity;

  // Update alert config if there are changes
  if (Object.keys(updateData).length > 0) {
    await db.updateMonitorAlertConfig(data.id, updateData);
  }

  // Update triggers if provided
  if (data.trigger_ids !== undefined) {
    await db.replaceMonitorAlertConfigTriggers(data.id, data.trigger_ids);
  }

  // Return the updated config with triggers
  const result = await db.getMonitorAlertConfigWithTriggers(data.id);
  if (!result) {
    throw new Error("Failed to retrieve updated monitor alert config");
  }

  return result;
}

/**
 * Toggle the active status of a monitor alert config
 */
export async function ToggleMonitorAlertConfigStatus(id: number): Promise<MonitorAlertConfigRecord> {
  const config = await db.getMonitorAlertConfigById(id);
  if (!config) {
    throw new Error(`Monitor alert config with id '${id}' not found`);
  }

  const newStatus: YesNoType = config.is_active === "YES" ? "NO" : "YES";
  await db.updateMonitorAlertConfig(id, { is_active: newStatus });

  const updatedConfig = await db.getMonitorAlertConfigById(id);
  if (!updatedConfig) {
    throw new Error("Failed to retrieve updated monitor alert config");
  }

  return updatedConfig;
}

// ============ Read Operations ============

/**
 * Get a single monitor alert config by ID with triggers
 */
export async function GetMonitorAlertConfigById(id: number): Promise<MonitorAlertConfigWithTriggers | undefined> {
  return await db.getMonitorAlertConfigWithTriggers(id);
}

/**
 * Get all monitor alert configs for a specific monitor with triggers
 */
export async function GetMonitorAlertConfigsByMonitorTag(
  monitorTag: string,
): Promise<MonitorAlertConfigWithTriggers[]> {
  return await db.getMonitorAlertConfigsWithTriggersByMonitorTag(monitorTag);
}

/**
 * Get all monitor alert configs with optional filtering (without triggers)
 */
export async function GetMonitorAlertConfigs(filter: MonitorAlertConfigFilter): Promise<MonitorAlertConfigRecord[]> {
  return await db.getMonitorAlertConfigs(filter);
}

/**
 * Get all active monitor alert configs with triggers
 */
export async function GetActiveMonitorAlertConfigsWithTriggers(): Promise<MonitorAlertConfigWithTriggers[]> {
  return await db.getActiveMonitorAlertConfigsWithTriggers();
}

/**
 * Get all active monitor alert configs for a specific monitor with triggers
 */
export async function GetActiveMonitorAlertConfigsByMonitorTag(
  monitorTag: string,
): Promise<MonitorAlertConfigWithTriggers[]> {
  const configs = await db.getActiveMonitorAlertConfigsByMonitorTag(monitorTag);
  const result: MonitorAlertConfigWithTriggers[] = [];

  for (const config of configs) {
    const configWithTriggers = await db.getMonitorAlertConfigWithTriggers(config.id);
    if (configWithTriggers) {
      result.push(configWithTriggers);
    }
  }

  return result;
}

// ============ Delete Operations ============

/**
 * Delete a monitor alert config by ID
 */
export async function DeleteMonitorAlertConfig(id: number): Promise<boolean> {
  const config = await db.getMonitorAlertConfigById(id);
  if (!config) {
    throw new Error(`Monitor alert config with id '${id}' not found`);
  }

  // Triggers will be deleted automatically due to CASCADE
  const deleted = await db.deleteMonitorAlertConfig(id);
  return deleted > 0;
}

/**
 * Delete all monitor alert configs for a specific monitor
 */
export async function DeleteMonitorAlertConfigsByMonitorTag(monitorTag: string): Promise<number> {
  return await db.deleteMonitorAlertConfigsByMonitorTag(monitorTag);
}

// ============ Trigger Operations ============

/**
 * Add a trigger to a monitor alert config
 */
export async function AddTriggerToMonitorAlertConfig(monitorAlertsId: number, triggerId: number): Promise<void> {
  const config = await db.getMonitorAlertConfigById(monitorAlertsId);
  if (!config) {
    throw new Error(`Monitor alert config with id '${monitorAlertsId}' not found`);
  }

  const trigger = await db.getTriggerByID(triggerId);
  if (!trigger) {
    throw new Error(`Trigger with id '${triggerId}' not found`);
  }

  await db.addTriggerToMonitorAlertConfig({ monitor_alerts_id: monitorAlertsId, trigger_id: triggerId });
}

/**
 * Remove a trigger from a monitor alert config
 */
export async function RemoveTriggerFromMonitorAlertConfig(monitorAlertsId: number, triggerId: number): Promise<void> {
  await db.removeTriggerFromMonitorAlertConfig(monitorAlertsId, triggerId);
}

/**
 * Get trigger IDs for a monitor alert config
 */
export async function GetMonitorAlertConfigTriggerIds(monitorAlertsId: number): Promise<number[]> {
  return await db.getMonitorAlertConfigTriggerIds(monitorAlertsId);
}

// ============ Utility Operations ============

/**
 * Check if a trigger is used in any monitor alert config
 */
export async function IsTriggerUsedInMonitorAlertConfig(triggerId: number): Promise<boolean> {
  return await db.isTriggerUsedInMonitorAlertConfig(triggerId);
}

/**
 * Get all monitor alert configs that use a specific trigger
 */
export async function GetMonitorAlertConfigsByTriggerId(triggerId: number): Promise<MonitorAlertConfigRecord[]> {
  return await db.getMonitorAlertConfigsByTriggerId(triggerId);
}

/**
 * Get count of monitor alert configs with optional filtering
 */
export async function GetMonitorAlertConfigsCount(filter: MonitorAlertConfigFilter): Promise<number> {
  const result = await db.getMonitorAlertConfigsCount(filter);
  return Number(result?.count || 0);
}

/**
 * Get paginated monitor alert configs with triggers
 */
export async function GetMonitorAlertConfigsPaginated(
  page: number,
  limit: number,
  filter?: MonitorAlertConfigFilter,
): Promise<{ configs: MonitorAlertConfigWithTriggers[]; total: number }> {
  const result = await db.getMonitorAlertConfigsPaginated(page, limit, filter);
  const configs: MonitorAlertConfigWithTriggers[] = [];

  for (const config of result.configs) {
    const configWithTriggers = await db.getMonitorAlertConfigWithTriggers(config.id);
    if (configWithTriggers) {
      configs.push(configWithTriggers);
    }
  }

  return { configs, total: result.total };
}

/**
 * Get all triggers for a monitor alert config with parsed trigger_meta
 */
export async function GetTriggersByMonitorAlertConfigId(monitorAlertsId: number): Promise<TriggerRecord[]> {
  const triggerIds = await db.getMonitorAlertConfigTriggerIds(monitorAlertsId);

  return await db.getTriggersByIDs(triggerIds);
}

// ============ Monitor Alerts V2 Operations ============

const VALID_ALERT_STATUS: MonitorAlertStatusType[] = ["TRIGGERED", "RESOLVED"];

function validateAlertStatus(value: string): asserts value is MonitorAlertStatusType {
  if (!VALID_ALERT_STATUS.includes(value as MonitorAlertStatusType)) {
    throw new Error(`Invalid alert_status value: ${value}. Must be one of: ${VALID_ALERT_STATUS.join(", ")}`);
  }
}

/**
 * Create a new triggered alert for a config
 */
export async function CreateMonitorAlertV2(
  configId: number,
  incidentId?: number | null,
): Promise<MonitorAlertV2Record> {
  // Check if config exists
  const config = await db.getMonitorAlertConfigById(configId);
  if (!config) {
    throw new Error(`Monitor alert config with id '${configId}' not found`);
  }

  // Check if incident exists if provided
  if (incidentId) {
    const incident = await db.getIncidentById(incidentId);
    if (!incident) {
      throw new Error(`Incident with id '${incidentId}' not found`);
    }
  }

  const insertData: MonitorAlertV2Insert = {
    config_id: configId,
    incident_id: incidentId || null,
    alert_status: "TRIGGERED",
  };

  const result = await db.insertMonitorAlertV2(insertData);
  if (!result) {
    throw new Error("Failed to retrieve created monitor alert");
  }

  return result;
}

/**
 * Update alert status (TRIGGERED -> RESOLVED or vice versa)
 */
export async function UpdateMonitorAlertV2Status(
  id: number,
  alertStatus: MonitorAlertStatusType,
): Promise<MonitorAlertV2Record> {
  validateAlertStatus(alertStatus);

  const alert = await db.getMonitorAlertV2ById(id);
  if (!alert) {
    throw new Error(`Monitor alert with id '${id}' not found`);
  }

  await db.updateMonitorAlertV2Status(id, alertStatus);

  const updatedAlert = await db.getMonitorAlertV2ById(id);
  if (!updatedAlert) {
    throw new Error("Failed to retrieve updated monitor alert");
  }

  return updatedAlert;
}

/**
 * Resolve an active alert for a config
 */
export async function ResolveAlertForConfig(configId: number): Promise<MonitorAlertV2Record | null> {
  const activeAlert = await db.getActiveAlertForConfig(configId);
  if (!activeAlert) {
    return null; // No active alert to resolve
  }

  return await UpdateMonitorAlertV2Status(activeAlert.id, "RESOLVED");
}

/**
 * Check if there's an active (TRIGGERED) alert for a config
 */
export async function HasTriggeredAlertForConfig(configId: number): Promise<boolean> {
  return await db.hasTriggeredAlertForConfig(configId);
}

/**
 * Get the active alert for a config
 */
export async function GetActiveAlertForConfig(configId: number): Promise<MonitorAlertV2Record | undefined> {
  return await db.getActiveAlertForConfig(configId);
}

/**
 * Get a monitor alert v2 by ID
 */
export async function GetMonitorAlertV2ById(id: number): Promise<MonitorAlertV2Record | undefined> {
  return await db.getMonitorAlertV2ById(id);
}

/**
 * Get a monitor alert v2 by ID with config details
 */
export async function GetMonitorAlertV2WithConfig(id: number): Promise<MonitorAlertV2WithConfig | undefined> {
  return await db.getMonitorAlertV2WithConfig(id);
}

/**
 * Get all alerts for a specific config
 */
export async function GetMonitorAlertsV2ByConfigId(configId: number): Promise<MonitorAlertV2Record[]> {
  return await db.getMonitorAlertsV2ByConfigId(configId);
}

/**
 * Get all triggered alerts
 */
export async function GetAllTriggeredAlerts(): Promise<MonitorAlertV2Record[]> {
  return await db.getAllTriggeredAlerts();
}

/**
 * Get all triggered alerts with their config details
 */
export async function GetAllTriggeredAlertsWithConfig(): Promise<MonitorAlertV2WithConfig[]> {
  return await db.getAllTriggeredAlertsWithConfig();
}

/**
 * Add incident ID to an existing alert
 */
export async function AddIncidentToAlert(alertId: number, incidentId: number): Promise<MonitorAlertV2Record> {
  const alert = await db.getMonitorAlertV2ById(alertId);
  if (!alert) {
    throw new Error(`Monitor alert with id '${alertId}' not found`);
  }

  const incident = await db.getIncidentById(incidentId);
  if (!incident) {
    throw new Error(`Incident with id '${incidentId}' not found`);
  }

  await db.addIncidentToAlert(alertId, incidentId);

  const updatedAlert = await db.getMonitorAlertV2ById(alertId);
  if (!updatedAlert) {
    throw new Error("Failed to retrieve updated monitor alert");
  }

  return updatedAlert;
}

/**
 * Get all alerts associated with an incident
 */
export async function GetAlertsByIncidentId(incidentId: number): Promise<MonitorAlertV2Record[]> {
  return await db.getAlertsByIncidentId(incidentId);
}

/**
 * Get alerts with optional filtering
 */
export async function GetMonitorAlertsV2(filter: MonitorAlertV2Filter): Promise<MonitorAlertV2Record[]> {
  return await db.getMonitorAlertsV2(filter);
}

/**
 * Get count of alerts with optional filtering
 */
export async function GetMonitorAlertsV2Count(filter: MonitorAlertV2Filter): Promise<number> {
  const result = await db.getMonitorAlertsV2Count(filter);
  return Number(result?.count || 0);
}

/**
 * Get paginated alerts with config details
 */
export async function GetMonitorAlertsV2Paginated(
  page: number,
  limit: number,
  filter?: MonitorAlertV2Filter,
): Promise<{ alerts: MonitorAlertV2WithConfig[]; total: number }> {
  return await db.getMonitorAlertsV2Paginated(page, limit, filter);
}

/**
 * Delete a monitor alert v2
 */
export async function DeleteMonitorAlertV2(id: number): Promise<boolean> {
  const alert = await db.getMonitorAlertV2ById(id);
  if (!alert) {
    throw new Error(`Monitor alert with id '${id}' not found`);
  }

  const deleted = await db.deleteMonitorAlertV2(id);
  return deleted > 0;
}

import db from "../db/db.js";
import type { TriggerRecordInsert, TriggerFilter, TriggerRecord } from "../types/db.js";
import { ValidateEmail } from "../tool.js";
import { LabelsFor, MaskStoredSecrets, RestoreStoredSecrets, TRIGGER_LABELS } from "../storedSecrets.js";

interface TriggerInput extends TriggerRecordInsert {
  id?: number;
  trigger_meta: string;
}

const triggerLabels = (type: string | null | undefined) => LabelsFor(TRIGGER_LABELS, type);

function parseTriggerMeta(meta: string | null | undefined): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(meta || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Returns a copy of a trigger with its secrets masked as TRIGGER_LABELS says: the URL shows its origin only. */
export function MaskTriggerSecrets(trigger: TriggerRecord): TriggerRecord {
  const meta = MaskStoredSecrets(parseTriggerMeta(trigger.trigger_meta), triggerLabels(trigger.trigger_type));
  return { ...trigger, trigger_meta: JSON.stringify(meta) };
}

/** MaskTriggerSecrets for each trigger of an alert config. */
export function MaskAlertConfigTriggerSecrets<T extends { triggers: TriggerRecord[] }>(config: T): T {
  return { ...config, triggers: config.triggers.map(MaskTriggerSecrets) };
}

export const CreateUpdateTrigger = async (alert: TriggerInput): Promise<number | number[]> => {
  let alertData = { ...alert };
  const stored = alertData.id ? await db.getTriggerByID(alertData.id) : undefined;
  const labels = triggerLabels(alertData.trigger_type);
  const alertMetaJSON = RestoreStoredSecrets(
    JSON.parse(alertData.trigger_meta),
    parseTriggerMeta(stored?.trigger_meta),
    labels,
    stored ? triggerLabels(stored.trigger_type) : labels,
  ) as Record<string, unknown>;
  alertData.trigger_meta = JSON.stringify(alertMetaJSON);
  if (alertData.trigger_type === "email") {
    let emailsArray: string[] = (alertMetaJSON.to as string).split(",").map((email: string) => email.trim());
    for (let i = 0; i < emailsArray.length; i++) {
      if (!ValidateEmail(emailsArray[i])) {
        throw new Error(`Invalid email: ${emailsArray[i]}`);
      }
    }
  }

  if (alertData.id) {
    return await db.updateTrigger(alertData as TriggerRecord);
  } else {
    return await db.createNewTrigger(alertData);
  }
};

export const GetAllTriggers = async (data: TriggerFilter): Promise<TriggerRecord[]> => {
  return await db.getTriggers(data);
};

export const GetTriggerByID = async (id: number): Promise<TriggerRecord | undefined> => {
  return await db.getTriggerByID(id);
};

export const UpdateTriggerData = async (data: {
  id: number;
  down_trigger?: string | null;
  degraded_trigger?: string | null;
}): Promise<number> => {
  return await db.updateMonitorTrigger(
    data as { id: number; down_trigger: string | null; degraded_trigger: string | null },
  );
};

export const DeleteTrigger = async (id: number): Promise<number> => {
  return await db.deleteTrigger(id);
};

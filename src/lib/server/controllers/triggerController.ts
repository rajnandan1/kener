import db from "../db/db.js";
import type { TriggerRecordInsert, TriggerFilter, TriggerRecord } from "../types/db.js";
import { ValidateEmail } from "../tool.js";

interface TriggerInput extends TriggerRecordInsert {
  id?: number;
  trigger_meta: string;
}

export const CreateUpdateTrigger = async (alert: TriggerInput): Promise<number | number[]> => {
  let alertData = { ...alert };
  let alertMetaJSON = JSON.parse(alertData.trigger_meta);
  if (alertData.trigger_type === "email") {
    let emailsArray: string[] = alertMetaJSON.to.split(",").map((email: string) => email.trim());
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

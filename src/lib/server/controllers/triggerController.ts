import db from "../db/db.js";
import type { TriggerRecordInsert, TriggerFilter, TriggerRecord } from "../types/db.js";
import { MASKED_SECRET, MatchStoredHeaders, ValidateEmail } from "../tool.js";

interface TriggerInput extends TriggerRecordInsert {
  id?: number;
  trigger_meta: string;
}

type TriggerHeader = { key?: unknown; value?: unknown } | null | undefined;

function parseTriggerMeta(meta: string | null | undefined): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(meta || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// Slack and Discord webhooks carry their token in the URL path; the origin shows where alerts go.
function maskTriggerUrl(url: string): string {
  try {
    return `${new URL(url).origin}/${MASKED_SECRET}`;
  } catch {
    return MASKED_SECRET;
  }
}

/** Returns a copy of a trigger with its URL path and each non-empty header value masked. */
export function MaskTriggerSecrets(trigger: TriggerRecord): TriggerRecord {
  const meta = parseTriggerMeta(trigger.trigger_meta);
  if (typeof meta.url === "string" && meta.url) meta.url = maskTriggerUrl(meta.url);
  if (Array.isArray(meta.headers)) {
    meta.headers = meta.headers.map((header: TriggerHeader) =>
      typeof header?.value === "string" && header.value ? { ...header, value: MASKED_SECRET } : header,
    );
  }
  return { ...trigger, trigger_meta: JSON.stringify(meta) };
}

/** MaskTriggerSecrets for each trigger of an alert config. */
export function MaskAlertConfigTriggerSecrets<T extends { triggers: TriggerRecord[] }>(config: T): T {
  return { ...config, triggers: config.triggers.map(MaskTriggerSecrets) };
}

function restoreTriggerSecrets(
  meta: Record<string, unknown>,
  stored: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...meta };
  if (typeof stored.url === "string" && stored.url && result.url === maskTriggerUrl(stored.url)) {
    result.url = stored.url;
  }
  if (Array.isArray(result.headers)) {
    const storedHeaders = (Array.isArray(stored.headers) ? stored.headers : []) as TriggerHeader[];
    const matches = MatchStoredHeaders(result.headers, storedHeaders);
    result.headers = result.headers.map((header: TriggerHeader, i) => {
      if (header?.value !== MASKED_SECRET) return header;
      const match = matches[i];
      return { ...header, value: typeof match?.value === "string" ? match.value : "" };
    });
  }
  return result;
}

export const CreateUpdateTrigger = async (alert: TriggerInput): Promise<number | number[]> => {
  let alertData = { ...alert };
  const stored = alertData.id ? await db.getTriggerByID(alertData.id) : undefined;
  const alertMetaJSON = restoreTriggerSecrets(
    JSON.parse(alertData.trigger_meta),
    parseTriggerMeta(stored?.trigger_meta),
  );
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

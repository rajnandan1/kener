import db from "../db/db.js";
import type {
  SubscriptionConfigParsed,
  SubscriptionEventsEnabled,
  SubscriptionMethodsEnabled,
  SubscriptionMethodTriggers,
  TriggerRecord,
} from "../types/db.js";

// Re-export types for convenience
export type {
  SubscriptionConfigParsed,
  SubscriptionEventsEnabled,
  SubscriptionMethodsEnabled,
  SubscriptionMethodTriggers,
};

/**
 * Get the subscription configuration with parsed JSON fields
 */
export async function GetSubscriptionConfig(): Promise<SubscriptionConfigParsed | undefined> {
  return await db.getSubscriptionConfigParsed();
}

/**
 * Update the events that users can subscribe to
 */
export async function UpdateSubscriptionEventsEnabled(
  events: SubscriptionEventsEnabled,
): Promise<SubscriptionConfigParsed> {
  const config = await db.ensureSubscriptionConfig();
  await db.updateSubscriptionConfig(config.id, {
    events_enabled: JSON.stringify(events),
  });
  const updated = await db.getSubscriptionConfigParsed();
  if (!updated) {
    throw new Error("Failed to update subscription config");
  }
  return updated;
}

/**
 * Update the methods that users can use to subscribe
 */
export async function UpdateSubscriptionMethodsEnabled(
  methods: SubscriptionMethodsEnabled,
): Promise<SubscriptionConfigParsed> {
  const config = await db.ensureSubscriptionConfig();
  await db.updateSubscriptionConfig(config.id, {
    methods_enabled: JSON.stringify(methods),
  });
  const updated = await db.getSubscriptionConfigParsed();
  if (!updated) {
    throw new Error("Failed to update subscription config");
  }
  return updated;
}

/**
 * Update the trigger mappings for each method
 */
export async function UpdateSubscriptionMethodTriggers(
  triggers: SubscriptionMethodTriggers,
): Promise<SubscriptionConfigParsed> {
  const config = await db.ensureSubscriptionConfig();
  await db.updateSubscriptionConfig(config.id, {
    method_triggers: JSON.stringify(triggers),
  });
  const updated = await db.getSubscriptionConfigParsed();
  if (!updated) {
    throw new Error("Failed to update subscription config");
  }
  return updated;
}

/**
 * Update the entire subscription configuration at once
 */
export async function UpdateSubscriptionConfigFull(data: {
  events_enabled: SubscriptionEventsEnabled;
  methods_enabled: SubscriptionMethodsEnabled;
  method_triggers: SubscriptionMethodTriggers;
}): Promise<SubscriptionConfigParsed> {
  const config = await db.ensureSubscriptionConfig();
  await db.updateSubscriptionConfig(config.id, {
    events_enabled: JSON.stringify(data.events_enabled),
    methods_enabled: JSON.stringify(data.methods_enabled),
    method_triggers: JSON.stringify(data.method_triggers),
  });
  const updated = await db.getSubscriptionConfigParsed();
  if (!updated) {
    throw new Error("Failed to update subscription config");
  }
  return updated;
}

/**
 * Get triggers for enabled methods with their full records
 */
export async function GetEnabledMethodTriggersWithDetails(): Promise<{
  email: TriggerRecord | null;
  webhook: TriggerRecord | null;
  slack: TriggerRecord | null;
  discord: TriggerRecord | null;
}> {
  const config = await db.getSubscriptionConfigParsed();
  if (!config) {
    return { email: null, webhook: null, slack: null, discord: null };
  }

  const result: {
    email: TriggerRecord | null;
    webhook: TriggerRecord | null;
    slack: TriggerRecord | null;
    discord: TriggerRecord | null;
  } = {
    email: null,
    webhook: null,
    slack: null,
    discord: null,
  };

  const methods = ["email", "webhook", "slack", "discord"] as const;

  for (const method of methods) {
    const triggerId = config.method_triggers[method];
    if (triggerId && config.methods_enabled[method]) {
      const trigger = await db.getTriggerByID(triggerId);
      if (trigger) {
        result[method] = trigger;
      }
    }
  }

  return result;
}

/**
 * Validate that method triggers exist and are of the correct type
 */
export async function ValidateMethodTriggers(
  triggers: SubscriptionMethodTriggers,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  const methodTypeMap: Record<string, string> = {
    email: "email",
    webhook: "webhook",
    slack: "slack",
    discord: "discord",
  };

  for (const [method, triggerId] of Object.entries(triggers)) {
    if (triggerId !== null) {
      const trigger = await db.getTriggerByID(triggerId);
      if (!trigger) {
        errors.push(`Trigger with ID ${triggerId} not found for ${method}`);
      } else if (trigger.trigger_type !== methodTypeMap[method]) {
        errors.push(
          `Trigger ${triggerId} is of type ${trigger.trigger_type}, but ${method} requires type ${methodTypeMap[method]}`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

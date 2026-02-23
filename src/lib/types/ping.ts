// Shared ping monitor types: safe to import from both server and client.

export const PING_HOST_TYPES = ["IP4", "IP6", "DOMAIN"] as const;

export type PingHostType = (typeof PING_HOST_TYPES)[number];

export interface PingHost {
  type: PingHostType;
  host: string;
  timeout: number;
  count: number;
}

export interface PingMonitorTypeData {
  hosts: PingHost[];
  pingEval?: string;
}

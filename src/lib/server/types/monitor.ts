// Server-only monitor types (internal representation with all fields).

export interface MonitoringResult {
  status: string;
  latency: number;
  type: string;
  error_message?: string;
}

export interface MonitoringResultTS {
  [timestamp: number]: MonitoringResult;
}

export interface NoneMonitorTypeData {}
export interface ApiMonitorTypeData {
  url: string;
  body?: string;
  headers?: Array<{ key: string; value: string }>;
  method: string;
  timeout?: number;
  eval?: string;
  allowSelfSignedCert?: boolean;
}

export interface DnsMonitorTypeData {
  nameServer: string;
  host: string;
  lookupRecord: string;
  matchType: "ALL" | "ANY";
  values: string[];
}

export interface PingHost {
  type: string;
  host: string;
  timeout: number;
  count: number;
}

export interface PingMonitorTypeData {
  hosts: PingHost[];
  pingEval?: string;
}

export interface TcpHost {
  type: string;
  host: string;
  port: number;
  timeout: number;
}

export interface TcpMonitorTypeData {
  hosts: TcpHost[];
  tcpEval?: string;
}

export interface SslMonitorTypeData {
  host: string;
  port?: string;
  degradedRemainingHours: number;
  downRemainingHours: number;
}

export interface SqlMonitorTypeData {
  dbType: string;
  connectionString: string;
  query: string;
  timeout?: number;
}

export interface HeartbeatMonitorTypeData {
  downRemainingMinutes: number;
  degradedRemainingMinutes: number;
  secretString: string;
}

export interface GroupMonitorMember {
  tag: string;
  /** Weight for this monitor. All weights in a group must sum to 1. */
  weight: number;
}

export interface GroupMonitorTypeData extends Record<string, unknown> {
  monitors: GroupMonitorMember[];
  executionDelay: number;
  latencyCalculation: "AVG" | "MAX" | "MIN";
}

export interface GamedigMonitorTypeData {
  gameId: string;
  host: string;
  port: number;
  timeout?: number;
  eval?: string;
  guessPort?: boolean;
  requestRules?: boolean;
}

export type MonitorTypeData =
  | ApiMonitorTypeData
  | DnsMonitorTypeData
  | PingMonitorTypeData
  | TcpMonitorTypeData
  | SslMonitorTypeData
  | SqlMonitorTypeData
  | HeartbeatMonitorTypeData
  | GroupMonitorTypeData
  | GamedigMonitorTypeData;

export interface Monitor<T = MonitorTypeData> {
  tag: string;
  type_data: T;
  cron?: string;
}

export type NoneMonitor = Monitor<NoneMonitorTypeData>;
export type ApiMonitor = Monitor<ApiMonitorTypeData>;
export type DnsMonitor = Monitor<DnsMonitorTypeData>;
export type PingMonitor = Monitor<PingMonitorTypeData>;
export type TcpMonitor = Monitor<TcpMonitorTypeData>;
export type SslMonitor = Monitor<SslMonitorTypeData>;
export type SqlMonitor = Monitor<SqlMonitorTypeData>;
export type HeartbeatMonitor = Monitor<HeartbeatMonitorTypeData>;
export type GroupMonitor = Monitor<GroupMonitorTypeData>;
export type GamedigMonitor = Monitor<GamedigMonitorTypeData>;

export interface EvalResponse {
  status?: string;
  latency?: number;
  type?: string;
}

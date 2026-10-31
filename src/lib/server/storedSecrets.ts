import { isDeepStrictEqual } from "node:util";
import type { MonitorType } from "$lib/types/monitor.js";
import type { DockerMonitorTypeData } from "$lib/types/docker.js";
import type { OidcSettings } from "$lib/types/site.js";
import type { TriggerMeta } from "./types/db.js";
import type {
  ApiMonitorTypeData,
  DnsMonitorTypeData,
  GamedigMonitorTypeData,
  GroupMonitorTypeData,
  GrpcMonitorTypeData,
  HeartbeatMonitorTypeData,
  NoneMonitorTypeData,
  PingMonitorTypeData,
  PrometheusMonitorTypeData,
  SqlMonitorTypeData,
  SslMonitorTypeData,
  TcpMonitorTypeData,
} from "./types/monitor.js";

export const MASKED_SECRET = "********";

/**
 * `secret`: every read masks it. `destination`: where Kener sends the record's secrets; a masked secret is restored
 * only while every destination stays as saved. `plain`: neither. A field with no label counts as both secret and
 * destination.
 */
export type Label = "secret" | "destination" | "plain";
export type FieldLabel = Label | readonly Label[];
export interface Labels {
  readonly [field: string]: FieldLabel | Labels;
}
export type RecordLabels = Labels | "plain" | undefined;
type LabelsOf<T> = { readonly [K in keyof Required<T>]: FieldLabel };

interface TypeDataByMonitorType {
  API: ApiMonitorTypeData;
  PING: PingMonitorTypeData;
  TCP: TcpMonitorTypeData;
  DNS: DnsMonitorTypeData;
  NONE: NoneMonitorTypeData;
  GROUP: GroupMonitorTypeData;
  SSL: SslMonitorTypeData;
  SQL: SqlMonitorTypeData;
  HEARTBEAT: HeartbeatMonitorTypeData;
  GAMEDIG: GamedigMonitorTypeData;
  GRPC: GrpcMonitorTypeData;
  PROMETHEUS: PrometheusMonitorTypeData;
  DOCKER: DockerMonitorTypeData;
}

/** A URL that can carry a token in its user info, path, or query. Reads show its origin only. */
const URL_WITH_SECRET = ["destination", "secret"] as const;

export const MONITOR_LABELS = {
  API: {
    url: URL_WITH_SECRET,
    proxy: URL_WITH_SECRET,
    headers: "secret",
    body: "secret",
    method: "plain",
    timeout: "plain",
    eval: "plain",
    allowSelfSignedCert: "plain",
    follow_redirects: "plain",
    max_redirects: "plain",
  },
  PING: { hosts: "destination", pingEval: "plain" },
  TCP: { hosts: "destination", tcpEval: "plain" },
  DNS: {
    nameServer: "destination",
    transport: "destination",
    tlsPort: "destination",
    host: "plain",
    lookupRecord: "plain",
    matchType: "plain",
    values: "plain",
    tlsServername: "plain",
    allowSelfSignedCert: "plain",
  },
  NONE: { overrideWithLastKnownStatus: "plain" },
  GROUP: { monitors: "plain", executionDelay: "plain", latencyCalculation: "plain" },
  SSL: {
    host: "destination",
    port: "destination",
    degradedRemainingHours: "plain",
    downRemainingHours: "plain",
    timeout: "plain",
    tlsServername: "plain",
    allowSelfSignedCert: "plain",
  },
  SQL: { connectionString: "secret", dbType: "plain", query: "plain", timeout: "plain" },
  HEARTBEAT: { secretString: "secret", downRemainingMinutes: "plain", degradedRemainingMinutes: "plain" },
  GAMEDIG: {
    host: "destination",
    port: "destination",
    gameId: "plain",
    timeout: "plain",
    eval: "plain",
    guessPort: "plain",
    requestRules: "plain",
  },
  GRPC: {
    host: "destination",
    port: "destination",
    service: "plain",
    tls: "plain",
    insecure: "plain",
    timeout: "plain",
  },
  PROMETHEUS: {
    url: URL_WITH_SECRET,
    proxy: URL_WITH_SECRET,
    headers: "secret",
    query: "plain",
    down: "plain",
    degraded: "plain",
    noDataStatus: "plain",
    errorStatus: "plain",
    timeout: "plain",
    allowSelfSignedCert: "plain",
  },
  DOCKER: {
    daemon: "destination",
    connectionType: "destination",
    tlsKey: "secret",
    tlsCa: "plain",
    tlsCert: "plain",
    checkType: "plain",
    containerName: "plain",
    timeout: "plain",
  },
} as const satisfies { readonly [T in MonitorType]: LabelsOf<TypeDataByMonitorType[T]> };

/** Every trigger type saves the same trigger_meta fields, so they share one set of labels. */
const TRIGGER_META_LABELS = {
  url: URL_WITH_SECRET,
  headers: "secret",
  to: "destination",
  from: "plain",
  email_subject: "plain",
  email_body: "plain",
  webhook_body: "plain",
  slack_body: "plain",
  discord_body: "plain",
} as const satisfies LabelsOf<TriggerMeta>;

export const TRIGGER_LABELS = {
  webhook: TRIGGER_META_LABELS,
  discord: TRIGGER_META_LABELS,
  slack: TRIGGER_META_LABELS,
  email: TRIGGER_META_LABELS,
} as const;

/** A captcha secret goes only to its provider's fixed verify URL, so a captcha key has no destination field. */
const CAPTCHA_LABELS = { isEnabled: "plain", requirements: { "Site Key": "plain", "Secret Key": "secret" } } as const;

/** "plain" covers a whole site-data value. Analytics IDs are plain: the status page sends them to every visitor. */
export const SITE_DATA_LABELS = {
  oidcSettings: {
    issuer_url: "destination",
    client_secret: "secret",
    enabled: "plain",
    provider_name: "plain",
    client_id: "plain",
    scopes: "plain",
    groups_claim: "plain",
    allow_local_login: "plain",
    auto_create_users: "plain",
    default_role_id: "plain",
  } satisfies LabelsOf<OidcSettings>,
  "captcha.hcaptcha": CAPTCHA_LABELS,
  "captcha.recaptcha": CAPTCHA_LABELS,
  "captcha.turnstile": CAPTCHA_LABELS,
  title: "plain",
  siteName: "plain",
  siteURL: "plain",
  homeDataMaxDays: "plain",
  home: "plain",
  favicon: "plain",
  logo: "plain",
  metaTags: "plain",
  nav: "plain",
  hero: "plain",
  footerHTML: "plain",
  kenerTheme: "plain",
  customCSS: "plain",
  i18n: "plain",
  pattern: "plain",
  analytics: "plain",
  theme: "plain",
  themeToggle: "plain",
  tzToggle: "plain",
  showSiteStatus: "plain",
  barStyle: "plain",
  barRoundness: "plain",
  summaryStyle: "plain",
  colors: "plain",
  colorsDark: "plain",
  font: "plain",
  monitorSort: "plain",
  categories: "plain",
  homeIncidentCount: "plain",
  homeIncidentStartTimeWithin: "plain",
  incidentGroupView: "plain",
  "analytics.googleTagManager": "plain",
  "analytics.plausible": "plain",
  "analytics.mixpanel": "plain",
  "analytics.amplitude": "plain",
  "analytics.clarity": "plain",
  "analytics.umami": "plain",
  "analytics.posthog": "plain",
  "analytics.openpanel": "plain",
  subscriptionsSettings: "plain",
  subMenuOptions: "plain",
  announcement: "plain",
  dataRetentionPolicy: "plain",
  eventDisplaySettings: "plain",
  socialPreviewImage: "plain",
  globalPageVisibilitySettings: "plain",
  pageOrderingSettings: "plain",
  dateAndTimeFormat: "plain",
  metaSiteTitle: "plain",
  metaSiteDescription: "plain",
  sitemap: "plain",
  globalMaintenanceNotificationSettings: "plain",
} as const satisfies { readonly [key: string]: Labels | "plain" };

/** The labels for one monitor type, trigger type, or site-data key. Undefined for a name the inventory lacks. */
export function LabelsFor(inventory: { readonly [name: string]: Labels | "plain" }, name: unknown): RecordLabels {
  return typeof name === "string" && Object.hasOwn(inventory, name) ? inventory[name] : undefined;
}

export class StoredSecretError extends Error {
  constructor(readonly fields: string[]) {
    super(
      `Send these values again: ${fields.join(", ")}. A masked value is kept only while its destination stays as saved.`,
    );
    this.name = "StoredSecretError";
  }
}

type Data = Record<string, unknown>;
type Hide = (secret: string) => string;
type IsMask = (value: string) => boolean;
interface Restored {
  kept: string[];
  lost: string[];
}

const UNLABELED: FieldLabel = "secret";
const hideAll: Hide = () => MASKED_SECRET;
const isMaskedSecret: IsMask = (value) => value === MASKED_SECRET;
const isData = (value: unknown): value is Data => !!value && typeof value === "object" && !Array.isArray(value);
const isHeader = (value: unknown): value is Data => isData(value) && "key" in value;
const isLabels = (label: FieldLabel | Labels | undefined): label is Labels => isData(label);
const labelOf = (labels: Labels | undefined, field: string) =>
  labels && Object.hasOwn(labels, field) ? labels[field] : undefined;
const isBlank = (value: unknown) => value === undefined || value === null || value === "";

function has(label: FieldLabel | Labels, want: Label): boolean {
  if (isLabels(label)) return false;
  return typeof label === "string" ? label === want : label.includes(want);
}

function maskAfterOrigin(url: string): string {
  try {
    const { origin } = new URL(url);
    return origin === "null" ? MASKED_SECRET : `${origin}/${MASKED_SECRET}`;
  } catch {
    return MASKED_SECRET;
  }
}

function maskValue(value: unknown, label: FieldLabel | Labels, hide: Hide): unknown {
  if (isLabels(label)) return isData(value) ? maskData(value, label, hide) : value;
  if (!has(label, "secret") || isBlank(value) || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((item) =>
      isHeader(item) ? { ...item, value: maskValue(item.value, label, hide) } : maskValue(item, label, hide),
    );
  }
  if (typeof value !== "string") return MASKED_SECRET;
  return has(label, "destination") ? maskAfterOrigin(value) : hide(value);
}

function maskData(value: Data, labels: Labels | undefined, hide: Hide): Data {
  return Object.fromEntries(
    Object.entries(value).map(([field, v]) => [field, maskValue(v, labelOf(labels, field) ?? UNLABELED, hide)]),
  );
}

/** Returns a copy of a stored record with each secret masked, for any response that leaves the server. */
export function MaskStoredSecrets(value: unknown, labels: RecordLabels, hide: Hide = hideAll): unknown {
  if (labels === "plain") return value;
  return isData(value) ? maskData(value, labels, hide) : maskValue(value, UNLABELED, hide);
}

/**
 * Pairs sent headers with stored headers one to one, in order: exact names first, then names that differ only in case.
 * `result[i]` is the stored header for `sent[i]`, or undefined. No stored header is paired twice.
 */
function matchStoredHeaders(sent: unknown[], stored: unknown[]): (Data | undefined)[] {
  const name = (h: unknown) => (isData(h) && typeof h.key === "string" ? h.key : undefined);
  const matches: (Data | undefined)[] = [];
  const used = new Set<number>();
  for (const fold of [(s: string) => s, (s: string) => s.toLowerCase()]) {
    sent.forEach((header, i) => {
      const key = name(header);
      if (matches[i] || key === undefined) return;
      const j = stored.findIndex((h, k) => !used.has(k) && name(h) !== undefined && fold(name(h)!) === fold(key));
      if (j === -1) return;
      used.add(j);
      matches[i] = stored[j] as Data;
    });
  }
  return matches;
}

function restoreList(sent: unknown[], stored: unknown, label: FieldLabel, path: string, isMask: IsMask, r: Restored) {
  const storedList = Array.isArray(stored) ? stored : [];
  const matches = matchStoredHeaders(sent, storedList);
  return sent.map((item, i) => {
    if (!isHeader(item)) return restoreValue(item, storedList[i], label, `${path}[${i}]`, isMask, r);
    if (typeof item.value !== "string" || !isMask(item.value)) return item;
    const value = matches[i]?.value;
    if (typeof value === "string" && value) r.kept.push(`${path}.${String(item.key)}`);
    return { ...item, value: typeof value === "string" ? value : "" };
  });
}

function restoreValue(
  sent: unknown,
  stored: unknown,
  label: FieldLabel | Labels,
  path: string,
  isMask: IsMask,
  r: Restored,
): unknown {
  if (isLabels(label)) return isData(sent) ? restoreData(sent, stored, label, `${path}.`, isMask, r) : sent;
  if (!has(label, "secret")) return sent;
  if (Array.isArray(sent)) return restoreList(sent, stored, label, path, isMask, r);
  if (typeof sent !== "string") return sent;
  if (has(label, "destination")) {
    if (maskAfterOrigin(sent) !== sent) return sent;
    if (!isBlank(stored) && sent === maskValue(stored, label, hideAll)) {
      r.kept.push(path);
      return stored;
    }
    r.lost.push(path);
    return sent;
  }
  if (!isMask(sent)) return sent;
  if (!isBlank(stored)) r.kept.push(path);
  return stored ?? "";
}

function restoreData(
  sent: Data,
  stored: unknown,
  labels: Labels | undefined,
  prefix: string,
  isMask: IsMask,
  r: Restored,
) {
  const storedData = isData(stored) ? stored : {};
  return Object.fromEntries(
    Object.entries(sent).map(([field, value]) => [
      field,
      restoreValue(value, storedData[field], labelOf(labels, field) ?? UNLABELED, prefix + field, isMask, r),
    ]),
  );
}

function destinations(value: unknown, labels: Labels | undefined): unknown[] {
  if (!isData(value)) return [value ?? null];
  const fields = [...new Set([...Object.keys(labels ?? {}), ...Object.keys(value)])].sort();
  return fields.flatMap((field) => {
    const label = labelOf(labels, field);
    if (label !== undefined && isLabels(label)) return destinations(value[field], label);
    return label === undefined || has(label, "destination") ? [[field, value[field] ?? null]] : [];
  });
}

/**
 * Puts the stored value back for each masked secret in `sent`. A mask with no stored secret saves an empty string,
 * so a mask copied from another record is never stored. Throws StoredSecretError when a restored secret would go
 * to a destination it was not saved with, or when a masked URL does not match the stored one.
 */
export function RestoreStoredSecrets(
  sent: unknown,
  stored: unknown,
  labels: RecordLabels,
  storedLabels: RecordLabels = labels,
  isMask: IsMask = isMaskedSecret,
): unknown {
  if (labels === "plain" || !isData(sent)) return sent;
  const r: Restored = { kept: [], lost: [] };
  const result = restoreData(sent, stored, labels, "", isMask, r);
  const plainStored = storedLabels === "plain" ? undefined : storedLabels;
  const moved =
    labels !== storedLabels || !isDeepStrictEqual(destinations(result, labels), destinations(stored, plainStored));
  const blocked = [...r.lost, ...(moved ? r.kept : [])];
  if (blocked.length) throw new StoredSecretError(blocked);
  return result;
}

/** Fills each stored secret that `value` leaves out with the mask, so a save that omits a secret keeps it. */
export function MaskOmittedSecrets(value: Data, stored: unknown, labels: Labels): Data {
  const result = { ...value };
  const storedData = isData(stored) ? stored : {};
  for (const [field, label] of Object.entries(labels)) {
    const storedValue = storedData[field];
    if (isLabels(label)) {
      if (isData(storedValue)) {
        result[field] = MaskOmittedSecrets(isData(result[field]) ? result[field] : {}, storedValue, label);
      }
    } else if (has(label, "secret") && result[field] === undefined && !isBlank(storedValue)) {
      result[field] = maskValue(storedValue, label, hideAll);
    }
  }
  return result;
}

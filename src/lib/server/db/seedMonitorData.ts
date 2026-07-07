const apiTypeData = (url: string) => ({
  url,
  method: "GET",
  headers: [],
  body: "",
  timeout: 10000,
  eval: "(async function (statusCode, responseTime, responseRaw, modules) { \n\tlet statusCodeShort = Math.floor(statusCode/100);\n    if(statusCode == 429 || (statusCodeShort >=2 && statusCodeShort <= 3)) {\n        return {\n\t\t\tstatus: 'UP',\n\t\t\tlatency: responseTime,\n        }\n    } \n\treturn {\n\t\tstatus: 'DOWN',\n\t\tlatency: responseTime,\n\t}\n})",
  allowSelfSignedCert: false,
});

const defaultMonitorSettings = {
  uptime_formula_numerator: "up + maintenance",
  uptime_formula_denominator: "up + maintenance + down + degraded",
};

const baseMonitor = {
  cron: "* * * * *",
  default_status: "UP",
  status: "ACTIVE",
  category_name: "Home",
  down_trigger: null,
  degraded_trigger: null,
  day_degraded_minimum_count: 1,
  day_down_minimum_count: 1,
  include_degraded_in_downtime: "NO",
  is_hidden: "NO",
  monitor_settings_json: JSON.stringify(defaultMonitorSettings),
};

let seedMonitorData = [
  {
    ...baseMonitor,
    tag: "earth",
    name: "Earth - Planet 3",
    description: "Earth is the 3rd planet in our solar system and it is the most majestic one.",
    image: "https://kener.ing/earth.png",
    monitor_type: "NONE",
    type_data: "",
  },
  {
    ...baseMonitor,
    tag: "kener",
    name: "Kener.ing",
    description: "Kener is a sleek and lightweight status page system built with SvelteKit and NodeJS.",
    image: "https://kener.ing/logo96.png",
    monitor_type: "API",
    type_data: JSON.stringify(apiTypeData("https://kener.ing")),
  },
  {
    ...baseMonitor,
    tag: "api-docs",
    name: "API Documentation",
    description: "API documentation portal for developers.",
    image: "",
    monitor_type: "NONE",
    type_data: "",
  },
  {
    ...baseMonitor,
    tag: "blog",
    name: "Blog Platform",
    description: "Blog and content publishing platform.",
    image: "",
    monitor_type: "NONE",
    type_data: "",
  },
  {
    ...baseMonitor,
    tag: "cdn",
    name: "CDN Edge Network",
    description: "Global content delivery network for static assets.",
    image: "",
    monitor_type: "NONE",
    type_data: "",
  },
  {
    ...baseMonitor,
    tag: "mail",
    name: "Email Service",
    description: "Transactional email delivery service.",
    image: "",
    monitor_type: "NONE",
    type_data: "",
  },
  {
    ...baseMonitor,
    tag: "auth",
    name: "Authentication Service",
    description: "User authentication and authorization service.",
    image: "",
    monitor_type: "NONE",
    type_data: "",
  },
  {
    ...baseMonitor,
    tag: "payments",
    name: "Payment Gateway",
    description: "Payment processing and billing system.",
    image: "",
    monitor_type: "NONE",
    type_data: "",
  },
  {
    ...baseMonitor,
    tag: "search",
    name: "Search Engine",
    description: "Full-text search and indexing service.",
    image: "",
    monitor_type: "NONE",
    type_data: "",
  },
  {
    ...baseMonitor,
    tag: "storage",
    name: "Object Storage",
    description: "Scalable object storage for files and assets.",
    image: "",
    monitor_type: "NONE",
    type_data: "",
  },
];

// Generate 50 test monitors
const services = [
  "user-service", "order-service", "inventory-service", "notification-service",
  "analytics-service", "recommendation-engine", "search-indexer", "file-uploader",
  "image-processor", "video-transcoder", "email-renderer", "sms-gateway",
  "push-notifier", "rate-limiter", "feature-flags", "config-server",
  "service-discovery", "api-gateway", "load-balancer", "dns-resolver",
  "database-primary", "database-replica", "cache-cluster", "queue-broker",
  "stream-processor", "log-aggregator", "metrics-collector", "trace-collector",
  "backup-scheduler", "health-checker", "auto-scaler", "deploy-pipeline",
  "container-registry", "artifact-storage", "secret-manager", "cert-manager",
  "webhook-relay", "oauth-provider", "session-store", "audit-logger",
  "report-generator", "data-exporter", "data-importer", "cron-scheduler",
  "task-runner", "workflow-engine", "rule-engine", "ml-inference",
  "a-b-tester", "cdn-purge"
];

services.forEach((tag, i) => {
  seedMonitorData.push({
    ...baseMonitor,
    tag,
    name: tag.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    description: `Test monitor for ${tag}`,
    image: "",
    monitor_type: "NONE",
    type_data: "",
  });
});

export default seedMonitorData;

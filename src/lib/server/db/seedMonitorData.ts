const kenerAPITypeData = {
  url: "https://kener.ing",
  method: "GET",
  headers: [],
  body: "",
  timeout: 10000,
  eval: "(async function (statusCode, responseTime, responseRaw, modules) { \n\tlet statusCodeShort = Math.floor(statusCode/100);\n    if(statusCode == 429 || (statusCodeShort >=2 && statusCodeShort <= 3)) {\n        return {\n\t\t\tstatus: 'UP',\n\t\t\tlatency: responseTime,\n        }\n    } \n\treturn {\n\t\tstatus: 'DOWN',\n\t\tlatency: responseTime,\n\t}\n})",
  allowSelfSignedCert: false,
};

const defaultMonitorSettings = {
  uptime_formula_numerator: "up + maintenance",
  uptime_formula_denominator: "up + maintenance + down + degraded",
};

let seedMonitorData = [
  {
    tag: "earth",
    name: "Earth - Planet 3",
    description: "Earth is the 3rd planet in our solar system and it is the most majestic one. ",
    image: "https://kener.ing/earth.png",
    cron: "* * * * *",
    default_status: "UP",
    status: "ACTIVE",
    category_name: "Home",
    monitor_type: "NONE",
    down_trigger: null,
    degraded_trigger: null,
    type_data: "",
    day_degraded_minimum_count: 1,
    day_down_minimum_count: 1,
    include_degraded_in_downtime: "NO",
    is_hidden: "NO",
    monitor_settings_json: JSON.stringify(defaultMonitorSettings),
  },
  {
    tag: "kener",
    name: "Kener.ing",
    description:
      "Kener is a sleek and lightweight status page system built with SvelteKit and NodeJS. It’s not here to replace heavyweights like Datadog or Atlassian but rather to offer a simple, modern, and hassle-free way to set up a great-looking status page with minimal effort.",
    image: "https://kener.ing/logo96.png",
    cron: "* * * * *",
    default_status: "UP",
    status: "ACTIVE",
    category_name: "Home",
    monitor_type: "API",
    down_trigger: null,
    degraded_trigger: null,
    type_data: JSON.stringify(kenerAPITypeData),
    day_degraded_minimum_count: 1,
    day_down_minimum_count: 1,
    include_degraded_in_downtime: "NO",
    is_hidden: "NO",
    monitor_settings_json: JSON.stringify(defaultMonitorSettings),
  },
];

export default seedMonitorData;

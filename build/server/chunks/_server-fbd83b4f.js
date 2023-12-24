import { p as public_env } from './shared-server-58a5f352.js';
import fs from 'fs-extra';
import { P as ParseUptime, B as Badge } from './helpers-eac5677c.js';

const monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
async function GET({ params, setHeaders }) {
  const { path0Day, name } = monitors.find((monitor) => monitor.tag === params.tag);
  const dayData = JSON.parse(fs.readFileSync(path0Day, "utf8"));
  let ups = 0;
  let downs = 0;
  let degradeds = 0;
  for (const timestamp in dayData) {
    const obj = dayData[timestamp];
    if (obj.status == "UP") {
      ups++;
    } else if (obj.status == "DEGRADED") {
      degradeds++;
    } else if (obj.status == "DOWN") {
      downs++;
    }
  }
  let uptime = ParseUptime(ups + degradeds, ups + degradeds + downs) + "%";
  setHeaders({
    "Content-Type": "image/svg+xml"
  });
  return new Response(Badge(name, uptime, "0079FF"), {
    headers: {
      "Content-Type": "image/svg+xml"
    }
  });
}

export { GET };
//# sourceMappingURL=_server-fbd83b4f.js.map

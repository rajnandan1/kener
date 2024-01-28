import { p as public_env } from './shared-server-58a5f352.js';
import fs from 'fs-extra';
import { a as StatusColor } from './helpers-0acb6e43.js';
import { makeBadge } from 'badge-maker';

const monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
async function GET({ params, setHeaders, url }) {
  const { path0Day, name } = monitors.find((monitor) => monitor.tag === params.tag);
  const dayData = JSON.parse(fs.readFileSync(path0Day, "utf8"));
  const lastObj = dayData[Object.keys(dayData)[Object.keys(dayData).length - 1]];
  const query = url.searchParams;
  const labelColor = query.get("labelColor") || "#333";
  const color = query.get("color") || StatusColor[lastObj.status];
  const style = query.get("style") || "flat";
  const format = {
    label: name,
    message: lastObj.status,
    color,
    labelColor,
    style
  };
  const svg = makeBadge(format);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml"
    }
  });
}

export { GET };
//# sourceMappingURL=_server-baea02bf.js.map

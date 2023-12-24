import { p as public_env } from './shared-server-58a5f352.js';
import fs from 'fs-extra';
import { B as Badge, b as StatusColor } from './helpers-eac5677c.js';

const monitors = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
async function GET({ params, setHeaders }) {
  const { path0Day, name } = monitors.find((monitor) => monitor.tag === params.tag);
  const dayData = JSON.parse(fs.readFileSync(path0Day, "utf8"));
  const lastObj = dayData[Object.keys(dayData)[Object.keys(dayData).length - 1]];
  return new Response(Badge(name, lastObj.status, StatusColor[lastObj.status]), {
    headers: {
      "Content-Type": "image/svg+xml"
    }
  });
}

export { GET };
//# sourceMappingURL=_server-9b40268b.js.map

import { j as json } from './index-2b68e648.js';
import fs from 'fs-extra';

async function POST({ request }) {
  const payload = await request.json();
  return json({
    day0: JSON.parse(fs.readFileSync(payload.day0, "utf8"))
  });
}

export { POST };
//# sourceMappingURL=_server-de3c0213.js.map

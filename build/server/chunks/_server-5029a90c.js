import { j as json } from './index-2b68e648.js';
import { a as auth, s as store, b as GetMonitorStatusByTag } from './webhook-926b85d0.js';
import 'fs-extra';
import './shared-server-58a5f352.js';
import './helpers-0acb6e43.js';
import './tool-b4b3e524.js';
import './github-31d08953.js';
import 'axios';
import 'marked';
import 'randomstring';

async function POST({ request }) {
  const payload = await request.json();
  const authError = auth(request);
  if (authError !== null) {
    return json(
      { error: authError.message },
      {
        status: 401
      }
    );
  }
  let resp = store(payload);
  return json(resp, {
    status: resp.status
  });
}
async function GET({ request, url }) {
  const authError = auth(request);
  if (authError !== null) {
    return json(
      { error: authError.message },
      {
        status: 401
      }
    );
  }
  const query = url.searchParams;
  const tag = query.get("tag");
  if (!!!tag) {
    return json(
      { error: "tag missing" },
      {
        status: 400
      }
    );
  }
  return json(GetMonitorStatusByTag(tag), {
    status: 200
  });
}

export { GET, POST };
//# sourceMappingURL=_server-5029a90c.js.map

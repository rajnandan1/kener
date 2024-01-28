import { j as json } from './index-2b68e648.js';
import { a as auth, s as store, b as GetMonitorStatusByTag } from './webhook-b1440440.js';
import 'fs-extra';
import './shared-server-58a5f352.js';
import './helpers-0acb6e43.js';
import './tool-153dc604.js';
import './github-9db56498.js';
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
//# sourceMappingURL=_server-80e47ca2.js.map
